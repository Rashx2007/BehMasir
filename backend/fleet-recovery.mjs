import { fail, hash, integer, text, today } from "./core.mjs";
import { resolveVehicleType } from "./vehicle-types.mjs";
import { buildEmergencyPlan } from "./emergency-plan.mjs";

const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
const manager = (u) => ["admin", "dispatcher"].includes(u?.role_code);
const reasonText = (value) => {
  const reason = text(value, 500);
  if ([...reason].length < 5) fail(422, "دلیل روشن، حداقل ۵ نویسه، وارد کنید.");
  return reason;
};
const checkVersion = (row, value) => {
  if (!row) fail(404, "خودرو پیدا نشد.");
  if (Number(row.version) !== integer(value))
    fail(409, "اطلاعات تغییر کرده؛ پیش‌نمایش یا فهرست را دوباره باز کنید.");
};
const recordAudit = (db, u, action, id, payload) =>
  rows(
    db,
    "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (?,?,?,?,?)",
    [u.id, action, "vehicles", String(id), JSON.stringify(payload)],
  );

export async function freshFleetUser(db, user, adminOnly = false) {
  const fresh = (
    await rows(
      db,
      "SELECT id,role_code,active,auth_version FROM users WHERE id=?",
      [user.id],
    )
  )[0];
  if (!fresh?.active || fresh.auth_version !== user.auth_version)
    fail(401, "نشست معتبر نیست.");
  if (!manager(fresh) || (adminOnly && fresh.role_code !== "admin"))
    fail(403, "اجازهٔ این عملیات را ندارید.");
  return fresh;
}

export async function deletedVehicles(db, user, before) {
  await freshFleetUser(db, user, true);
  const cursor = before == null ? 4294967296 : integer(before);
  const list = await rows(
    db,
    "SELECT id,name,plate,status,version,deleted_at FROM vehicles WHERE deleted_at IS NOT NULL AND id<? ORDER BY id DESC LIMIT 51",
    [cursor],
  );
  return {
    items: list.slice(0, 50).map((v) => ({
      id: v.id,
      name: v.name,
      plate: v.plate,
      status: v.status,
      version: v.version,
      deletedAt: v.deleted_at,
    })),
    cursor: list.length > 50 ? list[49].id : null,
  };
}

// Called only inside the existing authenticated, actor-bound mutation transaction.
export async function restoreVehicle(db, user, id, body) {
  if (user.role_code !== "admin")
    fail(403, "بازیابی خودرو فقط برای مدیر سیستم مجاز است.");
  const reason = reasonText(body.reason);
  const vehicle = (
    await rows(db, "SELECT * FROM vehicles WHERE id=? FOR UPDATE", [
      integer(id),
    ])
  )[0];
  checkVersion(vehicle, body.version);
  if (!vehicle.deleted_at)
    fail(409, "خودرو حذف‌شده نیست؛ فهرست را دوباره باز کنید.");
  const type = await resolveVehicleType(
    db,
    vehicle.body_type,
    null,
    vehicle.vehicle_type_id,
  );
  if (type.id !== vehicle.vehicle_type_id)
    fail(409, "رابطهٔ نوع خودرو معتبر نیست.");
  if (
    (
      await rows(
        db,
        "SELECT id FROM vehicles WHERE plate_key=? AND id<>? LIMIT 1 FOR UPDATE",
        [vehicle.plate_key, vehicle.id],
      )
    ).length
  )
    fail(409, "پلاک با رکورد دیگری تعارض دارد.");
  if (
    (
      await rows(
        db,
        "SELECT id FROM transport_requests WHERE vehicle_id=? AND status IN ('scheduled','enroute') LIMIT 1 FOR UPDATE",
        [vehicle.id],
      )
    ).length
  )
    fail(409, "خودروی حذف‌شده مأموریت باز دارد؛ ابتدا وابستگی آن بررسی شود.");
  const bindings = await rows(
    db,
    "SELECT user_id FROM user_vehicles WHERE vehicle_id=? FOR UPDATE",
    [vehicle.id],
  );
  // Old relationships remain in audit history, not automatically reactivated.
  await rows(db, "DELETE FROM user_vehicles WHERE vehicle_id=?", [vehicle.id]);
  await rows(
    db,
    "UPDATE vehicles SET deleted_at=NULL,status='maintenance',version=version+1 WHERE id=?",
    [vehicle.id],
  );
  await recordAudit(db, user, "vehicles.restore", vehicle.id, {
    reason,
    previousStatus: vehicle.status,
    newStatus: "maintenance",
    removedDriverBindings: bindings.map((b) => b.user_id),
  });
  return { ok: true, id: vehicle.id, status: "maintenance" };
}

