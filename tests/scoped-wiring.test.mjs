import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
test("HTTP scoped allowlist executes before protected dispatch and startup requires access schema", async () => {
  const s = await read("backend/server.mjs");
  const guard = s.indexOf("assertScopedRoute(s, req.method, path)");
  assert(guard > s.indexOf("const s = await session(req)"));
  for (const part of [
    'path === "state"',
    'path === "history"',
    'path === "vehicles/deleted"',
    "const emergencyMatch",
    "csrf(req, s)",
  ])
    assert(
      guard < s.indexOf(part, s.indexOf("const server = http.createServer")),
      part,
    );
  assert(
    s.indexOf("await assertUnitAccessSchema(pool)") <
      s.indexOf("server.listen("),
  );
});
test("unit-manager state bypasses revision-only response; read state revalidates before global queries", async () => {
  const s = await read("backend/server.mjs"),
    d = await read("backend/domain.mjs");
  assert(
    s.indexOf('if (s.role_code === "unit_manager")') <
      s.indexOf("const same ="),
  );
  const a = d.indexOf("export async function snapshot");
  assert(
    d.indexOf("freshReadUser(c, u)", a) <
      d.indexOf("return scopedState(c, u, requestDTO)", a),
  );
  assert(
    d.indexOf("return scopedState(c, u, requestDTO)", a) <
      d.indexOf("const vehicles =", a),
  );
  assert.match(d, /return readSnapshot\(pool/);
});
test("scoped DB reads do not access global vehicle, center, credential or user lists", async () => {
  const s = await read("backend/scoped-read.mjs");
  assert.doesNotMatch(
    s,
    /FROM vehicles|FROM centers|SELECT \* FROM users|password_hash|csrf_token|token_hash/,
  );
  assert.match(s, /unitScopePredicate\(access, "requests.read"\)/);
  assert.match(s, /unitScopePredicate\(access, "reports.read"\)/);
  assert.match(s, /r.id<\?/);
  assert.match(s, /LIMIT 5001/);
  assert.match(s, /LIMIT 201/);
});
test("mutation rechecks scoped route after fresh identity and before actor or business mutations", async () => {
  const d = await read("backend/domain.mjs"),
    a = d.indexOf("export async function mutate");
  const guard = d.indexOf("assertScopedRoute(u, method, path)", a);
  assert(guard > d.indexOf("u = fresh;", a));
  assert(guard < d.indexOf("await setHistoryActor(db, u.id)", a));
  assert.match(d, /prev\?\.role_code === "unit_manager"/);
});
test("browser clears denied scope, rejects revision-only backend and validates history response scope", async () => {
  const s = await read("public/app.js");
  assert.match(s, /currentUser\?\.role === "unit_manager" && d.unchanged/);
  assert.match(
    s,
    /if \(currentUser\?\.role === "unit_manager"\) lockServerView\(\)/,
  );
  assert.match(s, /JSON.stringify\(d.access\?\.permissions\)/);
  assert.match(s, /scopeUserId/);
  assert.match(s, /serverScopeReport = null/);
  assert.match(s, /serverCapacityUsage = \[\]/);
  assert.match(s, /serverHistoryCursor = null/);
});
test("real MySQL verifier is isolated, offline-only and rolls fixtures back without creating persistent accounts", async () => {
  const s = await read("backend/verify-scoped-reads.mjs");
  assert.match(s, /DB_NAME !== "behmasir_upgrade_verify"/);
  assert.match(s, /await occupied\(3002\)/);
  assert.match(s, /await occupied\(8444\)/);
  assert.match(s, /throw rollback/);
  assert.match(s, /if \(e !== rollback\) throw e/);
  assert.match(s, /await pool.end\(\)/);
  assert.doesNotMatch(
    s,
    /TRUNCATE|DROP TABLE|CREATE DATABASE|CREATE USER|GRANT |console\.error\(e\)/,
  );
});
