import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  accessStatements,
  requireFreshAccessState,
  ACCESS_TRIGGERS,
} from "../backend/access-install-plan.mjs";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const sql = await read("sql/004_scoped_access_TEST_ONLY.sql"),
  spec = JSON.parse(await read("sql/004_scoped_access_spec_TEST_ONLY.json"));
test("DDL plan has exactly three tables and thirteen audited triggers", () => {
  assert.equal(accessStatements(sql, spec).length, 16);
  assert.equal(ACCESS_TRIGGERS.length, 13);
  assert.doesNotMatch(sql, /DROP TABLE|ALTER TABLE|ON DELETE CASCADE/i);
});
test("changed SQL, mismatched plan and modified seed role/permissions fail preflight", () => {
  assert.throws(() => accessStatements(sql + " ", spec));
  assert.throws(() => accessStatements(sql, { ...spec, statement_count: 15 }));
  assert.throws(() =>
    accessStatements(sql, { ...spec, role: { code: "admin", title: "wrong" } }),
  );
  assert.throws(() =>
    accessStatements(sql, {
      ...spec,
      permissions: [{ code: "requests.approve", title: "wrong" }],
    }),
  );
});
test("only untouched schema 1,2,3 state is eligible; partial installation is never resumed blindly", () => {
  requireFreshAccessState([1, 2, 3], [], [], 0);
  for (const args of [
    [[1, 2], [], [], 0],
    [[1, 2, 3, 4], [], [], 0],
    [[1, 2, 3], ["access_permissions"], [], 0],
    [[1, 2, 3], [], ["bh4_ap_ai"], 0],
    [[1, 2, 3], [], [], 1],
  ])
    assert.throws(() => requireFreshAccessState(...args));
});
test("assignment keys and catalog codes are immutable, version/time update and physical deletion is blocked", () => {
  for (const c of ["id", "user_id", "role_code", "unit_id", "created_at"])
    assert(sql.includes("OLD.`" + c + "` <=> NEW.`" + c + "`"));
  assert.match(sql, /SET NEW.version=OLD.version\+1/);
  assert.match(sql, /UTC_TIMESTAMP\(3\)/);
  assert.match(sql, /Physical delete blocked/);
  assert.match(sql, /access.role_unlink/);
  assert.match(sql, /'before'/);
  assert.match(sql, /'after'/);
  assert.match(sql, /'change_id',@behmasir_change_id/);
});
test("installer seeds no user, assignment or database grant and writes marker after verification", async () => {
  const s = await read("backend/install-access.mjs");
  assert.doesNotMatch(
    s,
    /INSERT INTO users|INSERT INTO unit_role_assignments|CREATE USER|GRANT .* ON/i,
  );
  assert(
    s.indexOf("INSERT INTO schema_migrations(version) VALUES (4)") >
      s.indexOf("ACCESS_CATALOG_VERIFICATION_FAILED"),
  );
  assert.match(s, /assignments_n !== 0/);
  assert.match(s, /await db.beginTransaction/);
  assert.match(s, /await db.rollback/);
  assert.match(s, /Partial DDL may remain/);
});
test("private installer uses masked local input and service/branch/backup guards", async () => {
  const s = await read("windows/install-access.ps1"),
    n = await read("backend/install-access.mjs");
  assert.match(s, /-AsSecureString/);
  assert.match(s, /TEST-ACCESS/);
  assert.match(s, /3002, 8444/);
  assert.match(s, /feature\/org-workflow-audit/);
  assert.match(s, /before-scoped-permissions/);
  assert.match(n, /process.stdin/);
  assert.doesNotMatch(n, /console\.error\(e\.message\)/);
});
test("new evaluator is deliberately not wired into legacy HTTP application yet", async () => {
  for (const p of [
    "backend/server.mjs",
    "backend/domain.mjs",
    "public/app.js",
  ]) {
    const s = await read(p);
    assert.doesNotMatch(s, /from ["']\.\/unit-access\.mjs["']/);
  }
});