export async function loadEmergencyPlan(db, id, version, lock = false) {
  const suffix = lock ? " FOR UPDATE" : "";
  const source = (
    await rows(db, "SELECT * FROM vehicles WHERE id=?" + suffix, [integer(id)])
  )[0];
  checkVersion(source, version);
  if (source.deleted_at) fail(404, "خودرو حذف شده است.");
  const open = await rows(
    db,
    "SELECT * FROM transport_requests WHERE vehicle_id=? AND status IN ('scheduled','enroute') ORDER BY service_date,service_time,id LIMIT 501" +
      suffix,
    [source.id],
  );
  if (open.length > 500)
    fail(413, "بیش از ۵۰۰ مأموریت باز است؛ رسیدگی دسته‌بندی‌شده لازم است.");
  const vehicles = await rows(
    db,
    "SELECT v.*,t.is_active type_active,t.deleted_at type_deleted_at FROM vehicles v JOIN vehicle_types t ON t.id=v.vehicle_type_id WHERE v.deleted_at IS NULL ORDER BY v.id LIMIT 2001" +
      suffix,
  );
  if (vehicles.length > 2000)
    fail(413, "تعداد خودروها از حد پیش‌نمایش این نسخه بیشتر است.");
  const drivers = await rows(
    db,
    "SELECT uv.vehicle_id,u.id,u.name,u.auth_version FROM user_vehicles uv JOIN users u ON u.id=uv.user_id WHERE u.active=1 AND u.role_code='driver' ORDER BY uv.vehicle_id,u.id LIMIT 20001" +
      suffix,
  );
  if (drivers.length > 20000)
    fail(413, "تعداد ارتباط رانندگان از حد این نسخه بیشتر است.");
  const dates = [...new Set(open.map((r) => r.service_date))].sort();
  const bookings = dates.length
    ? await rows(
        db,
        `SELECT r.id,r.vehicle_id,r.service_date,r.service_time,r.status,r.version,rd.user_id driver_id FROM transport_requests r LEFT JOIN request_drivers rd ON rd.request_id=r.id WHERE r.status<>'cancelled' AND r.service_date IN (${dates.map(() => "?").join(",")}) ORDER BY r.id,rd.user_id LIMIT 20001` +
          suffix,
        dates,
      )
    : [];
  if (bookings.length > 20000)
    fail(413, "حجم برنامهٔ روزانه از حد پیش‌نمایش این نسخه بیشتر است.");
  return buildEmergencyPlan(
    { source, open, vehicles, drivers, bookings },
    today(),
  );
}

