// TEST ONLY: provision the exact two proposed accounts, verify, then ROLLBACK.
// Random probe passwords exist in process memory only; no private password input needed.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { transactionWithHistory } from "./history-context.mjs";
import {
  privatePasswordHashes,
  provisionTestManagers,
  TEST_MANAGER_PLAN,
} from "./test-manager-plan.mjs";
import {
  requireManagerEnvironment,
  requireManagerDatabase,
  managerPoolOptions,
} from "./test-manager-environment.mjs";
import { verifyPassword } from "./core.mjs";
import { scopedState } from "./scoped-read.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
let pool,
  checks = 0,
  hashes;
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
const check = (v, label) => {
  assert(v, label);
  checks++;
};
const rollback = Error("ROLLBACK_TEST_MANAGER_PROBES");
const snapshot = async (db) =>
  JSON.stringify(
    (
      await rows(
        db,
        `SELECT (SELECT COUNT(*) FROM users) users_n,(SELECT COUNT(*) FROM units) units_n,(SELECT COUNT(*) FROM unit_role_assignments) assignments_n,(SELECT COUNT(*) FROM transport_requests) requests_n,(SELECT COUNT(*) FROM audit_log) audit_n,(SELECT COUNT(*) FROM sessions) sessions_n,(SELECT revision FROM app_meta WHERE id=1) revision`,
      )
    )[0],
  );
try {
  if (process.argv.length !== 2) throw Error("NO_OPTIONS");
  await requireManagerEnvironment(root);
  pool = mysql.createPool(managerPoolOptions());
  await requireManagerDatabase(pool);
  const before = await snapshot(pool);
  const secrets = {
    support: randomUUID() + "-support",
    office: randomUUID() + "-office",
  };
  hashes = await privatePasswordHashes({
    confirmation: "TEST-MANAGERS",
    passwords: { ...secrets },
  });
  try {
    await transactionWithHistory(pool, async (db) => {
      const accounts = await provisionTestManagers(db, hashes);
      check(accounts.length === 2, "two exact accounts");
      for (const p of TEST_MANAGER_PLAN) {
        const a = accounts.find((x) => x.username === p.username);
        check(
          a.unitId === p.unitId &&
            JSON.stringify(a.unitIds) === JSON.stringify(p.unitIds),
          "approved account scope",
        );
        const [u] = await rows(
          db,
          "SELECT u.*,x.name unit_name FROM users u LEFT JOIN units x ON x.id=u.unit_id WHERE u.id=?",
          [a.id],
        );
        check(
          await verifyPassword(secrets[p.key], u.password_hash),
          "private password verifies",
        );
        check(
          !(await verifyPassword("definitely-wrong-password", u.password_hash)),
          "wrong password rejected",
        );
        check(
          u.role_code === "unit_manager" &&
            u.active === 1 &&
            u.auth_version === 1,
          "active version-one unit manager",
        );
      }
      // Repeated provisioning must refuse existing test identities, not reset their passwords.
      await assert.rejects(
        () => provisionTestManagers(db, hashes),
        (e) => e.message === "TEST_ACCOUNTS_ALREADY_EXIST_CHECK_STATE",
      );
      checks++;
      const [template] = await rows(
        db,
        "SELECT requester_user_id,vehicle_id,origin_id,destination_id FROM transport_requests ORDER BY id LIMIT 1",
      );
      check(Boolean(template), "existing request reference template");
      const prefix = "test-account-probe-" + randomUUID().slice(0, 8),
        ids = {};
      for (const unitId of [1, 3, 7])
        ids[unitId] = (
          await rows(
            db,
            `INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time,status) VALUES (?,?,?,?,?,?,?,?,?,?,'2020-01-01','10:00:00','scheduled')`,
            [
              template.requester_user_id,
              unitId,
              template.vehicle_id,
              template.origin_id,
              template.destination_id,
              prefix,
              prefix + "-" + unitId,
              prefix + "-destination",
              prefix + "-vehicle",
              "TEST-PROBE",
            ],
          )
        ).insertId;
      for (const p of TEST_MANAGER_PLAN) {
        const a = accounts.find((x) => x.username === p.username),
          [u] = await rows(
            db,
            "SELECT u.*,x.name unit_name FROM users u LEFT JOIN units x ON x.id=u.unit_id WHERE u.id=?",
            [a.id],
          );
        const state = await scopedState(db, u, (r) => ({
          id: r.id,
          unitId: r.unit_id,
        }));
        check(
          state.samples.some((r) => r.id === ids[1]),
          "both accounts see office request",
        );
        check(
          !state.samples.some((r) => r.id === ids[7]),
          "neither account sees unrelated service unit",
        );
        check(
          state.samples.some((r) => r.id === ids[3]) === (p.key === "support"),
          "only parent manager sees sibling technical unit",
        );
        check(
          [...state.samples, ...state.history].every((r) =>
            p.unitIds.includes(r.unitId),
          ),
          "all rows remain in assigned scope",
        );
        check(
          state.users.length === 1 &&
            state.currentUser.id === a.id &&
            !("password_hash" in state.currentUser),
          "safe self profile only",
        );
        const [expected] = await rows(
          db,
          `SELECT COUNT(*) n FROM transport_requests WHERE unit_id IN (${p.unitIds.map(() => "?").join(",")})`,
          p.unitIds,
        );
        check(
          state.scopeReport.total === expected.n,
          "report equals SQL total for approved units only",
        );
        check(
          state.vehicles.length === 0 &&
            state.centers.length === 0 &&
            state.unitRecords.length === 0,
          "global catalogs withheld",
        );
      }
      throw rollback;
    });
  } catch (e) {
    if (e !== rollback) throw e;
  }
  secrets.support = "";
  secrets.office = "";
  check(
    (await snapshot(pool)) === before,
    "all accounts, assignments, request fixtures, sessions, logs and revision restored",
  );
  const [existing] = await rows(
    pool,
    "SELECT COUNT(*) n FROM users WHERE username IN (?,?)",
    TEST_MANAGER_PLAN.map((p) => p.username),
  );
  check(existing.n === 0, "no persistent test accounts created");
  console.log(
    `Test managers acceptance OK: ${checks} checks; both accounts, assignments, request fixtures and logs rolled back.`,
  );
  console.log(
    "No persistent accounts were created. Live login and browser acceptance are still required. Auto-increment gaps are normal.",
  );
} catch (e) {
  console.error(
    "Test managers acceptance FAILED:",
    e.code && /^[A-Z0-9_]+$/.test(e.code)
      ? e.code
      : /^[A-Z0-9_]+$/.test(e.message || "")
        ? e.message
        : "CHECK_FAILED",
  );
  console.error("Keep upgrade services stopped; do not rerun blindly.");
  process.exitCode = 1;
} finally {
  if (hashes) {
    hashes.support = "";
    hashes.office = "";
  }
  if (pool) await pool.end();
}
