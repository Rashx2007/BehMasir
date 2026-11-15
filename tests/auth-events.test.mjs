import test from "node:test";
import assert from "node:assert/strict";
import {
  attemptLogin,
  authEvent,
  loginName,
  loginBuckets,
  normalizeIp,
  requestIp,
  LOGIN_POLICY,
  endUserSessions,
  logoutSession,
  resolveSession,
  expireSessionBatch,
} from "../backend/auth-events.mjs";
import { authFixture } from "./auth-fixtures.mjs";
const ip = "192.0.2.7";
const login = (f, password = "correct", extra = {}) =>
  attemptLogin({
    pool: f.db,
    run: f.run,
    credentials: { username: "tester", password },
    ip,
    verify: async (p) => p === "correct",
    ...extra,
  });
test("IP validation normalizes mapped IPv4 and refuses malformed addresses", () => {
  assert.equal(normalizeIp("::ffff:127.0.0.1"), "127.0.0.1");
  for (const value of ["unknown", "1.2.3.4, 5.6.7.8", "\r\nX: 1", null])
    assert.equal(normalizeIp(value), null);
});
test("forwarded IP is ignored unless loopback proxy is explicitly trusted", () => {
  const req = {
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "x-real-ip": "192.0.2.1" },
  };
  assert.equal(requestIp(req), "127.0.0.1");
  assert.equal(requestIp(req, true), "192.0.2.1");
  req.socket.remoteAddress = "198.51.100.2";
  assert.equal(requestIp(req, true), "198.51.100.2");
});
test("login names are bounded, normalized and looked up only in supported format", () => {
  assert.equal(loginName(" TESTER ").lookup, "tester");
  assert.equal(loginName("x".repeat(40)).display.length, 32);
  for (const value of [null, {}, "a", "' OR 1=1", "نام فارسی"])
    assert.equal(loginName(value).lookup, null);
});
test("bucket version separates historical all-attempt counters", () => {
  const b = loginBuckets(loginName("tester"), ip);
  assert.equal(b.length, 2);
  assert(b.every((v) => v.key.length === 64));
  assert.equal(LOGIN_POLICY.windowSeconds, 900);
  assert.equal(LOGIN_POLICY.userFailures, 10);
  assert.equal(LOGIN_POLICY.ipFailures, 50);
});
test("event payloads do not spread tokens, hashes, passwords or arbitrary fields", async () => {
  const f = authFixture();
  await authEvent(f.db, "auth.login_failed", {
    userId: 1,
    username: "tester",
    ip,
    reason: "bad_credentials",
    password: "SECRET1",
    password_hash: "SECRET2",
    token_hash: "SECRET3",
    csrf_token: "SECRET4",
  });
  assert(!JSON.stringify(f.state.events).includes("SECRET"));
  assert.equal(f.state.events[0].actor, null);
});
test("event writer rejects unknown event kinds and invalid identities", async () => {
  const f = authFixture();
  await assert.rejects(authEvent(f.db, "auth.anything", {}));
  await assert.rejects(authEvent(f.db, "auth.login", { actorId: "1" }));
  await assert.rejects(
    authEvent(f.db, "auth.login", { reason: "secret with spaces" }),
  );
});
test("wrong password commits both counters and failure log without a session", async () => {
  const f = authFixture();
  const r = await login(f, "wrong");
  assert.equal(r.status, 401);
  assert.equal(f.state.sessions.size, 0);
  assert([...f.state.limits.values()].every((v) => v.failures === 1));
  assert.equal(f.state.events.at(-1).action, "auth.login_failed");
});
test("successful login clears username failures, preserves IP failures and hides bearer values", async () => {
  const f = authFixture();
  await login(f, "wrong");
  const r = await login(f);
  assert.equal(r.status, 200);
  assert.equal(f.state.sessions.size, 1);
  assert.equal(f.state.limits.size, 1);
  assert.equal([...f.state.limits.values()][0].failures, 1);
  assert.equal(f.state.events.at(-1).action, "auth.login");
  const logs = JSON.stringify(f.state.events);
  assert(!logs.includes(r.token));
  assert(!logs.includes(f.session().token_hash));
  assert(!logs.includes(f.session().csrf_token));
});
test("ten failed user attempts block even a correct password until window expires", async () => {
  const f = authFixture();
  for (let i = 0; i < 10; i++)
    assert.equal((await login(f, "wrong")).status, 401);
  let called = 0;
  const r = await login(f, "correct", {
    verify: async () => {
      called++;
      return true;
    },
  });
  assert.equal(r.status, 429);
  assert.equal(called, 0);
  assert.equal(f.state.events.at(-1).action, "auth.login_blocked");
  assert(r.retryAfter > 0);
  f.state.now += 900001;
  assert.equal((await login(f)).status, 200);
});
test("IP limit blocks attempts under a different username too", async () => {
  const f = authFixture();
  const b = loginBuckets(loginName("tester"), ip).find((v) => v.limit === 50);
  f.state.limits.set(b.key, { failures: 50, start: f.state.now });
  const r = await login(f, "correct", {
    credentials: { username: "another", password: "correct" },
  });
  assert.equal(r.status, 429);
  assert.equal(f.state.sessions.size, 0);
});
test("unknown account and inactive account return the same generic client error", async () => {
  const f = authFixture();
  const unknown = await login(f, "wrong", {
    credentials: { username: "missing", password: "wrong" },
  });
  f.state.users.get("tester").active = 0;
  const inactive = await login(f);
  assert.equal(unknown.error, inactive.error);
  assert.equal(inactive.status, 401);
  assert.equal(f.state.sessions.size, 0);
  assert.equal(f.state.events.at(-1).payload.reason, "account_inactive");
});
test("account changed during password verification cannot receive a stale session", async () => {
  const f = authFixture();
  const r = await login(f, "correct", {
    verify: async () => {
      f.state.users.get("tester").auth_version++;
      return true;
    },
  });
  assert.equal(r.status, 401);
  assert.equal(f.state.sessions.size, 0);
  assert.equal(f.state.events.at(-1).payload.reason, "account_changed");
});
test("concurrent admitted attempts recheck the limit before issuing a session", async () => {
  const f = authFixture();
  for (let i = 0; i < 9; i++) await login(f, "wrong");
  let release;
  const gate = new Promise((r) => (release = r));
  const a = login(f, "wrong", {
    verify: async () => {
      await gate;
      return false;
    },
  });
  const b = login(f, "wrong", {
    verify: async () => {
      await gate;
      return false;
    },
  });
  await new Promise((r) => setTimeout(r, 10));
  release();
  const result = await Promise.all([a, b]);
  assert.deepEqual(result.map((r) => r.status).sort(), [401, 429]);
  assert([...f.state.limits.values()].every((v) => v.failures === 10));
});
test("audit failure rolls back counters rather than recording an unaudited outcome", async () => {
  const f = authFixture();
  const original = f.db.execute;
  f.db.execute = async (sql, args) => {
    if (sql.startsWith("INSERT INTO audit_log"))
      throw Error("audit unavailable");
    return original(sql, args);
  };
  await assert.rejects(login(f, "wrong"));
  assert([...f.state.limits.values()].every((v) => v.failures === 0));
  assert.equal(f.state.sessions.size, 0);
});
test("explicit logout logs once and repeated logout does not fabricate events", async () => {
  const f = authFixture();
  const r = await login(f);
  const s = { id: 1, token_hash: f.hash(r.token) };
  assert.equal(await f.run((db) => logoutSession(db, s, ip)), 1);
  assert.equal(f.state.events.at(-1).action, "auth.logout");
  const n = f.state.events.length;
  assert.equal(await f.run((db) => logoutSession(db, s, ip)), 0);
  assert.equal(f.state.events.length, n);
});
test("expired session on logout is classified as expiry, not explicit logout", async () => {
  const f = authFixture();
  const r = await login(f);
  f.state.now += 28800001;
  await f.run((db) =>
    logoutSession(db, { id: 1, token_hash: f.hash(r.token) }, ip),
  );
  assert.equal(f.state.events.at(-1).action, "auth.session_expired");
  assert.equal(f.state.events.at(-1).actor, null);
  assert(f.state.events.at(-1).occurred.endsWith("Z"));
});
test("valid session read avoids a mutation transaction", async () => {
  const f = authFixture();
  const r = await login(f);
  const s = await resolveSession({
    pool: f.db,
    run: () => {
      throw Error("unexpected transaction");
    },
    tokenHash: f.hash(r.token),
    ip,
  });
  assert.equal(s.id, 1);
});
test("accessing an expired session deletes and logs it exactly once", async () => {
  const f = authFixture();
  const r = await login(f);
  f.state.now += 28800001;
  const args = { pool: f.db, run: f.run, tokenHash: f.hash(r.token), ip };
  assert.equal(await resolveSession(args), null);
  assert.equal(f.state.events.at(-1).action, "auth.session_expired");
  const n = f.state.events.length;
  assert.equal(await resolveSession(args), null);
  assert.equal(f.state.events.length, n);
});
test("auth-version mismatch and account disablement are not reported as logout", async () => {
  for (const field of ["auth_version", "active"]) {
    const f = authFixture();
    const r = await login(f);
    f.state.users.get("tester")[field] = field === "active" ? 0 : 2;
    await resolveSession({
      pool: f.db,
      run: f.run,
      tokenHash: f.hash(r.token),
      ip,
    });
    assert.equal(f.state.events.at(-1).action, "auth.session_invalidated");
  }
});
test("user-session revocation can preserve the current password-change session", async () => {
  const f = authFixture();
  const a = await login(f),
    b = await login(f);
  await f.run((db) =>
    endUserSessions(db, {
      userId: 1,
      excludeTokenHash: f.hash(b.token),
      actorId: 1,
      ip,
      reason: "password_changed",
    }),
  );
  assert(!f.state.sessions.has(f.hash(a.token)));
  assert(f.state.sessions.has(f.hash(b.token)));
  assert.equal(f.state.events.at(-1).action, "auth.session_invalidated");
  assert.equal(f.state.events.at(-1).payload.reason, "password_changed");
});
test("background expiry records actual expiry time independently of collection time", async () => {
  const f = authFixture();
  await login(f);
  const expiry = f.session().expires_at;
  f.state.now += 30000000;
  assert.equal(await f.run(expireSessionBatch), 1);
  assert.equal(f.state.events.at(-1).occurred, expiry.replace(" ", "T") + "Z");
  assert.equal(await f.run(expireSessionBatch), 0);
});
test("verification exception is rejected and audited without counting a bad password", async () => {
  const f = authFixture();
  await assert.rejects(
    login(f, "correct", {
      verify: async () => {
        throw Error("crypto fault");
      },
    }),
  );
  assert.equal(f.state.events.at(-1).action, "auth.login_rejected");
  assert.equal(f.state.events.at(-1).payload.reason, "verification_error");
  assert([...f.state.limits.values()].every((v) => v.failures === 0));
});

test("failed success-event insertion rolls back session issuance", async () => {
  const f = authFixture();
  const original = f.db.execute;
  f.db.execute = async (sql, args) => {
    if (sql.startsWith("INSERT INTO audit_log"))
      throw Error("audit unavailable");
    return original(sql, args);
  };
  await assert.rejects(login(f));
  assert.equal(f.state.sessions.size, 0);
  assert.equal(f.state.events.length, 0);
});

test("failed logout-event insertion preserves session and existing log", async () => {
  const f = authFixture();
  const r = await login(f);
  const n = f.state.events.length;
  const original = f.db.execute;
  f.db.execute = async (sql, args) => {
    if (sql.startsWith("INSERT INTO audit_log"))
      throw Error("audit unavailable");
    return original(sql, args);
  };
  await assert.rejects(
    f.run((db) =>
      logoutSession(db, { id: 1, token_hash: f.hash(r.token) }, ip),
    ),
  );
  assert.equal(f.state.sessions.size, 1);
  assert.equal(f.state.events.length, n);
});
