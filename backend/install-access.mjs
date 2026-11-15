// Root password is read from stdin only. No credentials in argv/env/files/logs.
import mysql from "mysql2/promise";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import {
  accessStatements,
  requireFreshAccessState,
  ACCESS_TABLES,
  ACCESS_TRIGGERS,
} from "./access-install-plan.mjs";
import { assertHistorySchema } from "./history-context.mjs";
import { assertUnitTreeSchema } from "./unit-tree.mjs";
const target = "behmasir_upgrade_verify",
  root = fileURLToPath(new URL("../", import.meta.url));
let db,
  locked = false,
  changesStarted = false,
  inTransaction = false;
const rows = async (sql, args = []) => (await db.execute(sql, args))[0];
const occupied = (port) =>
  new Promise((resolve) => {
    const s = createConnection({ host: "127.0.0.1", port });
    s.setTimeout(1000);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
    s.once("timeout", () => {
      s.destroy();
      resolve(true);
    });
  });
try {
  if (
    process.argv.length !== 2 ||
    basename(root.replace(/[\\/]$/, "")).toLowerCase() !== "db-upgrade"
  )
    throw Error("TEST_WORKTREE_REQUIRED");
  const config = (await readFile(join(root, "private/api.env"), "utf8")).split(
    /\r?\n/,
  );
  for (const line of [
    "DB_NAME=" + target,
    "PORT=3002",
    "APP_ORIGIN=https://localhost:8444",
  ])
    if (!config.includes(line)) throw Error("TEST_CONFIG_REQUIRED");
  const privatePath = join(root, "private");
  let backupReady = false;
  for (const f of await readdir(privatePath))
    if (/^before-scoped-permissions-.*\.sql$/.test(f)) {
      const st = await stat(join(privatePath, f));
      if (
        st.isFile() &&
        st.size > 1024 &&
        Date.now() - st.mtimeMs < 86400000 &&
        st.mtimeMs <= Date.now() + 300000
      )
        backupReady = true;
    }
  if (!backupReady) throw Error("RECENT_ACCESS_BACKUP_REQUIRED");
  if ((await occupied(3002)) || (await occupied(8444)))
    throw Error("STOP_UPGRADE_SERVICES_FIRST");
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const c of process.stdin) {
    input += c;
    if (input.length > 8192) throw Error("INVALID_INPUT");
  }
  const credentials = JSON.parse(input.replace(/^\uFEFF/, ""));
  input = "";
  if (typeof credentials.password !== "string" || !credentials.password)
    throw Error("PASSWORD_REQUIRED");
  db = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: credentials.password,
    database: target,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    multipleStatements: false,
  });
  credentials.password = "";
  await db.query("SET time_zone='+00:00'");
  const [[server]] = await db.query("SELECT VERSION() version,DATABASE() db");
  if (
    !/^8\.4\./.test(server.version) ||
    /MariaDB/i.test(server.version) ||
    server.db !== target
  )
    throw Error("MYSQL84_TEST_ONLY");
  const [lock] = await rows(
    "SELECT GET_LOCK('behmasir_upgrade_verify.access_004',0) acquired",
  );
  if (Number(lock.acquired) !== 1) throw Error("MIGRATION_LOCK_BUSY");
  locked = true;
  const spec = JSON.parse(
    await readFile(
      new URL("../sql/004_scoped_access_spec_TEST_ONLY.json", import.meta.url),
      "utf8",
    ),
  );
  const statements = accessStatements(
    await readFile(
      new URL("../sql/004_scoped_access_TEST_ONLY.sql", import.meta.url),
      "utf8",
    ),
    spec,
  );
  const versions = await rows(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  const tables = await rows(
    "SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?,?,?)",
    [target, ...ACCESS_TABLES],
  );
  const triggers = await rows(
    "SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh4_'",
    [target],
  );
  const [roleCount] = await rows("SELECT COUNT(*) n FROM roles WHERE code=?", [
    "unit_manager",
  ]);
  requireFreshAccessState(
    versions.map((r) => r.version),
    tables.map((r) => r.name),
    triggers.map((r) => r.name),
    roleCount.n,
  );
  await assertHistorySchema(db);
  await assertUnitTreeSchema(db);
  const historySpec = JSON.parse(
    await readFile(
      new URL("../sql/003_history_spec_TEST_ONLY.json", import.meta.url),
      "utf8",
    ),
  );
  const oldTriggers = await rows(
    "SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh3_'",
    [target],
  );
  if (
    JSON.stringify(oldTriggers.map((r) => r.name).sort()) !==
    JSON.stringify(historySpec.triggers.slice().sort())
  )
    throw Error("HISTORY_TRIGGERS_REQUIRED");
  const cols = await rows(
    "SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,CHARACTER_SET_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND ((TABLE_NAME='roles' AND COLUMN_NAME='code') OR (TABLE_NAME IN ('users','units') AND COLUMN_NAME='id'))",
    [target],
  );
  if (
    cols.length !== 3 ||
    cols.some((c) =>
      c.TABLE_NAME === "roles"
        ? c.COLUMN_TYPE !== "varchar(24)" ||
          c.CHARACTER_SET_NAME !== "ascii" ||
          c.COLLATION_NAME !== "ascii_general_ci"
        : c.COLUMN_TYPE !== "int unsigned",
    )
  )
    throw Error("FOREIGN_KEY_DEFINITION_MISMATCH");
  const existingUsers = JSON.stringify(
    await rows(
      "SELECT id,role_code,unit_id,active,auth_version,version FROM users ORDER BY id",
    ),
  );
  const existingUnits = JSON.stringify(
    await rows(
      "SELECT id,name,parent_id,deleted_at,version FROM units ORDER BY id",
    ),
  );
  const countTables = [
    "users",
    "units",
    "transport_requests",
    "vehicles",
    "centers",
    "user_vehicles",
    "request_drivers",
    "request_events",
  ];
  const counts = {};
  for (const t of countTables)
    counts[t] = (await rows("SELECT COUNT(*) n FROM `" + t + "`"))[0].n;
  await db.query("SET @behmasir_actor_id=NULL");
  await db.execute("SET @behmasir_change_id=?", [randomUUID()]);
  changesStarted = true;
  for (let i = 0; i < statements.length; i++) {
    await db.query(statements[i]);
    console.log(`Access DDL ${i + 1}/${statements.length}: OK`);
  }
  const installed = await rows(
    "SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh4_'",
    [target],
  );
  if (
    JSON.stringify(installed.map((r) => r.name).sort()) !==
    JSON.stringify([...ACCESS_TRIGGERS].sort())
  )
    throw Error("ACCESS_TRIGGER_VERIFICATION_FAILED");
  for (const t of ACCESS_TABLES) {
    const physical = await rows(
      "SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?",
      [target, t],
    );
    if (
      JSON.stringify(physical.map((r) => r.name).sort()) !==
      JSON.stringify(spec.tables[t].slice().sort())
    )
      throw Error("ACCESS_COLUMN_VERIFICATION_FAILED");
  }
  await db.beginTransaction();
  inTransaction = true;
  await rows("SELECT revision FROM app_meta WHERE id=1 FOR UPDATE");
  await db.execute("INSERT INTO roles(code,title) VALUES (?,?)", [
    spec.role.code,
    spec.role.title,
  ]);
  for (const p of spec.permissions) {
    await db.execute(
      "INSERT INTO access_permissions(code,title) VALUES (?,?)",
      [p.code, p.title],
    );
    await db.execute(
      "INSERT INTO access_role_permissions(role_code,permission_code) VALUES (?,?)",
      [spec.role.code, p.code],
    );
  }
  for (const t of countTables)
    if ((await rows("SELECT COUNT(*) n FROM `" + t + "`"))[0].n !== counts[t])
      throw Error("EXISTING_ROW_COUNT_CHANGED");
  if (
    JSON.stringify(
      await rows(
        "SELECT id,role_code,unit_id,active,auth_version,version FROM users ORDER BY id",
      ),
    ) !== existingUsers ||
    JSON.stringify(
      await rows(
        "SELECT id,name,parent_id,deleted_at,version FROM units ORDER BY id",
      ),
    ) !== existingUnits
  )
    throw Error("EXISTING_ASSIGNMENT_OR_TREE_CHANGED");
  const [ready] = await rows(
    "SELECT (SELECT COUNT(*) FROM access_permissions) permissions_n,(SELECT COUNT(*) FROM access_role_permissions) grants_n,(SELECT COUNT(*) FROM unit_role_assignments) assignments_n",
  );
  if (
    ready.permissions_n !== 2 ||
    ready.grants_n !== 2 ||
    ready.assignments_n !== 0
  )
    throw Error("ACCESS_CATALOG_VERIFICATION_FAILED");
  await db.execute(
    "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'access.foundation_installed','app',NULL,JSON_OBJECT('schema_version',4,'assignments_enabled',FALSE,'http_enforcement_enabled',FALSE,'db_account',USER(),'change_id',@behmasir_change_id))",
  );
  await db.execute("UPDATE app_meta SET revision=revision+1 WHERE id=1");
  // Schema marker LAST, in the same transaction as seed rows and installation audit.
  await db.execute("INSERT INTO schema_migrations(version) VALUES (4)");
  await db.commit();
  inTransaction = false;
  console.log(
    "READY: behmasir_upgrade_verify; schema=4; access_tables=3; access_triggers=13; assignments=0.",
  );
  console.log(
    "Dormant foundation only. HTTP enforcement and test-account activation are NOT enabled.",
  );
} catch (e) {
  if (inTransaction && db)
    try {
      await db.rollback();
    } catch {}
  console.error(
    "STOP:",
    e.code ||
      (/^[A-Z0-9_]+$/.test(e.message || "")
        ? e.message
        : "ACCESS_INSTALL_FAILED"),
  );
  if (changesStarted)
    console.error(
      "Partial DDL may remain. Do NOT rerun or start the API; inspect/rebuild only the TEST database.",
    );
  process.exitCode = 1;
} finally {
  if (db) {
    try {
      await db.query("SET @behmasir_actor_id=NULL,@behmasir_change_id=NULL");
      if (locked)
        await db.query("DO RELEASE_LOCK('behmasir_upgrade_verify.access_004')");
    } catch {}
    await db.end();
  }
}
