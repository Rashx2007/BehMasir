import { assertHistorySchema, setHistoryActor } from "./history-context.mjs";
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { pool, rows, transaction, audit } from "./db.mjs";
import { hash, fail, text, passwordHash, verifyPassword } from "./core.mjs";
import { snapshot, historyPage, mutate } from "./domain.mjs";
import { assertVehicleTypesSchema } from "./vehicle-types.mjs";
import { sessionCookieName } from "./session-config.mjs";
const ORIGIN = process.env.APP_ORIGIN;
if (!ORIGIN || !/^https:\/\//.test(ORIGIN))
  throw new Error("APP_ORIGIN باید مبدأ HTTPS واقعی باشد.");
const cookieName = sessionCookieName();
const sessionCookie = (token) =>
  `${cookieName}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800`;
const expiredCookie = `${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(JSON.stringify(body));
};
async function body(req) {
  if (!(req.headers["content-type"] || "").startsWith("application/json"))
    fail(415, "نوع داده باید JSON باشد.");
  let n = 0,
    data = "";
  for await (const chunk of req) {
    n += chunk.length;
    if (n > 65536) fail(413, "حجم درخواست زیاد است.");
    data += chunk;
  }
  try {
    const v = JSON.parse(data || "{}");
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail(422, "بدنه معتبر نیست.");
    return v;
  } catch (e) {
    if (e.status) throw e;
    fail(400, "ساختار JSON معتبر نیست.");
  }
}
function cookie(req) {
  const pairs = String(req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim());
  const raw = pairs
    .find((x) => x.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  return /^[0-9a-f]{64}$/.test(raw || "") ? raw : null;
}
async function session(req) {
  const t = cookie(req);
  if (!t) return null;
  const list = await rows(
    pool,
    "SELECT u.*,s.token_hash,s.csrf_token,s.expires_at,x.name unit_name FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN units x ON x.id=u.unit_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND s.auth_version=u.auth_version AND u.active=1",
    [hash(t)],
  );
  return list[0] || null;
}
function origin(req) {
  if (req.headers.origin !== ORIGIN) fail(403, "مبدأ درخواست مجاز نیست.");
}
function csrf(req, s) {
  origin(req);
  const a = Buffer.from(String(req.headers["x-csrf-token"] || "")),
    b = Buffer.from(s.csrf_token);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    fail(403, "توکن امنیتی معتبر نیست؛ صفحه را تازه کنید.");
}
let activeLogins = 0;
async function login(req, res, b) {
  origin(req);
  if (activeLogins >= 2) fail(429, "چند لحظه بعد دوباره تلاش کنید.");
  activeLogins++;
  try {
    const username = text(b.username, 32).toLowerCase(),
      ip = String(
        req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown",
      );
    const buckets = [hash("ip:" + ip), hash("user:" + username)];
    await transaction(async (db) => {
      for (const bucket of buckets) {
        await rows(
          db,
          "INSERT INTO login_limits(bucket,failures,window_start) VALUES (?,0,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE bucket=bucket",
          [bucket],
        );
        await rows(
          db,
          "UPDATE login_limits SET failures=0,window_start=UTC_TIMESTAMP(3) WHERE bucket=? AND window_start<UTC_TIMESTAMP(3)-INTERVAL 15 MINUTE",
          [bucket],
        );
        const r = (
          await rows(db, "SELECT failures FROM login_limits WHERE bucket=?", [
            bucket,
          ])
        )[0];
        if (r.failures >= 10)
          fail(429, "تلاش‌های ورود زیاد است؛ ۱۵ دقیقه بعد تلاش کنید.");
        await rows(
          db,
          "UPDATE login_limits SET failures=failures+1 WHERE bucket=?",
          [bucket],
        );
      }
    });
    const u = (
      await rows(pool, "SELECT * FROM users WHERE username=?", [username])
    )[0];
    const dummy = "scrypt$00000000000000000000000000000000$" + "00".repeat(64);
    const valid = await verifyPassword(b.password, u?.password_hash || dummy);
    if (!valid || !u?.active) fail(401, "نام کاربری یا رمز عبور درست نیست.");
    const token = randomBytes(32).toString("hex"),
      ct = randomBytes(32).toString("hex");
    await transaction(async (db) => {
      await rows(
        db,
        "INSERT INTO sessions(token_hash,user_id,csrf_token,auth_version,expires_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3)+INTERVAL 8 HOUR)",
        [hash(token), u.id, ct, u.auth_version],
      );
      await rows(db, "DELETE FROM login_limits WHERE bucket=?", [buckets[1]]);
      await audit(db, u, "auth.login", "user", u.id);
    });
    send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(token) });
  } finally {
    activeLogins--;
  }
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1"),
      path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    if (!url.pathname.startsWith("/api/")) fail(404, "مسیر پیدا نشد.");
    if (req.method === "GET" && path === "health") {
      await rows(pool, "SELECT 1");
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "login")
      return await login(req, res, await body(req));
    const s = await session(req);
    if (!s) fail(401, "دوباره وارد حساب شوید.");
    if (req.method === "GET" && path === "state") {
      const rev = (
        await rows(pool, "SELECT revision FROM app_meta WHERE id=1")
      )[0].revision;
      const same = String(url.searchParams.get("revision")) === String(rev);
      return send(res, 200, {
        ...(same ? { unchanged: true } : await snapshot(s)),
        csrfToken: s.csrf_token,
        sessionExpiresAt: new Date(
          s.expires_at.replace(" ", "T") + "Z",
        ).getTime(),
      });
    }
    if (req.method === "GET" && path === "history")
      return send(
        res,
        200,
        await historyPage(s, url.searchParams.get("before")),
      );
    if (!["POST", "PUT", "DELETE"].includes(req.method))
      fail(405, "روش درخواست مجاز نیست.");
    csrf(req, s);
    const b = await body(req);
    if (path === "logout" && req.method === "POST") {
      await rows(pool, "DELETE FROM sessions WHERE token_hash=?", [
        s.token_hash,
      ]);
      return send(res, 200, { ok: true }, { "Set-Cookie": expiredCookie });
    }
    if (path === "password" && req.method === "POST") {
      if (!(await verifyPassword(b.oldPassword, s.password_hash)))
        fail(422, "رمز فعلی درست نیست.");
      const ph = await passwordHash(b.newPassword);
      await transaction(async (db) => {
        const fresh = (
          await rows(db, "SELECT auth_version FROM users WHERE id=?", [s.id])
        )[0];
        if (fresh.auth_version !== s.auth_version)
          fail(409, "حساب تغییر کرده است؛ دوباره وارد شوید.");
        await setHistoryActor(db, s.id);
        await rows(
          db,
          "UPDATE users SET password_hash=?,auth_version=auth_version+1,version=version+1 WHERE id=?",
          [ph, s.id],
        );
        await rows(
          db,
          "DELETE FROM sessions WHERE user_id=? AND token_hash<>?",
          [s.id, s.token_hash],
        );
        await rows(
          db,
          "UPDATE sessions SET auth_version=auth_version+1 WHERE token_hash=?",
          [s.token_hash],
        );
        await audit(db, s, "auth.password_changed", "user", s.id);
      });
      return send(res, 200, { ok: true });
    }
    return send(
      res,
      200,
      await mutate(s, req.method, path, b, req.headers["idempotency-key"]),
    );
  } catch (e) {
    const known = e.status;
    const conflict = [
      "ER_DUP_ENTRY",
      "ER_ROW_IS_REFERENCED_2",
      "ER_CHECK_CONSTRAINT_VIOLATED",
      "ER_NO_REFERENCED_ROW_2",
    ].includes(e.code);
    const status =
      known ||
      (conflict
        ? 409
        : e.code === "ER_LOCK_DEADLOCK" || e.code === "ER_LOCK_WAIT_TIMEOUT"
          ? 409
          : 500);
    if (status === 500)
      console.error(
        JSON.stringify({
          time: new Date().toISOString(),
          code: e.code || "ERROR",
          message: e.message,
        }),
      );
    if (!res.headersSent)
      send(res, status, {
        error: known
          ? e.message
          : status === 409
            ? "رکورد تکراری است، وابستگی دارد یا هم‌زمان تغییر کرده است."
            : "خطای سمت سرور؛ با مسئول سیستم تماس بگیرید.",
      });
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
try {
  await assertVehicleTypesSchema(pool);
  await assertHistorySchema(pool);
} catch (e) {
  await pool.end();
  throw e;
}
server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
  console.log("BehMasir API on loopback"),
);
const cleanup = setInterval(async () => {
  try {
    await rows(
      pool,
      "DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP(3) LIMIT 1000",
    );
    await rows(
      pool,
      "DELETE FROM login_limits WHERE window_start<UTC_TIMESTAMP(3)-INTERVAL 1 DAY LIMIT 1000",
    );
    await rows(
      pool,
      "DELETE FROM idempotency_keys WHERE created_at<UTC_TIMESTAMP(3)-INTERVAL 30 DAY LIMIT 1000",
    );
  } catch (e) {
    console.error("cleanup", e.code);
  }
}, 3600000);
cleanup.unref();
process.on("SIGTERM", () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
