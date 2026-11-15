// TEST ONLY: all fixtures, tree mutations and their history roll back together.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import {
  transactionWithHistory,
  assertHistorySchema,
  setHistoryActor,
} from "./history-context.mjs";
import {
  unitTree,
  listUnitRows,
  createUnit,
  changeUnitParent,
  renameUnit,
  deleteUnit,
  assertUnitTreeSchema,
} from "./unit-tree.mjs";
if (
  process.env.DB_NAME !== "behmasir_upgrade_verify" ||
  process.env.PORT !== "3002" ||
  process.env.APP_ORIGIN !== "https://localhost:8444" ||
  !["localhost", "127.0.0.1"].includes(process.env.DB_HOST) ||
  (process.env.DB_PORT && process.env.DB_PORT !== "3306")
) {
  console.error("STOP: isolated upgrade configuration required.");
  process.exit(1);
}
const listening = await new Promise((resolve) => {
  const socket = createConnection({ host: "127.0.0.1", port: 3002 });
  socket.setTimeout(1500);
  socket.once("connect", () => {
    socket.destroy();
    resolve(true);
  });
  socket.once("error", () => resolve(false));
  socket.once("timeout", () => {
    socket.destroy();
    resolve(true);
  });
});
if (listening) {
  console.error("STOP: upgrade API must be stopped before tree probes.");
  process.exit(1);
}
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 1,
  timezone: "Z",
  dateStrings: true,
  charset: "utf8mb4",
  multipleStatements: false,
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
const rollback = new Error("ROLLBACK_UNIT_TREE_PROBES");
try {
  await assertHistorySchema(pool);
  await assertUnitTreeSchema(pool);
  const original = await listUnitRows(pool);
  const [before] = await rows(pool, "SELECT COUNT(*) n FROM audit_log");
  const [beforeLinks] = await rows(
    pool,
    "SELECT (SELECT COUNT(*) FROM users) users_n,(SELECT COUNT(*) FROM transport_requests) requests_n",
  );
  try {
    await transactionWithHistory(pool, async (db) => {
      const [admin] = await rows(
        db,
        "SELECT id FROM users WHERE active=1 AND role_code='admin' ORDER BY id LIMIT 1",
      );
      check(Boolean(admin), "active administrator");
      await setHistoryActor(db, admin.id);
      const prefix = "tree-probe-" + randomUUID().slice(0, 12);
      const a = await createUnit(db, { name: prefix + "-A", parentId: null });
      const b = await createUnit(db, { name: prefix + "-B", parentId: null });
      const c = await createUnit(db, { name: prefix + "-C", parentId: a.id });
      const d = await createUnit(db, { name: prefix + "-D", parentId: c.id });
      // Isolated rename fixtures: neither real users nor real request rows are edited.
      const oldName = prefix + "-old-name",
        newName = prefix + "-services";
      const named = await createUnit(db, { name: oldName, parentId: null });
      const namedChild = await createUnit(db, {
        name: prefix + "-rename-child",
        parentId: named.id,
      });
      const fixtureUser = await rows(
        db,
        "INSERT INTO users(username,name,role_code,password_hash,unit_id,active) VALUES (?,?,'requester',?,?,0)",
        [
          "tree-user-" + randomUUID().slice(0, 12),
          prefix,
          "unusable-probe-" + randomUUID(),
          named.id,
        ],
      );
      const fixtureRequest = await rows(
        db,
        "INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time,status,cancelled_at) SELECT ?,?,vehicle_id,origin_id,destination_id,?,origin_name,destination_name,vehicle_name,plate,service_date,service_time,'cancelled',UTC_TIMESTAMP(3) FROM transport_requests ORDER BY id LIMIT 1",
        [fixtureUser.insertId, named.id, oldName],
      );
      check(fixtureRequest.affectedRows === 1, "request template available");
      check(
        (await renameUnit(db, named.id, { version: 1, name: newName })).changed,
        "rename used unit",
      );
      const [linked] = await rows(
        db,
        "SELECT u.unit_id,un.name FROM users u JOIN units un ON un.id=u.unit_id WHERE u.id=?",
        [fixtureUser.insertId],
      );
      check(
        linked.unit_id === named.id && linked.name === newName,
        "user identity and current label retained",
      );
      const [historical] = await rows(
        db,
        "SELECT unit_id,unit_name FROM transport_requests WHERE id=?",
        [fixtureRequest.insertId],
      );
      check(
        historical.unit_id === named.id && historical.unit_name === oldName,
        "request identity and historical label retained",
      );
      const [renameRow] = await rows(
        db,
        "SELECT name,parent_id,version,edited_at FROM units WHERE id=?",
        [named.id],
      );
      check(
        renameRow.name === newName &&
          renameRow.parent_id === null &&
          renameRow.version === 2 &&
          renameRow.edited_at !== null,
        "rename timestamp and version",
      );
      check(
        unitTree(await listUnitRows(db))
          .find((r) => r.id === namedChild.id)
          .path.startsWith(newName + " / "),
        "descendant path follows new label",
      );
      const [renameLog] = await rows(
        db,
        "SELECT actor_id,payload FROM audit_log WHERE entity_type='units' AND entity_id=? AND action='history.update' ORDER BY id DESC LIMIT 1",
        [String(named.id)],
      );
      const renamePayload =
        typeof renameLog.payload === "string"
          ? JSON.parse(renameLog.payload)
          : renameLog.payload;
      check(
        renameLog.actor_id === admin.id &&
          renamePayload.before.name === oldName &&
          renamePayload.after.name === newName,
        "rename before-after history and actor",
      );
      await reject(
        () => renameUnit(db, named.id, { version: 1, name: prefix + "-stale" }),
        409,
      );
      await reject(
        () => renameUnit(db, b.id, { version: 1, name: newName }),
        409,
      );
      const [renameCount] = await rows(db, "SELECT COUNT(*) n FROM audit_log");
      check(
        !(await renameUnit(db, named.id, { version: 2, name: newName }))
          .changed,
        "unchanged name no-op",
      );
      const [renameCountAfter] = await rows(
        db,
        "SELECT COUNT(*) n FROM audit_log",
      );
      check(
        renameCountAfter.n === renameCount.n,
        "no fabricated rename history",
      );
      let tree = unitTree(await listUnitRows(db));
      check(
        tree.find((r) => r.id === d.id).ancestorIds.join(",") ===
          [a.id, c.id].join(","),
        "initial ancestry",
      );
      check(tree.find((r) => r.id === d.id).depth === 2, "initial depth");
      check(tree.find((r) => r.id === d.id).version === 1, "new version");
      await reject(
        () => changeUnitParent(db, a.id, { version: 1, parentId: a.id }),
        422,
      );
      await reject(
        () => changeUnitParent(db, a.id, { version: 1, parentId: d.id }),
        422,
      );
      await reject(
        () => changeUnitParent(db, c.id, { version: 99, parentId: b.id }),
        409,
      );
      await reject(() => changeUnitParent(db, c.id, { version: 1 }), 422);
      await reject(
        () => createUnit(db, { name: prefix + "-bad", parentId: 4294967295 }),
        422,
      );
      await reject(() => deleteUnit(db, a.id, { version: 1 }), 409);
      check(
        (await changeUnitParent(db, c.id, { version: 1, parentId: b.id }))
          .changed,
        "subtree moved",
      );
      tree = unitTree(await listUnitRows(db));
      check(
        tree.find((r) => r.id === c.id).version === 2,
        "trigger increments version",
      );
      check(
        tree.find((r) => r.id === d.id).ancestorIds.join(",") ===
          [b.id, c.id].join(","),
        "descendants move through ancestry",
      );
      const [history] = await rows(
        db,
        "SELECT actor_id,payload FROM audit_log WHERE entity_type='units' AND entity_id=? AND action='history.update' ORDER BY id DESC LIMIT 1",
        [String(c.id)],
      );
      check(history.actor_id === admin.id, "history actor");
      const payload =
        typeof history.payload === "string"
          ? JSON.parse(history.payload)
          : history.payload;
      check(
        payload.before.parent_id === a.id && payload.after.parent_id === b.id,
        "before-after parent history",
      );
      check(payload.record_version === 2, "history version");
      const [eventCount] = await rows(db, "SELECT COUNT(*) n FROM audit_log");
      check(
        !(await changeUnitParent(db, c.id, { version: 2, parentId: b.id }))
          .changed,
        "no-op move",
      );
      const [afterNoop] = await rows(db, "SELECT COUNT(*) n FROM audit_log");
      check(afterNoop.n === eventCount.n, "no fabricated history for no-op");
      await changeUnitParent(db, c.id, { version: 2, parentId: null });
      tree = unitTree(await listUnitRows(db));
      check(
        tree.find((r) => r.id === d.id).ancestorIds.join(",") === String(c.id),
        "detach retains subtree",
      );
      check(tree.find((r) => r.id === c.id).version === 3, "detach version");
      await changeUnitParent(db, c.id, { version: 3, parentId: b.id });
      await reject(() => deleteUnit(db, c.id, { version: 4 }), 409);
      await reject(() => deleteUnit(db, d.id, { version: 99 }), 409);
      await deleteUnit(db, d.id, { version: 1 });
      const [deleted] = await rows(
        db,
        "SELECT deleted_at,version FROM units WHERE id=?",
        [d.id],
      );
      check(
        deleted.deleted_at !== null && deleted.version === 2,
        "leaf soft deletion and history trigger version",
      );
      await deleteUnit(db, c.id, { version: 4 });
      await deleteUnit(db, a.id, { version: 1 });
      await reject(
        () => renameUnit(db, b.id, { version: 1, name: prefix + "-A" }),
        409,
      );

      await reject(
        () =>
          createUnit(db, { name: prefix + "-deleted-parent", parentId: a.id }),
        422,
      );
      await rows(db, "UPDATE units SET used_ever=1 WHERE id=?", [b.id]);
      await reject(() => deleteUnit(db, b.id, { version: 2 }), 409);
      const [soft] = await rows(
        db,
        "SELECT COUNT(*) n FROM audit_log WHERE entity_type='units' AND entity_id IN (?,?,?) AND action='history.soft_delete' AND actor_id=?",
        [String(a.id), String(c.id), String(d.id), admin.id],
      );
      check(soft.n === 3, "all three deletions audited");
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  const [after] = await rows(pool, "SELECT COUNT(*) n FROM audit_log");
  check(after.n === before.n, "all probe history rolled back");
  check(
    JSON.stringify(await listUnitRows(pool)) === JSON.stringify(original),
    "original unit structure and versions preserved",
  );
  const [afterLinks] = await rows(
    pool,
    "SELECT (SELECT COUNT(*) FROM users) users_n,(SELECT COUNT(*) FROM transport_requests) requests_n",
  );
  check(
    afterLinks.users_n === beforeLinks.users_n &&
      afterLinks.requests_n === beforeLinks.requests_n,
    "fixture users and requests rolled back",
  );
  console.log(
    `Unit tree acceptance OK: ${checks} checks; all fixtures, tree changes and logs rolled back.`,
  );
  console.log(
    "No business data was committed. Auto-increment gaps are normal after rollback.",
  );
} catch (error) {
  console.error("Unit tree acceptance FAILED:", error.code || "CHECK_FAILED");
  console.error(
    "Keep the upgrade API stopped; send only this sanitized output.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
