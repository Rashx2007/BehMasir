import {
  expectedHistoryColumns,
  validateResumeRoleColumns,
  historyStartIndex,
} from "./history-install-plan.mjs";
// Root password arrives ONLY through stdin from the local PowerShell wrapper.
// It is never placed in argv, an environment variable, a file or an error log.
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const target = "behmasir_upgrade_verify";
const root = fileURLToPath(new URL("../", import.meta.url));
const tables = [
  "users",
  "units",
  "centers",
  "vehicles",
  "vehicle_types",
  "roles",
  "transport_requests",
  "user_vehicles",
  "request_drivers",
];
const manifest = JSON.parse(
  await readFile(
    new URL("../sql/003_history_spec_TEST_ONLY.json", import.meta.url),
  ),
);
const sql = await readFile(
  new URL("../sql/003_history_foundation_TEST_ONLY.sql", import.meta.url),
  "utf8",
);
const statements = sql
  .split(/\r?\n-- @statement\r?\n/)
  .slice(1)
  .map((s) => s.trim());

let db;
let lockTaken = false;
let changesStarted = false;
try {
  const startIndex = historyStartIndex(statements, process.argv.slice(2));
  const resumeAfterStep1 = startIndex === 1;
  if (basename(resolve(root)).toLowerCase() !== "db-upgrade") {
    throw new Error("TEST_FOLDER_REQUIRED");
  }
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 8192) throw new Error("INVALID_INPUT");
  }
  const credentials = JSON.parse(input.replace(/^\uFEFF/, ""));
  input = "";
  if (typeof credentials.password !== "string" || !credentials.password) {
    throw new Error("PASSWORD_REQUIRED");
  }
  db = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: credentials.password,
    database: target,
    multipleStatements: false,
    charset: "utf8mb4",
    timezone: "Z",
  });
  credentials.password = "";
  await db.query("SET time_zone='+00:00'");
  const [[server]] = await db.query(
    "SELECT VERSION() AS version, DATABASE() AS db",
  );
  if (
    !/^8\.4\./.test(server.version) ||
    /MariaDB/i.test(server.version) ||
    server.db !== target
  ) {
    throw new Error("MYSQL84_TEST_DATABASE_REQUIRED");
  }
  const [[lock]] = await db.execute(
    "SELECT GET_LOCK('behmasir_upgrade_verify.history_003', 0) AS acquired",
  );
  if (Number(lock.acquired) !== 1) throw new Error("MIGRATION_LOCK_BUSY");
  lockTaken = true;
  const [versions] = await db.query(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  if (versions.map((r) => Number(r.version)).join(",") !== "1,2") {
    throw new Error("EXPECTED_SCHEMA_1_2_ONLY");
  }
  const [existingTriggers] = await db.execute(
    "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND EVENT_OBJECT_TABLE IN (?,?,?,?,?,?,?,?,?,?)",
    [target, ...tables, "audit_log"],
  );
  if (existingTriggers.length)
    throw new Error("UNEXPECTED_OR_PARTIAL_TRIGGERS");

  // Exact column-name preflight prevents applying to a different/partial schema.
  for (const table of tables) {
    const expected = expectedHistoryColumns(manifest, table, resumeAfterStep1);
    const [columns] = await db.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
      [target, table],
    );
    if (
      JSON.stringify(columns.map((r) => r.COLUMN_NAME).sort()) !==
      JSON.stringify(expected)
    ) {
      throw new Error("UNEXPECTED_OR_PARTIAL_COLUMNS_" + table);
    }
    if (resumeAfterStep1 && table === "roles") {
      validateResumeRoleColumns(columns);
      const [[changed]] = await db.query(
        "SELECT COUNT(*) AS n FROM roles WHERE version<>1 OR created_at IS NOT NULL OR edited_at IS NOT NULL",
      );
      if (Number(changed.n) !== 0) throw new Error("RESUME_ROLE_DATA_MISMATCH");
    }
  }
  const [[entity]] = await db.execute(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='audit_log' AND COLUMN_NAME='entity_id'",
    [target],
  );
  if (entity?.DATA_TYPE !== "int") throw new Error("UNEXPECTED_AUDIT_KEY_TYPE");
  const [engines] = await db.execute(
    "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=?",
    [target],
  );
  for (const table of [
    ...tables,
    "audit_log",
    "request_events",
    "app_meta",
    "schema_migrations",
  ]) {
    if (engines.find((row) => row.TABLE_NAME === table)?.ENGINE !== "InnoDB") {
      throw new Error("INNODB_REQUIRED_" + table);
    }
  }
  const counts = {};
  for (const table of [...tables, "audit_log", "request_events"]) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    counts[table] = Number(row.n);
  }
  await db.query("SET @behmasir_actor_id=NULL");
  await db.execute("SET @behmasir_change_id=?", [randomUUID()]);
  changesStarted = true;
  if (resumeAfterStep1)
    console.log(
      "Verified partial state: step 1 already applied; continuing at step 2/60.",
    );
  for (let i = startIndex; i < statements.length; i++) {
    await db.query(statements[i]);
    console.log(`History step ${i + 1}/${statements.length}: OK`);
  }
  const [triggers] = await db.execute(
    "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh3_'",
    [target],
  );
  if (
    JSON.stringify(triggers.map((r) => r.TRIGGER_NAME).sort()) !==
    JSON.stringify([...manifest.triggers].sort())
  ) {
    throw new Error("TRIGGER_VERIFICATION_FAILED");
  }
  for (const table of [...tables, "request_events"]) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    if (Number(row.n) !== counts[table])
      throw new Error("ROW_COUNT_CHANGED_" + table);
  }
  const expectedBaseline = tables.reduce((n, t) => n + counts[t], 0);
  const [[baseline]] = await db.query(
    "SELECT COUNT(*) AS n FROM audit_log WHERE action='history.baseline'",
  );
  const [[total]] = await db.query("SELECT COUNT(*) AS n FROM audit_log");
  if (
    Number(baseline.n) !== expectedBaseline ||
    Number(total.n) !== counts.audit_log + expectedBaseline
  ) {
    throw new Error("BASELINE_COUNT_FAILED");
  }
  const [[leak]] = await db.query(
    "SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'history.%' AND (JSON_CONTAINS_PATH(payload,'one','$.before.password_hash','$.after.password_hash')=1)",
  );
  if (Number(leak.n)) throw new Error("SECRET_REDACTION_FAILED");
  // The marker is deliberately the LAST write, after all structural checks.
  await db.query("INSERT INTO schema_migrations(version) VALUES (3)");
  console.log(
    `READY: ${target}; schema=3; triggers=${triggers.length}; baseline=${expectedBaseline}`,
  );
  console.log(
    "Database structure installed. Runtime acceptance tests are still required.",
  );
} catch (error) {
  // Never print sql, sqlMessage, credentials, stack or raw input.
  console.error(
    "STOP:",
    error.code ||
      (/^[A-Z0-9_]+$/.test(error.message) ? error.message : "INSTALL_FAILED"),
  );
  console.error(
    changesStarted
      ? "Partial DDL may remain. Do NOT rerun or start the API; inspect/rebuild only the TEST database."
      : "Preflight failed; no migration statements were executed.",
  );
  process.exitCode = 1;
} finally {
  if (db) {
    if (lockTaken) {
      await db
        .query("SELECT RELEASE_LOCK('behmasir_upgrade_verify.history_003')")
        .catch(() => {});
    }
    await db.end().catch(() => {});
  }
}
