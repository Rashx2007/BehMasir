// TEST ONLY: actual MySQL scoped read queries, all changes rolled back.
// Does not start HTTP or create persistent test accounts.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { transactionWithHistory, setHistoryActor } from "./history-context.mjs";
import { createUnit, deleteUnit } from "./unit-tree.mjs";
import { assertUnitAccessSchema } from "./unit-access.mjs";
import { scopedState, scopedHistory, scopedReports } from "./scoped-read.mjs";
import { freshReadUser } from "./scoped-routes.mjs";
if (
  process.env.DB_NAME !== "behmasir_upgrade_verify" ||
  process.env.PORT !== "3002" ||
  process.env.APP_ORIGIN !== "https://localhost:8444" ||
  !["127.0.0.1", "localhost"].includes(process.env.DB_HOST) ||
  (process.env.DB_PORT && process.env.DB_PORT !== "3306")
) {
  console.error("STOP: isolated upgrade configuration required.");
  process.exit(1);
}
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
if ((await occupied(3002)) || (await occupied(8444))) {
  console.error("STOP: upgrade API and HTTPS must be stopped.");
  process.exit(1);
}
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
  multipleStatements: false,
  connectionLimit: 1,
});
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
let checks = 0;
const check = (value, label) => {
  assert(value, label);
  checks++;
};
const rejects = async (work, status) => {
  await assert.rejects(work, (e) => e.status === status);
  checks++;
};
const rollback = new Error("ROLLBACK_SCOPED_READ_PROBES");
const counts = async (db) =>
  (
    await rows(
      db,
      `SELECT (SELECT COUNT(*) FROM users) users_n,(SELECT COUNT(*) FROM units) units_n,(SELECT COUNT(*) FROM transport_requests) requests_n,(SELECT COUNT(*) FROM audit_log) audit_n,(SELECT COUNT(*) FROM unit_role_assignments) assignments_n,(SELECT revision FROM app_meta WHERE id=1) revision`,
    )
  )[0];
const catalog = async (db) =>
  JSON.stringify(
    await rows(
      db,
      "SELECT code,is_active,version,edited_at FROM access_permissions ORDER BY code",
    ),
  );
const memberships = async (db) =>
  JSON.stringify(
    await rows(
      db,
      "SELECT role_code,permission_code FROM access_role_permissions ORDER BY role_code,permission_code",
    ),
  );
