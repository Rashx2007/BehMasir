// Acceptance probes run ONLY on the isolated test database and ALL roll back.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  assertHistorySchema,
  setHistoryActor,
  transactionWithHistory,
} from "./history-context.mjs";

if (
  process.env.DB_NAME !== "behmasir_upgrade_verify" ||
  process.env.PORT !== "3002" ||
  process.env.APP_ORIGIN !== "https://localhost:8444" ||
  !["127.0.0.1", "localhost"].includes(process.env.DB_HOST)
) {
  console.error("STOP: isolated test configuration required.");
  process.exit(1);
}
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 1,
  multipleStatements: false,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: true,
});
const rollbackProbe = new Error("ROLLBACK_ACCEPTANCE_PROBE");
let checks = 0;
const check = (condition, message) => {
  assert(condition, message);
  checks++;
};
const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
try {
  await assertHistorySchema(pool);
  const [[initial]] = await pool.query("SELECT COUNT(*) AS n FROM audit_log");
  try {
    await transactionWithHistory(pool, async (db) => {
      const [[actor]] = await db.query(
        "SELECT id FROM users WHERE role_code='admin' AND active=1 ORDER BY id LIMIT 1",
      );
      check(Boolean(actor), "An active administrator is required.");
      await setHistoryActor(db, actor.id);
      for (const [table, key, column] of [
        ["users", "id", "name"],
        ["units", "id", "name"],
        ["centers", "id", "name"],
        ["vehicles", "id", "name"],
        ["vehicle_types", "id", "title"],
        ["roles", "code", "title"],
        ["transport_requests", "id", "unit_name"],
      ]) {
        const [[before]] = await db.query(
          `SELECT * FROM \`${table}\` ORDER BY \`${key}\` LIMIT 1`,
        );
        check(Boolean(before), `Missing fixture: ${table}`);
        const value = `HISTORY-PROBE-${randomUUID().slice(0, 12)}`;
        await db.execute(
          `UPDATE \`${table}\` SET \`${column}\`=? WHERE \`${key}\`=?`,
          [value, before[key]],
        );
        const [[after]] = await db.execute(
          `SELECT version,edited_at,created_at FROM \`${table}\` WHERE \`${key}\`=?`,
          [before[key]],
        );
        check(
          Number(after.version) === Number(before.version) + 1,
          `Version: ${table}`,
        );
        check(Boolean(after.edited_at), `Edit timestamp: ${table}`);
        check(
          after.created_at === before.created_at,
          `Creation time preserved: ${table}`,
        );
        const [[event]] = await db.execute(
          "SELECT actor_id,payload FROM audit_log WHERE entity_type=? AND entity_id=? AND action='history.update' ORDER BY id DESC LIMIT 1",
          [table, String(before[key])],
        );
        const payload = parse(event?.payload);
        check(event?.actor_id === actor.id, `Actor: ${table}`);
        check(payload?.before?.[column] === before[column], `Before: ${table}`);
        check(payload?.after?.[column] === value, `After: ${table}`);
        check(
          payload?.record_version === Number(after.version),
          `History version: ${table}`,
        );
        check(typeof payload?.change_id === "string", `Correlation: ${table}`);
        // Explicit no-op must not create an invented version.
        await db.execute(
          `UPDATE \`${table}\` SET \`${column}\`=? WHERE \`${key}\`=?`,
          [value, before[key]],
        );
        const [[noop]] = await db.execute(
          `SELECT version FROM \`${table}\` WHERE \`${key}\`=?`,
          [before[key]],
        );
        check(noop.version === after.version, `No-op: ${table}`);
        await assert.rejects(
          db.execute(`DELETE FROM \`${table}\` WHERE \`${key}\`=?`, [
            before[key],
          ]),
          (e) => e.code === "ER_SIGNAL_EXCEPTION",
        );
        checks++;
      }
      // Password changes are recorded as a boolean, never as plaintext or a hash.
      await db.execute("UPDATE users SET password_hash=? WHERE id=?", [
        "temporary-probe-value-rolled-back",
        actor.id,
      ]);
      const [[secretEvent]] = await db.execute(
        "SELECT payload FROM audit_log WHERE entity_type='users' AND entity_id=? AND action='history.update' ORDER BY id DESC LIMIT 1",
        [String(actor.id)],
      );
      const secret = parse(secretEvent.payload);
      check(Boolean(secret.password_changed), "Password change flag");
      check(
        !("password_hash" in secret.before) &&
          !("password_hash" in secret.after),
        "No password snapshots",
      );
      check(
        !JSON.stringify(secret).includes("temporary-probe-value"),
        "No temporary secret leakage",
      );
      const [[entry]] = await db.query(
        "SELECT id FROM audit_log ORDER BY id LIMIT 1",
      );
      for (const statement of [
        "UPDATE audit_log SET payload=payload WHERE id=?",
        "DELETE FROM audit_log WHERE id=?",
      ]) {
        await assert.rejects(
          db.execute(statement, [entry.id]),
          (e) => e.code === "ER_SIGNAL_EXCEPTION",
        );
        checks++;
      }
      throw rollbackProbe;
    });
  } catch (error) {
    if (error !== rollbackProbe) throw error;
  }
  const [[final]] = await pool.query("SELECT COUNT(*) AS n FROM audit_log");
  check(final.n === initial.n, "All probe audit entries must roll back");
  const [[context]] = await pool.query(
    "SELECT @behmasir_actor_id AS actor, @behmasir_change_id AS change_id",
  );
  check(
    context.actor === null && context.change_id === null,
    "Pooled identity cleared",
  );
  console.log(
    `History acceptance OK: ${checks} checks; all probes rolled back.`,
  );
  console.log(
    "No business data was committed. Auto-increment ID gaps are normal after rollback.",
  );
} catch (error) {
  console.error("History acceptance FAILED:", error.code || "CHECK_FAILED");
  console.error(
    "Do not start or commit the upgrade yet. Send only this sanitized output.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
