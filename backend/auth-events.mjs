import { isIP } from "node:net";
import { randomBytes, randomUUID } from "node:crypto";
import { hash, verifyPassword } from "./core.mjs";
import { setHistoryActor } from "./history-context.mjs";

const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
export const LOGIN_POLICY = Object.freeze({
  windowSeconds: 900,
  userFailures: 10,
  ipFailures: 50,
});
const actions = new Set([
  "auth.login",
  "auth.login_failed",
  "auth.login_blocked",
  "auth.login_rejected",
  "auth.logout",
  "auth.session_expired",
  "auth.session_invalidated",
  "auth.session_refreshed",
]);
export function normalizeIp(value) {
  if (typeof value !== "string") return null;
  let ip = value.trim().toLowerCase();
  if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  return isIP(ip) ? ip : null;
}
export function requestIp(req, trustLocalProxy = false) {
  const peer = normalizeIp(req.socket?.remoteAddress);
  const loopback = peer === "::1" || peer?.startsWith("127.");
  if (trustLocalProxy && loopback) {
    const forwarded = normalizeIp(req.headers?.["x-real-ip"]);
    if (forwarded) return forwarded;
  }
  return peer;
}
export function loginName(value) {
  const cleaned =
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
          .replace(/[\u0000-\u001f\u007f]/g, "")
      : "";
  return {
    display: [...cleaned].slice(0, 32).join("") || null,
    lookup: /^[a-z0-9_.-]{3,32}$/.test(cleaned) ? cleaned : null,
  };
}
const utc = (value) =>
  typeof value === "string"
    ? value.replace(" ", "T").replace(/Z$/, "") + "Z"
    : null;

// Only allowlisted fields enter audit payloads: never spread a request/user/session.
export async function authEvent(db, action, info = {}) {
  if (!actions.has(action)) throw new Error("Unsupported auth event.");
  const id = (value) =>
    value == null
      ? null
      : Number.isSafeInteger(value) && value > 0
        ? value
        : (() => {
            throw new Error("Invalid auth identity.");
          })();
  if (info.reason && !/^[a-z_]{1,64}$/.test(info.reason))
    throw new Error("Invalid auth reason.");
  const payload = {
    scope: "application",
    username: loginName(info.username).display,
    client_ip: normalizeIp(info.ip),
    reason: info.reason || null,
    attempt_id: /^[0-9a-f-]{36}$/.test(info.attemptId || "")
      ? info.attemptId
      : null,
    session_created_at_utc: utc(info.sessionCreatedAt),
    session_expires_at_utc: utc(info.sessionExpiresAt),
    window_seconds: info.windowSeconds ?? null,
    retry_after_seconds: info.retryAfter ?? null,
  };
  await rows(
    db,
    "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (?,?,?,?,JSON_SET(?, '$.occurred_at_utc', COALESCE(?, DATE_FORMAT(UTC_TIMESTAMP(3),'%Y-%m-%dT%H:%i:%s.%fZ'))))",
    [
      id(info.actorId),
      action,
      info.userId == null ? "auth" : "user",
      info.userId == null ? null : String(id(info.userId)),
      JSON.stringify(payload),
      utc(info.occurredAt),
    ],
  );
}

export function loginBuckets(name, ip) {
  return [
    {
      key: hash("auth-v2:ip:" + (normalizeIp(ip) || "unknown")),
      limit: LOGIN_POLICY.ipFailures,
    },
    ...(name.lookup
      ? [
          {
            key: hash("auth-v2:user:" + name.lookup),
            limit: LOGIN_POLICY.userFailures,
          },
        ]
      : []),
  ].sort((a, b) => a.key.localeCompare(b.key));
}
async function limits(db, buckets) {
  const result = [];
  for (const b of buckets) {
    await rows(
      db,
      "INSERT INTO login_limits(bucket,failures,window_start) VALUES (?,0,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE bucket=bucket",
      [b.key],
    );
    await rows(
      db,
      "UPDATE login_limits SET failures=0,window_start=UTC_TIMESTAMP(3) WHERE bucket=? AND window_start<=UTC_TIMESTAMP(3)-INTERVAL 15 MINUTE",
      [b.key],
    );
    const [row] = await rows(
      db,
      "SELECT failures,GREATEST(1,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(3),window_start+INTERVAL 15 MINUTE)) retry_after FROM login_limits WHERE bucket=? FOR UPDATE",
      [b.key],
    );
    result.push({
      ...b,
      failures: Number(row.failures),
      retryAfter: Number(row.retry_after),
    });
  }
  return result;
}
async function blockedOutcome(db, current, info) {
  const blocked = current.filter((b) => b.failures >= b.limit);
  if (!blocked.length) return null;
  const retryAfter = Math.max(...blocked.map((b) => b.retryAfter));
  await authEvent(db, "auth.login_blocked", {
    ...info,
    reason: "rate_limit",
    windowSeconds: 900,
    retryAfter,
  });
  return {
    status: 429,
    retryAfter,
    error: "تلاش‌های ورود زیاد است؛ پس از پایان محدودیت دوباره تلاش کنید.",
  };
}

