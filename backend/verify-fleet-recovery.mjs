// TEST ONLY. Temporary fixtures and all workflow probes roll back together.
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import {
  transactionWithHistory,
  setHistoryActor,
  assertHistorySchema,
} from "./history-context.mjs";
import {
  restoreVehicle,
  loadEmergencyPlan,
  applyEmergency,
} from "./fleet-recovery.mjs";
import { today } from "./core.mjs";
if (
  process.env.DB_NAME !== "behmasir_upgrade_verify" ||
  process.env.PORT !== "3002" ||
  process.env.APP_ORIGIN !== "https://localhost:8444" ||
  !["127.0.0.1", "localhost"].includes(process.env.DB_HOST)
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
  console.error("STOP: upgrade API must be stopped before acceptance probes.");
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
let checks = 0;
const check = (value, message) => {
  assert(value, message);
  checks++;
};
const stopped = new Error("ROLLBACK_FLEET_PROBES");
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
try {
  await assertHistorySchema(pool);
  const [initial] = await rows(pool, "SELECT COUNT(*) n FROM audit_log");
  try {
    await transactionWithHistory(pool, async (db) => {
      const [user] = await rows(
        db,
        "SELECT id,role_code,active,auth_version FROM users WHERE role_code='admin' AND active=1 ORDER BY id LIMIT 1",
      );
      check(Boolean(user), "admin fixture");
      await setHistoryActor(db, user.id);
      const prefix = "probe-" + randomUUID().slice(0, 12);
      const [type] = await rows(
        db,
        "SELECT id,code FROM vehicle_types WHERE is_active=1 AND deleted_at IS NULL AND code IN ('sedan','pickup_single','pickup_double','van','minibus','truck') ORDER BY id LIMIT 1",
      );
      check(Boolean(type), "active compatible reference type");
      const unit = await rows(db, "INSERT INTO units(name) VALUES (?)", [
        prefix + "-unit",
      ]);
      const origin = await rows(db, "INSERT INTO centers(name) VALUES (?)", [
        prefix + "-origin",
      ]);
      const destination = await rows(
        db,
        "INSERT INTO centers(name) VALUES (?)",
        [prefix + "-dest"],
      );
      async function driver(label, active) {
        return (
          await rows(
            db,
            "INSERT INTO users(username,name,role_code,password_hash,active) VALUES (?,?,?,?,?)",
            [
              prefix + "-" + label,
              prefix + "-" + label,
              "driver",
              "not-a-real-login-hash",
              active,
            ],
          )
        ).insertId;
      }
      const sourceDriver = await driver("source", 1),
        targetDriver = await driver("target", 1),
        inactiveDriver = await driver("inactive", 0);
      async function car(label) {
        return (
          await rows(
            db,
            `INSERT INTO vehicles(name,plate,plate_key,body_type,vehicle_type_id,service_type,passenger_capacity,cargo_capacity,has_fridge,fridge_capacity,ownership,contractor_name,status) VALUES (?,?,?,?,?,'both',5,10,1,5,'contractor',?,'ok')`,
            [
              prefix + "-" + label,
              prefix + "-" + label,
              prefix + "-" + label,
              type.code,
              type.id,
              prefix,
            ],
          )
        ).insertId;
      }
      const source = await car("source"),
        target = await car("target"),
        deleted = await car("deleted");
      for (const [userId, vehicleId] of [
        [sourceDriver, source],
        [targetDriver, target],
        [inactiveDriver, deleted],
      ])
        await rows(
          db,
          "INSERT INTO user_vehicles(user_id,vehicle_id) VALUES (?,?)",
          [userId, vehicleId],
        );
      await rows(
        db,
        "UPDATE vehicles SET deleted_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
        [deleted],
      );
      const [beforeRestore] = await rows(
        db,
        "SELECT version FROM vehicles WHERE id=?",
        [deleted],
      );
      await assert.rejects(
        restoreVehicle(db, { ...user, role_code: "dispatcher" }, deleted, {
          version: beforeRestore.version,
          reason: "آزمون بازیابی مجاز",
        }),
        (e) => e.status === 403,
      );
      checks++;
      await restoreVehicle(db, user, deleted, {
        version: beforeRestore.version,
        reason: "آزمون بازیابی مجاز",
      });
      const [restored] = await rows(
        db,
        "SELECT deleted_at,status,version FROM vehicles WHERE id=?",
        [deleted],
      );
      check(
        restored.deleted_at === null && restored.status === "maintenance",
        "restore must not make vehicle operational",
      );
      check(restored.version === beforeRestore.version + 1, "restore version");
      check(
        (
          await rows(
            db,
            "SELECT user_id FROM user_vehicles WHERE vehicle_id=?",
            [deleted],
          )
        ).length === 0,
        "old driver links cleared",
      );
      const [restoreLog] = await rows(
        db,
        "SELECT payload FROM audit_log WHERE entity_type='vehicles' AND entity_id=? AND action='history.restore' ORDER BY id DESC LIMIT 1",
        [String(deleted)],
      );
      check(Boolean(restoreLog), "restore trigger event");
      const future = new Date(today() + "T12:00:00Z");
      future.setUTCDate(future.getUTCDate() + 2);
      const day = future.toISOString().slice(0, 10);
      async function request(status, date) {
        return (
          await rows(
            db,
            `INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'09:00:00',?)`,
            [
              user.id,
              unit.insertId,
              source,
              origin.insertId,
              destination.insertId,
              prefix + "-unit",
              prefix + "-origin",
              prefix + "-dest",
              prefix + "-source",
              prefix + "-source",
              date,
              status,
            ],
          )
        ).insertId;
      }
      const scheduled = await request("scheduled", day),
        enroute = await request("enroute", today());
      await rows(
        db,
        "UPDATE transport_requests SET started_at=UTC_TIMESTAMP(3) WHERE id=?",
        [enroute],
      );
      for (const id of [scheduled, enroute])
        await rows(
          db,
          "INSERT INTO request_drivers(request_id,user_id) VALUES (?,?)",
          [id, sourceDriver],
        );
      const [sourceRow] = await rows(
        db,
        "SELECT version FROM vehicles WHERE id=?",
        [source],
      );
      const first = await loadEmergencyPlan(db, source, sourceRow.version);
      check(
        first.moves.length === 1 && first.moves[0].targetId === target,
        "preview target and move count",
      );
      check(
        first.blocked.length === 1 && first.blocked[0].requestId === enroute,
        "enroute blocked",
      );
      await rows(db, "UPDATE vehicles SET name=? WHERE id=?", [
        prefix + "-changed-target",
        target,
      ]);
      const key = randomUUID();
      const body = {
        version: sourceRow.version,
        fingerprint: first.fingerprint,
        reason: "آزمون خرابی خودروی مبدأ",
        acknowledged: true,
      };
      await assert.rejects(
        applyEmergency(db, user, source, body, key),
        (e) => e.status === 409,
      );
      checks++;
      const [untouched] = await rows(
        db,
        "SELECT vehicle_id FROM transport_requests WHERE id=?",
        [scheduled],
      );
      check(
        untouched.vehicle_id === source,
        "stale plan made no request changes",
      );
      const latest = await loadEmergencyPlan(db, source, sourceRow.version);
      body.fingerprint = latest.fingerprint;
      const result = await applyEmergency(db, user, source, body, key);
      check(result.moved === 1 && result.blocked.length === 1, "apply summary");
      const [sourceAfter] = await rows(
        db,
        "SELECT status,version FROM vehicles WHERE id=?",
        [source],
      );
      check(sourceAfter.status === "down", "source suspended");
      check(sourceAfter.version === sourceRow.version + 1, "source version");
      const [moved] = await rows(
        db,
        "SELECT vehicle_id,status,version FROM transport_requests WHERE id=?",
        [scheduled],
      );
      check(
        moved.vehicle_id === target &&
          moved.status === "scheduled" &&
          moved.version === 2,
        "scheduled move and version",
      );
      const [retained] = await rows(
        db,
        "SELECT vehicle_id,status FROM transport_requests WHERE id=?",
        [enroute],
      );
      check(
        retained.vehicle_id === source && retained.status === "enroute",
        "enroute retained",
      );
      const bound = await rows(
        db,
        "SELECT user_id FROM request_drivers WHERE request_id=?",
        [scheduled],
      );
      check(
        bound.length === 1 && bound[0].user_id === targetDriver,
        "destination driver assigned",
      );
      const events = await rows(
        db,
        "SELECT event_type FROM request_events WHERE request_id IN (?,?) ORDER BY id",
        [scheduled, enroute],
      );
      check(events.length === 2, "moved and blocked request events");
      const [auditCount] = await rows(db, "SELECT COUNT(*) n FROM audit_log");
      const replay = await applyEmergency(db, user, source, body, key);
      check(replay.moved === 1, "idempotent replay");
      const [replayCount] = await rows(db, "SELECT COUNT(*) n FROM audit_log");
      check(replayCount.n === auditCount.n, "replay does not add history");
      throw stopped;
    });
  } catch (error) {
    if (error !== stopped) throw error;
  }
  const [final] = await rows(pool, "SELECT COUNT(*) n FROM audit_log");
  check(final.n === initial.n, "all probes and history rolled back");
  console.log(
    `Fleet recovery/crisis acceptance OK: ${checks} checks; all fixtures and changes rolled back.`,
  );
  console.log(
    "No business data was committed. Auto-increment gaps after rollback are normal.",
  );
} catch (error) {
  console.error("Fleet acceptance FAILED:", error.code || "CHECK_FAILED");
  console.error(
    "Do not start the upgrade API yet; send only this sanitized output.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