// GET preview: a coherent read snapshot with no app revision or business writes.
export async function emergencyPreview(pool, user, id, version) {
  const db = await pool.getConnection();
  try {
    await db.query("SET time_zone='+00:00'");
    await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await db.beginTransaction();
    await freshFleetUser(db, user);
    const plan = await loadEmergencyPlan(db, id, version);
    await db.commit();
    return plan;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

// Everything, including driver changes, events, audit and idempotency response,
// commits together under the existing app_meta mutation lock.
export async function applyEmergency(db, user, id, body, operationKey) {
  if (!manager(user)) fail(403, "اجازهٔ مدیریت بحران ندارید.");
  id = integer(id);
  const reason = reasonText(body.reason);
  if (body.acknowledged !== true)
    fail(422, "محدودیت‌های انتقال را تأیید کنید.");
  if (
    typeof body.fingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(body.fingerprint)
  )
    fail(422, "ابتدا پیش‌نمایش معتبر دریافت کنید.");
  if (
    typeof operationKey !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      operationKey,
    )
  )
    fail(422, "شناسهٔ یکتای عملیات لازم است.");
  const digest = hash(
    JSON.stringify({
      kind: "emergency-v1",
      id,
      reason,
      fingerprint: body.fingerprint,
      version: integer(body.version),
      acknowledged: true,
    }),
  );
  const old = (
    await rows(
      db,
      "SELECT body_hash,response FROM idempotency_keys WHERE user_id=? AND request_key=?",
      [user.id, operationKey],
    )
  )[0];
  if (old) {
    if (old.body_hash !== digest)
      fail(409, "شناسهٔ عملیات برای دادهٔ دیگری استفاده شده است.");
    return typeof old.response === "string"
      ? JSON.parse(old.response)
      : old.response;
  }
  const plan = await loadEmergencyPlan(db, id, body.version, true);
  if (plan.fingerprint !== body.fingerprint)
    fail(
      409,
      "برنامهٔ خودروها یا رانندگان تغییر کرده؛ پیش‌نمایش را دوباره بگیرید.",
    );
  await rows(
    db,
    "UPDATE vehicles SET status='down',version=version+1 WHERE id=?",
    [id],
  );
  for (const move of plan.moves) {
    const changed = await rows(
      db,
      "UPDATE transport_requests SET vehicle_id=?,vehicle_name=?,plate=?,version=version+1 WHERE id=? AND status='scheduled'",
      [move.targetId, move.targetName, move.targetPlate, move.requestId],
    );
    if (changed.affectedRows !== 1)
      fail(409, "وضعیت مأموریت تغییر کرده است؛ انتقال ثبت نشد.");
    await rows(db, "DELETE FROM request_drivers WHERE request_id=?", [
      move.requestId,
    ]);
    for (const driver of move.drivers)
      await rows(
        db,
        "INSERT INTO request_drivers(request_id,user_id) VALUES (?,?)",
        [move.requestId, driver.id],
      );
    await rows(
      db,
      "INSERT INTO request_events(request_id,actor_id,event_type,payload) VALUES (?,?,?,?)",
      [
        move.requestId,
        user.id,
        "emergency_reassigned",
        JSON.stringify({
          reason,
          operationKey,
          from: id,
          to: move.targetId,
          previousDriverIds: move.previousDriverIds,
          driverIds: move.drivers.map((d) => d.id),
        }),
      ],
    );
  }
  for (const blocked of plan.blocked)
    await rows(
      db,
      "INSERT INTO request_events(request_id,actor_id,event_type,payload) VALUES (?,?,?,?)",
      [
        blocked.requestId,
        user.id,
        "emergency_not_moved",
        JSON.stringify({
          reason,
          operationKey,
          sourceId: id,
          code: blocked.code,
          explanation: blocked.reason,
        }),
      ],
    );
  const result = {
    ok: true,
    id,
    moved: plan.moves.length,
    total: plan.total,
    status: "down",
    blocked: plan.blocked.map((b) => ({
      requestId: b.requestId,
      code: b.code,
      reason: b.reason,
    })),
  };
  await recordAudit(db, user, "vehicles.emergency", id, {
    reason,
    operationKey,
    fingerprint: plan.fingerprint,
    previousStatus: plan.source.status,
    newStatus: "down",
    transfers: plan.moves.map((m) => ({
      requestId: m.requestId,
      to: m.targetId,
      driverIds: m.drivers.map((d) => d.id),
    })),
    blocked: result.blocked,
  });
  await rows(
    db,
    "INSERT INTO idempotency_keys(user_id,request_key,body_hash,response) VALUES (?,?,?,?)",
    [user.id, operationKey, digest, JSON.stringify(result)],
  );
  return result;
}