// Hash verification is outside the global mutation lock. Both admission and
// final decisions recheck limits; final issuance also rechecks account state.
export async function attemptLogin({
  pool,
  run,
  credentials,
  ip,
  verify = verifyPassword,
}) {
  const name = loginName(credentials.username);
  const buckets = loginBuckets(name, ip);
  const info = { username: name.display, ip, attemptId: randomUUID() };
  const rejected = await run(async (db) =>
    blockedOutcome(db, await limits(db, buckets), info),
  );
  if (rejected) return rejected;
  const [candidate] = name.lookup
    ? await rows(
        pool,
        "SELECT id,username,password_hash,auth_version,active FROM users WHERE username=?",
        [name.lookup],
      )
    : [];
  const dummy = "scrypt$00000000000000000000000000000000$" + "00".repeat(64);
  let valid;
  try {
    valid = await verify(
      credentials.password,
      candidate?.password_hash || dummy,
    );
  } catch (error) {
    await run((db) =>
      authEvent(db, "auth.login_rejected", {
        ...info,
        reason: "verification_error",
      }),
    );
    throw error;
  }
  return run(async (db) => {
    const currentLimits = await limits(db, buckets);
    const stopped = await blockedOutcome(db, currentLimits, info);
    if (stopped) return stopped; // Return, not throw: denied-attempt log must commit.
    const [fresh] = name.lookup
      ? await rows(
          db,
          "SELECT id,username,password_hash,auth_version,active FROM users WHERE username=? FOR UPDATE",
          [name.lookup],
        )
      : [];
    const unchanged =
      candidate &&
      fresh &&
      candidate.id === fresh.id &&
      candidate.password_hash === fresh.password_hash &&
      candidate.auth_version === fresh.auth_version;
    if (!valid || !unchanged || !fresh.active) {
      for (const b of buckets)
        await rows(
          db,
          "UPDATE login_limits SET failures=failures+1 WHERE bucket=?",
          [b.key],
        );
      await authEvent(db, "auth.login_failed", {
        ...info,
        userId: fresh?.id ?? null,
        reason: !name.lookup
          ? "invalid_input"
          : valid && unchanged && !fresh.active
            ? "account_inactive"
            : valid && candidate && !unchanged
              ? "account_changed"
              : "bad_credentials",
      });
      return { status: 401, error: "نام کاربری یا رمز عبور درست نیست." };
    }
    await setHistoryActor(db, fresh.id);
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(32).toString("hex");
    await rows(
      db,
      "INSERT INTO sessions(token_hash,user_id,csrf_token,auth_version,expires_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3)+INTERVAL 8 HOUR)",
      [hash(token), fresh.id, csrf, fresh.auth_version],
    );
    const [session] = await rows(
      db,
      "SELECT created_at,expires_at FROM sessions WHERE token_hash=?",
      [hash(token)],
    );
    if (name.lookup)
      await rows(db, "DELETE FROM login_limits WHERE bucket=?", [
        hash("auth-v2:user:" + name.lookup),
      ]);
    // Successful logins do not erase failures attributed to this IP.
    await authEvent(db, "auth.login", {
      ...info,
      actorId: fresh.id,
      userId: fresh.id,
      reason: "credentials_verified",
      sessionCreatedAt: session.created_at,
      sessionExpiresAt: session.expires_at,
    });
    return { status: 200, token };
  });
}

const sessionColumns =
  "s.token_hash,s.user_id,s.created_at,s.expires_at,s.auth_version,(s.expires_at<=UTC_TIMESTAMP(3)) expired,u.active,u.auth_version current_auth_version";