// Same allowed row fields used by the runtime; DTO formatting is covered separately.
const dto = (r) => ({
  id: r.id,
  unitId: r.unit_id,
  origin: r.origin_name,
  progress: r.status,
});
try {
  await assertUnitAccessSchema(pool);
  const [schema] = await rows(
    pool,
    "SELECT MAX(version) version FROM schema_migrations",
  );
  check(schema.version === 4, "schema four required");
  const before = await counts(pool),
    beforeCatalog = await catalog(pool),
    beforeMemberships = await memberships(pool);
  try {
    await transactionWithHistory(pool, async (db) => {
      const [admin] = await rows(
        db,
        "SELECT id FROM users WHERE role_code='admin' AND active=1 ORDER BY id LIMIT 1",
      );
      check(Boolean(admin), "active administrator");
      await setHistoryActor(db, admin.id);
      const prefix = "read-" + randomUUID().slice(0, 12),
        canary = prefix + "-OUTSIDE";
      const parent = await createUnit(db, { name: prefix + "-parent" }),
        child = await createUnit(db, {
          name: prefix + "-child",
          parentId: parent.id,
        }),
        sibling = await createUnit(db, {
          name: prefix + "-sibling",
          parentId: parent.id,
        }),
        outside = await createUnit(db, { name: canary });
      const makeUser = async (suffix, role, unitId = null) =>
        (
          await rows(
            db,
            "INSERT INTO users(username,name,role_code,password_hash,active,unit_id) VALUES (?,?,?,?,1,?)",
            [
              prefix + "-" + suffix,
              prefix + "-" + suffix,
              role,
              "unusable-probe-" + randomUUID(),
              unitId,
            ],
          )
        ).insertId;
      const manager = await makeUser("manager", "unit_manager"),
        direct = await makeUser("direct", "unit_manager"),
        none = await makeUser("none", "unit_manager"),
        requester = await makeUser("requester", "requester", child.id);
      const rootGrant = await rows(
        db,
        "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants) VALUES (?,'unit_manager',?,1)",
        [manager, parent.id],
      );
      await rows(
        db,
        "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants) VALUES (?,'unit_manager',?,1)",
        [direct, child.id],
      );
      const [template] = await rows(
        db,
        "SELECT vehicle_id,origin_id,destination_id FROM transport_requests ORDER BY id LIMIT 1",
      );
      check(Boolean(template), "existing request reference template");
      const makeRequest = async (unit, status, name) =>
        (
          await rows(
            db,
            `INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time,status) VALUES (?,?,?,?,?,?,?,?,?,?,'2020-01-01','10:00:00',?)`,
            [
              requester,
              unit.id,
              template.vehicle_id,
              template.origin_id,
              template.destination_id,
              prefix + "-unit",
              name,
              prefix + "-destination",
              prefix + "-vehicle",
              prefix + "-plate",
              status,
            ],
          )
        ).insertId;
      const scheduled = await makeRequest(
          child,
          "scheduled",
          prefix + "-scheduled",
        ),
        enroute = await makeRequest(sibling, "enroute", prefix + "-enroute");
      await makeRequest(parent, "cancelled", prefix + "-cancelled");
      const delivered = [];
      for (let i = 0; i < 402; i++)
        delivered.push(
          await makeRequest(child, "delivered", prefix + "-delivered"),
        );
      await makeRequest(outside, "scheduled", canary);
      await makeRequest(outside, "delivered", canary);
      const identity = async (id) => freshReadUser(db, { id, auth_version: 1 });
      const u = await identity(manager),
        du = await identity(direct),
        nu = await identity(none);
      let state = await scopedState(db, u, dto);
      check(
        state.samples.length === 2 &&
          state.samples.some((x) => x.id === scheduled) &&
          state.samples.some((x) => x.id === enroute),
        "both open statuses across subtree, including past date",
      );
      check(
        state.scopeReport.total === 405 &&
          state.scopeReport.byStatus.delivered === 402 &&
          state.scopeReport.byStatus.cancelled === 1,
        "all-time aggregate counts include four statuses",
      );
      check(
        !JSON.stringify(state).includes(canary),
        "outside canary absent from every state field",
      );
      check(
        state.currentUser.access.unitIds.length === 3 &&
          !state.currentUser.access.unitIds.includes(outside.id),
        "explicit active subtree only",
      );
      check(
        state.users.length === 1 &&
          state.currentUser.id === manager &&
          !("password_hash" in state.currentUser) &&
          !JSON.stringify(state).includes("unusable-probe"),
        "own safe profile without credentials",
      );
      check(
        [
          "vehicles",
          "vehicleTypes",
          "centers",
          "units",
          "unitRecords",
          "usedUnits",
          "capacityUsage",
        ].every((k) => Array.isArray(state[k]) && state[k].length === 0) &&
          state.dashboard === null,
        "global data sets withheld",
      );
      check(
        state.history.length === 200 && state.historyCursor !== null,
        "first history page bounded",
      );
      const page2 = await scopedHistory(db, u, state.historyCursor, dto),
        page3 = await scopedHistory(db, u, page2.cursor, dto);
      check(
        page2.items.length === 200 &&
          page3.items.length === 2 &&
          page3.cursor === null,
        "second and third history pages advance",
      );
      check(
        new Set(
          [...state.history, ...page2.items, ...page3.items].map((x) => x.id),
        ).size === 402,
        "history pagination has no duplicate or omitted fixture",
      );
      check(
        page2.access.unitIds.includes(child.id) &&
          !page2.access.unitIds.includes(outside.id),
        "history response carries current bounded scope",
      );
      await rejects(() => scopedHistory(db, u, "0 OR 1=1", dto), 422);
      const childState = await scopedState(db, du, dto);
      check(
        childState.scopeUnits.length === 1 &&
          childState.scopeUnits[0].id === child.id &&
          childState.scopeUnits[0].parentId === null,
        "child cannot see parent name or sibling",
      );
      check(
        childState.scopeReport.total === 403 && childState.samples.length === 1,
        "child counts and details filtered independently",
      );
      const noState = await scopedState(db, nu, dto);
      check(
        noState.samples.length === 0 &&
          noState.history.length === 0 &&
          noState.scopeReport.total === 0,
        "unassigned manager has no data",
      );
      const revision = state.revision;
      await rows(
        db,
        "UPDATE access_permissions SET is_active=0 WHERE code='requests.read'",
      );
      state = await scopedState(db, u, dto);
      check(
        state.revision === revision &&
          state.samples.length === 0 &&
          state.history.length === 0 &&
          state.scopeReport.total === 405,
        "request permission revocation needs no revision bump",
      );
      await rejects(() => scopedHistory(db, u, 4294967295, dto), 403);
      await rows(
        db,
        "UPDATE access_permissions SET is_active=1 WHERE code='requests.read'",
      );
      await rows(
        db,
        "DELETE FROM access_role_permissions WHERE role_code='unit_manager' AND permission_code='reports.read'",
      );
      state = await scopedState(db, u, dto);
      check(
        state.scopeReport === null && state.samples.length === 2,
        "reports revoked without removing detail grant",
      );
      await rejects(() => scopedReports(db, u), 403);
      await rows(
        db,
        "INSERT INTO access_role_permissions(role_code,permission_code) VALUES ('unit_manager','reports.read')",
      );
      await rows(db, "UPDATE unit_role_assignments SET active=0 WHERE id=?", [
        rootGrant.insertId,
      ]);
      state = await scopedState(db, u, dto);
      check(
        state.revision === revision &&
          state.samples.length === 0 &&
          state.history.length === 0 &&
          state.scopeReport.total === 0 &&
          state.scopeUnits.length === 0,
        "assignment revocation clears every scoped dataset without revision change",
      );
      await rejects(
        () => scopedState(db, { ...u, auth_version: 99 }, dto),
        401,
      );
      await rows(db, "UPDATE users SET active=0 WHERE id=?", [direct]);
      await rejects(() => scopedState(db, du, dto), 401);
      await rejects(() => identity(direct), 401);
      const adminUser = await freshReadUser(db, {
        id: admin.id,
        auth_version: (
          await rows(db, "SELECT auth_version FROM users WHERE id=?", [
            admin.id,
          ])
        )[0].auth_version,
      });
      await rejects(() => scopedState(db, adminUser, dto), 403);
      const empty = await createUnit(db, { name: prefix + "-assigned-empty" });
      const grant = await rows(
        db,
        "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants) VALUES (?,'unit_manager',?,0)",
        [manager, empty.id],
      );
      await rejects(() => deleteUnit(db, empty.id, { version: 1 }), 409);
      await rows(db, "UPDATE unit_role_assignments SET active=0 WHERE id=?", [
        grant.insertId,
      ]);
      await deleteUnit(db, empty.id, { version: 1 });
      check(true, "deletion requires deactivating active unit assignments");
      throw rollback;
    });
  } catch (e) {
    if (e !== rollback) throw e;
  }
  check(
    JSON.stringify(await counts(pool)) === JSON.stringify(before),
    "users, units, requests, assignments, logs and revision rolled back",
  );
  check(
    (await catalog(pool)) === beforeCatalog,
    "permission catalog unchanged",
  );
  check(
    (await memberships(pool)) === beforeMemberships,
    "role grants unchanged",
  );
  console.log(
    `Scoped reads acceptance OK: ${checks} checks; all fixtures, grants, requests and logs rolled back.`,
  );
  console.log(
    "Database read queries tested; live HTTP and persistent test accounts still require separate acceptance. Auto-increment gaps are normal.",
  );
} catch (e) {
  console.error("Scoped reads acceptance FAILED:", e.code || "CHECK_FAILED");
  console.error("Keep upgrade services stopped; do not rerun blindly.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
