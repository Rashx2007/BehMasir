// TEST ONLY: access evaluator/schema probes. This does NOT test HTTP data filtering.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { transactionWithHistory, setHistoryActor } from "./history-context.mjs";
import { createUnit, changeUnitParent, listUnitRows } from "./unit-tree.mjs";
import {
  resolveUnitAccess,
  unitScopePredicate,
  assertUnitAccessSchema,
} from "./unit-access.mjs";
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
const check = (v, label) => {
  assert(v, label);
  checks++;
};
const reject = async (work, status) => {
  await assert.rejects(work, (e) => e.status === status);
  checks++;
};
const signal = async (work) => {
  await assert.rejects(work, (e) => e.code === "ER_SIGNAL_EXCEPTION");
  checks++;
};
const rollback = new Error("ROLLBACK_ACCESS_PROBES");
const counts = async (db) =>
  (
    await rows(
      db,
      "SELECT (SELECT COUNT(*) FROM users) users_n,(SELECT COUNT(*) FROM audit_log) audit_n,(SELECT COUNT(*) FROM unit_role_assignments) assignments_n",
    )
  )[0];
const catalog = async (db) =>
  JSON.stringify(
    await rows(
      db,
      "SELECT code,title,is_active,version,edited_at FROM access_permissions ORDER BY code",
    ),
  );