async function deleteSessions(db, list, info) {
  let count = 0;
  for (const s of list) {
    const removed = await rows(db, "DELETE FROM sessions WHERE token_hash=?", [
      s.token_hash,
    ]);
    if (removed.affectedRows !== 1) continue;
    const expired = Number(s.expired) === 1;
    await authEvent(
      db,
      expired
        ? "auth.session_expired"
        : info.reason === "explicit_logout"
          ? "auth.logout"
          : "auth.session_invalidated",
      {
        actorId: expired ? null : info.actorId,
        userId: s.user_id,
        ip: info.ip,
        reason: expired ? "expired" : info.reason,
        occurredAt: expired ? s.expires_at : null,
        sessionCreatedAt: s.created_at,
        sessionExpiresAt: s.expires_at,
      },
    );
    count++;
  }
  return count;
}
export async function endUserSessions(
  db,
  { userId, excludeTokenHash, actorId, ip, reason },
) {
  if (!Number.isSafeInteger(userId) || userId <= 0)
    throw new Error("Invalid target user.");
  if (
    excludeTokenHash !== undefined &&
    !/^[0-9a-f]{64}$/.test(excludeTokenHash)
  )
    throw new Error("Invalid excluded session.");
  const list = await rows(
    db,
    `SELECT ${sessionColumns} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.user_id=?${excludeTokenHash === undefined ? "" : " AND s.token_hash<>?"} ORDER BY s.token_hash LIMIT 1001 FOR UPDATE`,
    excludeTokenHash === undefined ? [userId] : [userId, excludeTokenHash],
  );
  if (list.length > 1000)
    throw Object.assign(
      new Error(
        "تعداد نشست‌ها از حد عملیات بیشتر است؛ بررسی مدیریتی لازم است.",
      ),
      { status: 413 },
    );
  return deleteSessions(db, list, { actorId, ip, reason });
}
export async function logoutSession(db, session, ip) {
  const [current] = await rows(
    db,
    `SELECT ${sessionColumns} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? FOR UPDATE`,
    [session.token_hash],
  );
  if (!current) return 0;
  const valid =
    current.user_id === session.id &&
    current.active &&
    current.auth_version === current.current_auth_version;
  return deleteSessions(db, [current], {
    actorId: valid ? session.id : null,
    ip,
    reason: valid ? "explicit_logout" : "account_changed",
  });
}
export async function resolveSession({ pool, run, tokenHash, ip }) {
  const select =
    "SELECT u.*,s.token_hash,s.csrf_token,s.expires_at,s.created_at session_created_at,s.auth_version session_auth_version,x.name unit_name,(s.expires_at<=UTC_TIMESTAMP(3)) expired FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN units x ON x.id=u.unit_id WHERE s.token_hash=?";
  const valid = (s) =>
    s &&
    !Number(s.expired) &&
    s.active &&
    s.session_auth_version === s.auth_version;
  const [session] = await rows(pool, select, [tokenHash]);
  if (!session || valid(session)) return session || null;
  return run(async (db) => {
    const [fresh] = await rows(db, select + " FOR UPDATE", [tokenHash]);
    if (valid(fresh)) return fresh;
    if (fresh)
      await deleteSessions(
        db,
        [
          {
            token_hash: fresh.token_hash,
            user_id: fresh.id,
            created_at: fresh.session_created_at,
            expires_at: fresh.expires_at,
            expired: fresh.expired,
          },
        ],
        {
          actorId: null,
          ip,
          reason: fresh.active ? "account_changed" : "account_inactive",
        },
      );
    return null;
  });
}
export async function expireSessionBatch(db, onlyUserId = null) {
  if (
    onlyUserId !== null &&
    (!Number.isSafeInteger(onlyUserId) || onlyUserId <= 0)
  )
    throw new Error("Invalid expiry scope.");
  const list = await rows(
    db,
    `SELECT ${sessionColumns} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.expires_at<=UTC_TIMESTAMP(3)${onlyUserId === null ? "" : " AND s.user_id=?"} ORDER BY s.expires_at,s.token_hash LIMIT 200 FOR UPDATE`,
    onlyUserId === null ? [] : [onlyUserId],
  );
  return deleteSessions(db, list, { actorId: null, reason: "expired" });
}
