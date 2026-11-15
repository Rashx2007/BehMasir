import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
test("HTTP login delegates to failure-only service and sends Retry-After for limits", async () => {
  const s = await read("backend/server.mjs");
  assert.match(s, /await attemptLogin\(/);
  assert.match(s, /Retry-After/);
  assert.doesNotMatch(s, /UPDATE login_limits SET failures=failures\+1/);
});
test("all application session deletions are routed through lifecycle logging", async () => {
  for (const p of ["backend/server.mjs", "backend/domain.mjs"]) {
    const s = await read(p);
    assert.doesNotMatch(s, /DELETE FROM sessions/);
  }
  const s = await read("backend/server.mjs");
  assert.match(s, /logoutSession\(db, s, clientIp\(req\)\)/);
  assert.match(s, /expireSessionBatch\(db\)/);
  assert.match(s, /resolveSession\(/);
});
test("account edits proactively invalidate and log old sessions", async () => {
  const s = await read("backend/domain.mjs");
  assert.match(s, /if \(prev\)\s+await endUserSessions\(/);
  assert.match(s, /reason: "account_updated"/);
});
test("password change keeps current session and records the refresh", async () => {
  const s = await read("backend/server.mjs");
  assert.match(s, /excludeTokenHash: s.token_hash/);
  assert.match(s, /auth.session_refreshed/);
  assert.match(s, /sessionCreatedAt: refreshedSession.created_at/);
  assert.doesNotMatch(s, /sessionCreatedAt: s.session_created_at/);
  assert.match(s, /SET auth_version=auth_version\+1 WHERE token_hash=/);
});
test("backend errors do not log raw SQL messages and proxy trust is explicit", async () => {
  const s = await read("backend/server.mjs");
  assert.doesNotMatch(s, /message: e.message/);
  assert.match(s, /TRUST_LOCAL_PROXY/);
  assert.match(s, /auth.login_rejected/);
});
