// Real-MySQL acceptance, isolated test DB only. ALL fixtures and logs roll back.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { passwordHash, hash } from "./core.mjs";
import {
  transactionWithHistory,
  assertHistorySchema,
  setHistoryActor,
} from "./history-context.mjs";
import {
  attemptLogin,
  loginName,
  loginBuckets,
  logoutSession,
  resolveSession,
  endUserSessions,
  expireSessionBatch,
} from "./auth-events.mjs";
if (
  process.env.DB_NAME !== "behmasir_upgrade_verify" ||
  process.env.PORT !== "3002" ||
  process.env.APP_ORIGIN !== "https://localhost:8444" ||
  !["127.0.0.1", "localhost"].includes(process.env.DB_HOST)
) {
  console.error("STOP: isolated upgrade configuration required.");
  process.exit(1);
}
const listening = await new Promise((resolve) => {
  const socket = createConnection({ host: "127.0.0.1", port: 3002 });
  socket.setTimeout(1500);
  socket.once("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.once("error", () => resolve(false));
  socket.once("timeout", () => {
    socket.destroy();
    resolve(true);
  });
});
if (listening) {
  console.error("STOP: upgrade API must be stopped before acceptance probes.");
  process.exit(1);
}
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 1,
  timezone: "Z",
  dateStrings: true,
  charset: "utf8mb4",
  multipleStatements: false,
});
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
let checks = 0;
const check = (value, message) => {
  assert(value, message);
  checks++;
};
const rollback = new Error("ROLLBACK_AUTH_PROBES");
try {
  await assertHistorySchema(pool);
  const [initial] = await rows(
    pool,
    "SELECT COUNT(*) n,COALESCE(MAX(id),0) max_id FROM audit_log",
  );
  try {
    await transactionWithHistory(pool, async (db) => {
      const [admin] = await rows(
        db,
        "SELECT id FROM users WHERE active=1 AND role_code='admin' ORDER BY id LIMIT 1",
      );
      check(Boolean(admin), "active administrator");
      await setHistoryActor(db, admin.id);
      const username = "auth-probe-" + randomUUID().slice(0, 12),
        password = "Probe-" + randomUUID();
      const ph = await passwordHash(password);
      const inserted = await rows(
        db,
        "INSERT INTO users(username,name,role_code,password_hash,active) VALUES (?,?,'requester',?,1)",
        [username, username, ph],
      );
      const userId = inserted.insertId,
        ip =
          "2001:db8::" +
          randomUUID().slice(0, 4) +
          ":" +
          randomUUID().slice(0, 4);
      const run = (work) => work(db); // Outer transaction owns the only connection; NEVER commit a probe.
      const login = (pw = password, name = username) =>
        attemptLogin({
          pool: db,
          run,
          credentials: { username: name, password: pw },
          ip,
        });
      for (let i = 0; i < 2; i++)
        check(
          (await login("wrong-probe-password")).status === 401,
          "failed login",
        );
      const buckets = loginBuckets(loginName(username), ip),
        ipKey = buckets.find((b) => b.limit === 50).key,
        userKey = buckets.find((b) => b.limit === 10).key;
      let [counter] = await rows(
        db,
        "SELECT failures FROM login_limits WHERE bucket=?",
        [userKey],
      );
      check(counter.failures === 2, "failed-attempt user count");
      const a = await login();
      check(a.status === 200, "successful login");
      check(
        (
          await rows(db, "SELECT bucket FROM login_limits WHERE bucket=?", [
            userKey,
          ])
        ).length === 0,
        "username failures cleared",
      );
      [counter] = await rows(
        db,
        "SELECT failures FROM login_limits WHERE bucket=?",
        [ipKey],
      );
      check(counter.failures === 2, "successful login preserves IP failures");
      const unknown = await login(
        "wrong-probe-password",
        username + "-missing",
      );
      check(unknown.status === 401, "unknown-account generic denial");
      for (let i = 0; i < 10; i++)
        check(
          (await login("wrong-probe-password")).status === 401,
          "failure before limit",
        );
      const denied = await login();
      check(
        denied.status === 429 && denied.retryAfter > 0,
        "correct password cannot bypass active failure limit",
      );
      [counter] = await rows(
        db,
        "SELECT failures FROM login_limits WHERE bucket=?",
        [userKey],
      );
      check(
        counter.failures === 10,
        "blocked attempt is not another password failure",
      );
      await rows(
        db,
        "UPDATE login_limits SET window_start=UTC_TIMESTAMP(3)-INTERVAL 16 MINUTE WHERE bucket IN (?,?)",
        [userKey, ipKey],
      );
      const b = await login();
      check(b.status === 200, "window reset admits correct login");
      const [current] = await rows(
        db,
        "SELECT csrf_token FROM sessions WHERE token_hash=?",
        [hash(b.token)],
      );
      check(
        (await logoutSession(
          db,
          { id: userId, token_hash: hash(a.token) },
          ip,
        )) === 1,
        "explicit logout",
      );
      const [countBeforeRepeat] = await rows(
        db,
        "SELECT COUNT(*) n FROM audit_log",
      );
      check(
        (await logoutSession(
          db,
          { id: userId, token_hash: hash(a.token) },
          ip,
        )) === 0,
        "repeat logout no session",
      );
      const [countAfterRepeat] = await rows(
        db,
        "SELECT COUNT(*) n FROM audit_log",
      );
      check(
        countBeforeRepeat.n === countAfterRepeat.n,
        "repeat logout adds no event",
      );
      const resolved = await resolveSession({
        pool: db,
        run,
        tokenHash: hash(b.token),
        ip,
      });
      check(resolved?.id === userId, "valid session resolution");
      const c = await login();
      check(c.status === 200, "second current session");
      check(
        (await endUserSessions(db, {
          userId,
          excludeTokenHash: hash(c.token),
          actorId: userId,
          ip,
          reason: "password_changed",
        })) === 1,
        "revoke others and preserve current",
      );
      check(
        (
          await rows(db, "SELECT user_id FROM sessions WHERE token_hash=?", [
            hash(c.token),
          ])
        ).length === 1,
        "current session retained",
      );
      await setHistoryActor(db, admin.id);
      await rows(
        db,
        "UPDATE users SET auth_version=auth_version+1,version=version+1 WHERE id=?",
        [userId],
      );
      check(
        (await resolveSession({
          pool: db,
          run,
          tokenHash: hash(c.token),
          ip,
        })) === null,
        "stale auth version invalidated",
      );
      const d = await login();
      check(d.status === 200, "new auth version can login");
      await rows(
        db,
        "UPDATE sessions SET expires_at=UTC_TIMESTAMP(3)-INTERVAL 1 SECOND WHERE token_hash=?",
        [hash(d.token)],
      );
      check(
        (await resolveSession({
          pool: db,
          run,
          tokenHash: hash(d.token),
          ip,
        })) === null,
        "expired access removed",
      );
      const e = await login();
      check(e.status === 200, "cleanup fixture session");
      await rows(
        db,
        "UPDATE sessions SET expires_at=UTC_TIMESTAMP(3)-INTERVAL 1 SECOND WHERE token_hash=?",
        [hash(e.token)],
      );
      check(
        (await expireSessionBatch(db, userId)) === 1,
        "targeted expiry batch",
      );
      check((await expireSessionBatch(db, userId)) === 0, "no double expiry");
      const f = await login();
      check(f.status === 200, "admin revocation fixture");
      check(
        (await endUserSessions(db, {
          userId,
          actorId: admin.id,
          ip,
          reason: "account_updated",
        })) === 1,
        "admin revocation",
      );
      const events = await rows(
        db,
        "SELECT actor_id,action,payload FROM audit_log WHERE id>? AND action LIKE 'auth.%' ORDER BY id",
        [initial.max_id],
      );
      for (const action of [
        "auth.login",
        "auth.login_failed",
        "auth.login_blocked",
        "auth.logout",
        "auth.session_expired",
        "auth.session_invalidated",
      ])
        check(
          events.some((e) => e.action === action),
          "required event: " + action,
        );
      const serialized = JSON.stringify(events);
      for (const secret of [
        password,
        ph,
        a.token,
        b.token,
        hash(a.token),
        current.csrf_token,
      ])
        check(!serialized.includes(secret), "secret redaction");
      const failures = events.filter((e) => e.action === "auth.login_failed");
      check(
        failures.every((e) => e.actor_id === null),
        "unauthenticated attempts have no actor",
      );
      const expired = events.filter((e) => e.action === "auth.session_expired");
      check(
        expired.every((e) => e.actor_id === null),
        "expiry is a system event",
      );
      check(
        events.some(
          (e) =>
            e.action === "auth.session_invalidated" && e.actor_id === admin.id,
        ),
        "admin revocation attribution",
      );
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  const [final] = await rows(pool, "SELECT COUNT(*) n FROM audit_log");
  check(final.n === initial.n, "all auth probes and logs rolled back");
  console.log(
    `Auth events acceptance OK: ${checks} checks; all fixtures, counters, sessions and logs rolled back.`,
  );
  console.log(
    "No business data was committed. Auto-increment gaps are normal after rollback.",
  );
} catch (error) {
  console.error("Auth acceptance FAILED:", error.code || "CHECK_FAILED");
  console.error(
    "Keep the upgrade API stopped; send only this sanitized output.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
