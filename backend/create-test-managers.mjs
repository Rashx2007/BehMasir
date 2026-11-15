// Two application passwords arrive on stdin only. Database credential stays in private api.env.
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import { transactionWithHistory } from "./history-context.mjs";
import {
  privatePasswordHashes,
  provisionTestManagers,
} from "./test-manager-plan.mjs";
import {
  requireManagerEnvironment,
  requireManagerDatabase,
  managerPoolOptions,
} from "./test-manager-environment.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
let pool,
  committed = false,
  writeAttempted = false,
  hashes;
try {
  if (process.argv.length !== 2)
    throw Error("NO_COMMAND_LINE_SECRETS_OR_OPTIONS");
  await requireManagerEnvironment(root);
  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const part of process.stdin) {
    input += part;
    if (input.length > 8192) throw Error("PRIVATE_INPUT_INVALID");
  }
  const payload = JSON.parse(input.replace(/^\uFEFF/, ""));
  input = "";
  hashes = await privatePasswordHashes(payload);
  pool = mysql.createPool(managerPoolOptions());
  await requireManagerDatabase(pool);
  writeAttempted = true;
  const accounts = await transactionWithHistory(pool, (db) =>
    provisionTestManagers(db, hashes),
  );
  committed = true;
  console.log(
    "Test managers created: 2 application accounts; 2 explicit read-only scope assignments.",
  );
  for (const a of accounts)
    console.log(
      `user=${a.username}; id=${a.id}; root=${a.unitId}; allowed_units=${a.unitIds.join(",")}`,
    );
  console.log(
    "Existing accounts and the organization tree were not changed. Passwords were not logged.",
  );
  console.log(
    "Committed to behmasir_upgrade_verify only. Keep services stopped until instructed.",
  );
} catch (e) {
  const safe = new Set([
    "NO_COMMAND_LINE_SECRETS_OR_OPTIONS",
    "ISOLATED_TEST_APP_CONFIGURATION_REQUIRED",
    "TEST_FEATURE_BRANCH_REQUIRED",
    "RUNTIME_HASH_PLAN_INVALID",
    "EXPECTED_SCOPED_RUNTIME_FILES_REQUIRED",
    "STOP_UPGRADE_SERVICES_FIRST",
    "RECENT_SCOPED_TEST_ACCOUNT_BACKUP_REQUIRED",
    "PRIVATE_INPUT_INVALID",
    "PASSWORD_POLICY_12_128",
    "PASSWORDS_MUST_DIFFER",
    "MYSQL84_TEST_ONLY",
    "TEST_SCHEMA_FOUR_REQUIRED",
    "HISTORY_AND_ACCESS_TRIGGERS_REQUIRED",
    "TRANSACTIONAL_TABLES_REQUIRED",
    "TEST_ACCOUNTS_ALREADY_EXIST_CHECK_STATE",
    "UNEXPECTED_EXISTING_MANAGER_STATE",
    "EXACT_READ_GRANTS_REQUIRED",
    "EXPECTED_TEST_UNITS_REQUIRED",
    "TEST_SCOPE_CHANGED_REVIEW_REQUIRED",
    "CLEAN_HISTORY_TRANSACTION_REQUIRED",
  ]);
  console.error(
    "STOP:",
    safe.has(e.message)
      ? e.message
      : e.code && /^[A-Z0-9_]+$/.test(e.code)
        ? e.code
        : "TEST_MANAGER_SETUP_FAILED",
  );
  console.error(
    committed
      ? "Changes committed; inspect existing accounts, do not repeat."
      : writeAttempted
        ? "Transaction failed or commit result is uncertain. Do NOT rerun; check state first."
        : "Preflight/private input failed. No account creation was attempted.",
  );
  process.exitCode = 1;
} finally {
  if (hashes) {
    hashes.support = "";
    hashes.office = "";
  }
  if (pool) await pool.end();
}
