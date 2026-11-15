import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const sql = await read("sql/003_history_foundation_TEST_ONLY.sql");
const spec = JSON.parse(await read("sql/003_history_spec_TEST_ONLY.json"));
const statements = sql
  .split(/\r?\n-- @statement\r?\n/)
  .slice(1)
  .map((s) => s.trim());
test("migration has exactly the expected nonempty single-statement blocks and 43 triggers", () => {
  assert.equal(statements.length, 60);
  assert(statements.every((s) => s.length));
  const names = [...sql.matchAll(/CREATE TRIGGER `([^`]+)`/g)].map((m) => m[1]);
  assert.equal(names.length, 43);
  assert.equal(new Set(names).size, 43);
  assert.deepEqual(names.sort(), [...spec.triggers].sort());
  assert.doesNotMatch(
    sql,
    /DROP TABLE|TRUNCATE|CREATE DATABASE|USE behmasir;/i,
  );
});
test("snapshots exclude password hashes while tracking a change flag", () => {
  const snapshots = [...sql.matchAll(/JSON_OBJECT\('id',[^\n]+/g)].map(
    (m) => m[0],
  );
  assert(snapshots.length > 10);
  assert(snapshots.every((s) => !s.includes("'password_hash'")));
  assert.match(sql, /NOT \(OLD.password_hash <=> NEW.password_hash\)/);
  assert.doesNotMatch(sql, /'csrf_token'|'token_hash'|'DB_PASSWORD'/);
});
test("every entity has baseline/create history; association removals are preserved", () => {
  for (const t of Object.keys(spec.tables)) {
    assert(sql.includes(`'history.baseline', '${t}'`));
    assert(sql.includes(`'history.create', '${t}'`));
  }
  assert.match(sql, /'history.unlink', 'request_drivers'/);
  assert.match(sql, /'history.unlink', 'user_vehicles'/);
});
test("protected tables block physical deletion and audit itself is append-only", () => {
  for (const t of Object.keys(spec.tables).slice(0, 7))
    assert(sql.includes(`bh3_${t}_bd`));
  assert.match(sql, /bh3_audit_log_bu/);
  assert.match(sql, /bh3_audit_log_bd/);
  assert.match(sql, /entity_id VARCHAR\(128\)/);
});
test("unknown historical creation dates are not invented and no-op updates are skipped", () => {
  assert.match(sql, /created_at DATETIME\(3\) NULL DEFAULT NULL/);
  assert.match(sql, /SET NEW.version = OLD.version;/);
  assert.match(sql, /IF NEW.version <> OLD.version THEN/);
  assert.doesNotMatch(sql, /UPDATE roles SET created_at/);
});
test("actors are set only after backend revalidation and before password/business mutations", async () => {
  const domain = await read("backend/domain.mjs");
  const server = await read("backend/server.mjs");
  assert(
    domain.indexOf("await setHistoryActor(db, u.id)") >
      domain.indexOf("u = fresh;"),
  );
  assert(
    server.indexOf("await setHistoryActor(db, s.id)") <
      server.indexOf('"UPDATE users SET password_hash'),
  );
  assert(
    server.indexOf("await assertHistorySchema(pool)") <
      server.indexOf("server.listen("),
  );
});
test("installer is test-only, stops on first error, and writes schema marker last", async () => {
  const source = await read("backend/install-history.mjs");
  assert.match(source, /const target = "behmasir_upgrade_verify"/);
  assert.match(source, /multipleStatements: false/);
  assert.match(source, /EXPECTED_SCHEMA_1_2_ONLY/);
  assert.match(source, /await db.query\(statements\[i\]\)/);
  assert(
    source.indexOf("INSERT INTO schema_migrations(version) VALUES (3)") >
      source.indexOf("BASELINE_COUNT_FAILED"),
  );
  assert.doesNotMatch(source, /console\.(?:error|log)\(error\)/);
});