try {
  await assertUnitAccessSchema(pool);
  const before = await counts(pool),
    originalTree = JSON.stringify(await listUnitRows(pool)),
    originalCatalog = await catalog(pool);
  try {
    await transactionWithHistory(pool, async (db) => {
      const [admin] = await rows(
        db,
        "SELECT id,auth_version FROM users WHERE active=1 AND role_code='admin' ORDER BY id LIMIT 1",
      );
      check(Boolean(admin), "active administrator");
      await setHistoryActor(db, admin.id);
      const prefix = "scope-" + randomUUID().slice(0, 12);
      const parent = await createUnit(db, { name: prefix + "-parent" }),
        child = await createUnit(db, {
          name: prefix + "-child",
          parentId: parent.id,
        }),
        sibling = await createUnit(db, {
          name: prefix + "-sibling",
          parentId: parent.id,
        }),
        outside = await createUnit(db, { name: prefix + "-outside" });
      const user = async (suffix) =>
        (
          await rows(
            db,
            "INSERT INTO users(username,name,role_code,password_hash,active) VALUES (?,?,'unit_manager',?,1)",
            [
              prefix + "-" + suffix,
              prefix + "-" + suffix,
              "unusable-probe-" + randomUUID(),
            ],
          )
        ).insertId;
      const manager = await user("manager"),
        direct = await user("direct"),
        unassigned = await user("none");
      const rootGrant = await rows(
        db,
        "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants) VALUES (?,'unit_manager',?,1)",
        [manager, parent.id],
      );
      await rows(
        db,
        "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants) VALUES (?,'unit_manager',?,0)",
        [direct, child.id],
      );
      let access = await resolveUnitAccess(db, manager, 1);
      check(
        access.permissions.includes("requests.read") &&
          access.permissions.includes("reports.read"),
        "seeded independent read grants",
      );
      check(
        access.unitIds.includes(parent.id) &&
          access.unitIds.includes(child.id) &&
          access.unitIds.includes(sibling.id) &&
          !access.unitIds.includes(outside.id),
        "root subtree only",
      );
      const directAccess = await resolveUnitAccess(db, direct, 1);
      check(
        directAccess.unitIds.length === 1 &&
          directAccess.unitIds[0] === child.id,
        "direct manager cannot see parent or sibling",
      );
      check(
        (await resolveUnitAccess(db, unassigned, 1)).unitIds.length === 0,
        "role without explicit assignment grants no rows",
      );
      let [predicate, args] = unitScopePredicate(access, "requests.read", "r");
      const [inScope] = await rows(
        db,
        "SELECT COUNT(*) n FROM (SELECT ? unit_id) AS r WHERE " + predicate,
        [child.id, ...args],
      );
      const [outOfScope] = await rows(
        db,
        "SELECT COUNT(*) n FROM (SELECT ? unit_id) AS r WHERE " + predicate,
        [outside.id, ...args],
      );
      check(
        inScope.n === 1 && outOfScope.n === 0,
        "actual bound SQL filters units",
      );
      check(
        unitScopePredicate(access, "requests.approve")[0] === "0=1",
        "no implicit approval permission",
      );
      await reject(() => resolveUnitAccess(db, manager, 99), 401);
      await reject(
        () => resolveUnitAccess(db, admin.id, admin.auth_version),
        403,
      );
      await rows(
        db,
        "UPDATE access_permissions SET is_active=0 WHERE code='requests.read'",
      );
      access = await resolveUnitAccess(db, manager, 1);
      check(
        !access.permissions.includes("requests.read") &&
          access.permissions.includes("reports.read"),
        "disabled request permission does not disable report permission",
      );
      check(
        unitScopePredicate(access, "requests.read")[0] === "0=1",
        "disabled grant denies rows",
      );
      await rows(
        db,
        "UPDATE access_permissions SET is_active=1 WHERE code='requests.read'",
      );
      await rows(
        db,
        "DELETE FROM access_role_permissions WHERE role_code='unit_manager' AND permission_code='reports.read'",
      );
      check(
        !(await resolveUnitAccess(db, manager, 1)).permissions.includes(
          "reports.read",
        ),
        "removed membership takes effect immediately",
      );
      const [unlinked] = await rows(
        db,
        "SELECT actor_id FROM audit_log WHERE action='access.role_unlink' AND entity_id='unit_manager:reports.read' ORDER BY id DESC LIMIT 1",
      );
      check(unlinked.actor_id === admin.id, "membership removal audit");
      await rows(
        db,
        "INSERT INTO access_role_permissions(role_code,permission_code) VALUES ('unit_manager','reports.read')",
      );
      await rows(db, "UPDATE unit_role_assignments SET active=0 WHERE id=?", [
        rootGrant.insertId,
      ]);
      check(
        (await resolveUnitAccess(db, manager, 1)).unitIds.length === 0,
        "revoked assignment denies all rows",
      );
      const [event] = await rows(
        db,
        "SELECT actor_id,payload FROM audit_log WHERE entity_type='unit_role_assignments' AND entity_id=? AND action='access.assignment_update' ORDER BY id DESC LIMIT 1",
        [String(rootGrant.insertId)],
      );
      const payload =
        typeof event.payload === "string"
          ? JSON.parse(event.payload)
          : event.payload;
      check(
        event.actor_id === admin.id &&
          Number(payload.before.active) === 1 &&
          Number(payload.after.active) === 0,
        "before-after assignment audit",
      );
      const [versioned] = await rows(
        db,
        "SELECT version,edited_at FROM unit_role_assignments WHERE id=?",
        [rootGrant.insertId],
      );
      check(
        versioned.version === 2 && versioned.edited_at !== null,
        "assignment version and edit timestamp",
      );
      await rows(
        db,
        "UPDATE unit_role_assignments SET active=1,include_descendants=0 WHERE id=?",
        [rootGrant.insertId],
      );
      access = await resolveUnitAccess(db, manager, 1);
      check(
        access.unitIds.length === 1 && access.unitIds[0] === parent.id,
        "descendant flag is independent",
      );
      await rows(
        db,
        "UPDATE unit_role_assignments SET include_descendants=1 WHERE id=?",
        [rootGrant.insertId],
      );
      await changeUnitParent(db, child.id, {
        version: 1,
        parentId: outside.id,
      });
      check(
        !(await resolveUnitAccess(db, manager, 1)).unitIds.includes(child.id),
        "current ancestry is used after reorganization",
      );
      await rows(db, "UPDATE users SET active=0 WHERE id=?", [direct]);
      await reject(() => resolveUnitAccess(db, direct, 1), 401);
      await signal(() =>
        rows(db, "UPDATE unit_role_assignments SET unit_id=? WHERE id=?", [
          outside.id,
          rootGrant.insertId,
        ]),
      );
      await signal(() =>
        rows(db, "DELETE FROM unit_role_assignments WHERE id=?", [
          rootGrant.insertId,
        ]),
      );
      await signal(() =>
        rows(db, "DELETE FROM access_permissions WHERE code='requests.read'"),
      );
      await signal(() =>
        rows(
          db,
          "UPDATE access_role_permissions SET permission_code=permission_code WHERE role_code='unit_manager' AND permission_code='requests.read'",
        ),
      );
      const [unchanged] = await rows(
        db,
        "SELECT unit_id FROM unit_role_assignments WHERE id=?",
        [rootGrant.insertId],
      );
      check(
        unchanged.unit_id === parent.id,
        "identity guard retains original root",
      );
      throw rollback;
    });
  } catch (e) {
    if (e !== rollback) throw e;
  }
  check(
    JSON.stringify(await counts(pool)) === JSON.stringify(before),
    "all users, assignments and audit probes rolled back",
  );
  check(
    JSON.stringify(await listUnitRows(pool)) === originalTree,
    "real organization tree unchanged",
  );
  check(
    (await catalog(pool)) === originalCatalog,
    "permission catalog restored after probes",
  );
  console.log(
    `Scoped access foundation acceptance OK: ${checks} checks; all fixtures, grants and logs rolled back.`,
  );
  console.log(
    "Foundation only: HTTP enforcement and persistent test accounts are NOT enabled. Auto-increment gaps are normal.",
  );
} catch (e) {
  console.error("Scoped access acceptance FAILED:", e.code || "CHECK_FAILED");
  console.error(
    "Keep upgrade services stopped; send only this sanitized output.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
