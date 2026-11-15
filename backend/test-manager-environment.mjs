import { readFile, readdir, stat, open } from "node:fs/promises";
import { basename, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { assertHistorySchema } from "./history-context.mjs";
import { assertUnitAccessSchema } from "./unit-access.mjs";
import { assertUnitTreeSchema } from "./unit-tree.mjs";
export function requireManagerConfig(root, env) {
  if (
    basename(root.replace(/[\\/]$/, "")).toLowerCase() !== "db-upgrade" ||
    env.DB_NAME !== "behmasir_upgrade_verify" ||
    env.PORT !== "3002" ||
    env.APP_ORIGIN !== "https://localhost:8444" ||
    !["localhost", "127.0.0.1"].includes(env.DB_HOST) ||
    (env.DB_PORT && env.DB_PORT !== "3306") ||
    !env.DB_USER ||
    env.DB_USER.toLowerCase() === "root" ||
    env.SESSION_COOKIE_NAME !== "__Host-behmasir-upgrade"
  )
    throw Error("ISOLATED_TEST_APP_CONFIGURATION_REQUIRED");
}
export const occupied = (port) =>
  new Promise((resolve) => {
    const s = createConnection({ host: "127.0.0.1", port });
    s.setTimeout(1000);
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", (e) => resolve(e.code !== "ECONNREFUSED"));
    s.once("timeout", () => {
      s.destroy();
      resolve(true);
    });
  });
export async function requireManagerEnvironment(root, env = process.env) {
  requireManagerConfig(root, env);
  const branch = execFileSync("git", ["-C", root, "branch", "--show-current"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (branch !== "feature/org-workflow-audit")
    throw Error("TEST_FEATURE_BRANCH_REQUIRED");
  const expected = JSON.parse(
    await readFile(
      new URL("./test-manager-runtime.json", import.meta.url),
      "utf8",
    ),
  );
  const files = [
    "backend/core.mjs",
    "backend/history-context.mjs",
    "backend/unit-access.mjs",
    "backend/unit-tree.mjs",
    "backend/scoped-read.mjs",
    "backend/scoped-routes.mjs",
    "backend/domain.mjs",
    "backend/server.mjs",
    "public/app.js",
    "public/index.html",
    "public/style.css",
  ];
  if (
    JSON.stringify(Object.keys(expected).sort()) !==
    JSON.stringify([...files].sort())
  )
    throw Error("RUNTIME_HASH_PLAN_INVALID");
  for (const f of files)
    if (
      createHash("sha256")
        .update((await readFile(join(root, f), "utf8")).replace(/\r\n/g, "\n"))
        .digest("hex") !== expected[f]
    )
      throw Error("EXPECTED_SCOPED_RUNTIME_FILES_REQUIRED");
  if ((await occupied(3002)) || (await occupied(8444)))
    throw Error("STOP_UPGRADE_SERVICES_FIRST");
  let backupReady = false;
  for (const f of await readdir(join(root, "private")))
    if (/^before-scoped-test-accounts-.*\.sql$/.test(f)) {
      const path = join(root, "private", f),
        st = await stat(path);
      if (
        !st.isFile() ||
        st.size <= 1024 ||
        Date.now() - st.mtimeMs > 86400000 ||
        st.mtimeMs > Date.now() + 300000
      )
        continue;
      const fd = await open(path, "r");
      try {
        const buf = Buffer.alloc(16384);
        const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
        const header = buf.subarray(0, bytesRead).toString("utf8");
        const tail = Buffer.alloc(4096);
        const tailRead = await fd.read(
          tail,
          0,
          tail.length,
          Math.max(0, st.size - tail.length),
        );
        if (
          header.includes("MySQL dump") &&
          /Database:\s+behmasir_upgrade_verify(?:\s|$)/.test(header) &&
          /-- Dump completed on /.test(
            tail.subarray(0, tailRead.bytesRead).toString("utf8"),
          )
        )
          backupReady = true;
      } finally {
        await fd.close();
      }
    }
  if (!backupReady) throw Error("RECENT_SCOPED_TEST_ACCOUNT_BACKUP_REQUIRED");
}
export function managerPoolOptions(env = process.env) {
  return {
    host: env.DB_HOST,
    port: 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: "behmasir_upgrade_verify",
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true,
    multipleStatements: false,
    connectionLimit: 1,
  };
}
export async function requireManagerDatabase(db) {
  const [[server]] = await db.execute("SELECT VERSION() version,DATABASE() db");
  if (
    !/^8\.4\./.test(server.version) ||
    /MariaDB/i.test(server.version) ||
    server.db !== "behmasir_upgrade_verify"
  )
    throw Error("MYSQL84_TEST_ONLY");
  const [versions] = await db.execute(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  if (JSON.stringify(versions.map((r) => r.version)) !== "[1,2,3,4]")
    throw Error("TEST_SCHEMA_FOUR_REQUIRED");
  await assertHistorySchema(db);
  await assertUnitAccessSchema(db);
  await assertUnitTreeSchema(db);
  // The limited application DB account has no TRIGGER metadata privilege.
  // Trigger behavior is verified by five expected audit events inside the transaction.
  const [tables] = await db.execute(
    "SELECT TABLE_NAME name,ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('users','units','roles','unit_role_assignments','access_permissions','access_role_permissions','audit_log','app_meta')",
    ["behmasir_upgrade_verify"],
  );
  if (tables.length !== 8 || tables.some((t) => t.engine !== "InnoDB"))
    throw Error("TRANSACTIONAL_TABLES_REQUIRED");
}
