import { restoreVehicle, applyEmergency } from "./fleet-recovery.mjs";
import { setHistoryActor } from "./history-context.mjs";
import { rows, transaction, audit, json, pool } from "./db.mjs";
import {
  fail,
  text,
  integer,
  choice,
  bool,
  isoDate,
  hhmm,
  today,
  withinShift,
  plateKey,
  passwordHash,
  preferences,
  hash,
} from "./core.mjs";
import { listVehicleTypes, resolveVehicleType } from "./vehicle-types.mjs";
export const manager = (u) => ["admin", "dispatcher"].includes(u.role_code);
const manage = (u) => {
  if (!manager(u)) fail(403, "اجازهٔ مدیریت این بخش را ندارید.");
};
const admin = (u) => {
  if (u.role_code !== "admin") fail(403, "این عملیات فقط برای مدیر سیستم است.");
};
const version = (row, b) => {
  if (!row) fail(404, "رکورد پیدا نشد.");
  if (row.version !== integer(b.version))
    fail(409, "اطلاعات تغییر کرده است؛ صفحه را تازه و دوباره بررسی کنید.");
};
export async function publicUser(db, u) {
  const vs = await rows(
    db,
    "SELECT vehicle_id FROM user_vehicles WHERE user_id=?",
    [u.id],
  );
  const pr = await rows(
    db,
    "SELECT preferences FROM user_preferences WHERE user_id=?",
    [u.id],
  );
  let p = pr[0]?.preferences || {};
  if (typeof p === "string") p = JSON.parse(p);
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role_code,
    active: !!u.active,
    unit: u.unit_name || null,
    vehicleIds: vs.map((x) => x.vehicle_id),
    preferences: preferences(p),
    authVersion: u.auth_version,
    version: u.version,
  };
}
export function vehicleDTO(v) {
  return {
    id: v.id,
    name: v.name,
    plate: v.plate,
    bodyType: v.body_type,
    vehicleTypeId: v.vehicle_type_id,
    serviceType: v.service_type,
    passengerCapacity: v.passenger_capacity,
    cargoCapacity: v.cargo_capacity,
    hasFridge: !!v.has_fridge,
    fridgeCapacity: v.fridge_capacity,
    shiftStart: v.shift_start?.slice(0, 5) || null,
    shiftEnd: v.shift_end?.slice(0, 5) || null,
    ownership: v.ownership,
    contractorName: v.contractor_name,
    status: v.status,
    version: v.version,
  };
}
export function requestDTO(r) {
  return {
    id: r.id,
    carId: r.vehicle_id,
    unit: r.unit_name,
    origin: r.origin_name,
    destination: r.destination_name,
    date: r.service_date,
    time: r.service_time.slice(0, 5),
    status:
      r.status === "delivered"
        ? "delivered"
        : r.status === "enroute"
          ? "active"
          : "pending",
    progress: r.status,
    requesterUserId: r.requester_user_id,
    startedAt: r.started_at,
    deliveredAt: r.delivered_at,
    carName: r.vehicle_name,
    plate: r.plate,
    version: r.version,
    sampleId: r.id,
  };
}
export function visibility(u, alias = "r") {
  if (manager(u)) return ["1=1", []];
  if (u.role_code === "requester")
    return [`${alias}.requester_user_id=?`, [u.id]];
  return [
    `EXISTS(SELECT 1 FROM request_drivers rd WHERE rd.request_id=${alias}.id AND rd.user_id=?)`,
    [u.id],
  ];
}
export async function snapshot(u) {
  const c = await pool.getConnection();
  try {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await c.beginTransaction();
    const [vis, args] = visibility(u);
    const vehicles =
      u.role_code === "driver"
        ? await rows(
            c,
            "SELECT v.* FROM vehicles v JOIN user_vehicles uv ON uv.vehicle_id=v.id WHERE v.deleted_at IS NULL AND uv.user_id=? ORDER BY v.id",
            [u.id],
          )
        : await rows(
            c,
            "SELECT * FROM vehicles WHERE deleted_at IS NULL ORDER BY id",
          );
    const vehicleTypes = await listVehicleTypes(c);
    const centers = await rows(
      c,
      "SELECT id,name,lat,lng,version FROM centers WHERE deleted_at IS NULL ORDER BY id",
    );
    const units = await rows(
      c,
      "SELECT id,name,parent_id,used_ever FROM units WHERE deleted_at IS NULL ORDER BY id",
    );
    const samples = await rows(
      c,
      `SELECT r.* FROM transport_requests r WHERE ${vis} AND r.status IN ('scheduled','enroute') ORDER BY r.id LIMIT 5001`,
      args,
    );
    if (samples.length > 5000)
      fail(
        413,
        "حجم درخواست‌های باز از ظرفیت این نسخه بیشتر است؛ صفحه‌بندی لازم است.",
      );
    const delivered = await rows(
      c,
      `SELECT r.* FROM transport_requests r WHERE ${vis} AND r.status='delivered' ORDER BY r.id DESC LIMIT 201`,
      args,
    );
    const deliveredToday = await rows(
      c,
      `SELECT r.* FROM transport_requests r WHERE ${vis} AND r.status='delivered' AND r.service_date=? ORDER BY r.id LIMIT 5001`,
      [...args, today()],
    );
    if (deliveredToday.length > 5000)
      fail(
        413,
        "حجم روزانه بیشتر از حد این نسخه است؛ صفحه‌بندی روزانه لازم است.",
      );
    const sampleMap = new Map(
      [...samples, ...delivered.slice(0, 200), ...deliveredToday].map((r) => [
        r.id,
        r,
      ]),
    );
    const dashboard = manager(u) ? await dashboardData(c) : null;
    const list =
      manager(u) && u.role_code === "admin"
        ? await rows(
            c,
            "SELECT u.*,x.name unit_name FROM users u LEFT JOIN units x ON x.id=u.unit_id ORDER BY u.id",
          )
        : [u];
    const users = [];
    for (const a of list) users.push(await publicUser(c, a));
    const usage = await rows(
      c,
      "SELECT vehicle_id carId,service_date date,COUNT(*) used FROM transport_requests WHERE status<>'cancelled' AND service_date>=CURRENT_DATE() GROUP BY vehicle_id,service_date",
    );
    const revision = (
      await rows(c, "SELECT revision FROM app_meta WHERE id=1")
    )[0].revision;
    await c.commit();
    return {
      revision,
      vehicles: vehicles.map(vehicleDTO),
      vehicleTypes,
      centers: centers.map((x) => ({
        ...x,
        lat: x.lat === null ? null : Number(x.lat),
        lng: x.lng === null ? null : Number(x.lng),
      })),
      units: units.map((x) => x.name),
      unitRecords: units.map((x) => ({
        id: x.id,
        name: x.name,
        parentId: x.parent_id,
      })),
      usedUnits: units.filter((x) => x.used_ever).map((x) => x.name),
      dashboard,
      samples: [...sampleMap.values()].map(requestDTO),
      history: delivered.slice(0, 200).map(requestDTO),
      historyCursor: delivered.length > 200 ? delivered[199].id : null,
      users,
      currentUser: users.find((x) => x.id === u.id),
      capacityUsage: usage.map((x) => ({ ...x, used: Number(x.used) })),
    };
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function historyPage(u, before) {
  const [vis, args] = visibility(u);
  const id = integer(before);
  const list = await rows(
    pool,
    `SELECT r.* FROM transport_requests r WHERE ${vis} AND r.status='delivered' AND r.id<? ORDER BY r.id DESC LIMIT 201`,
    [...args, id],
  );
  return {
    items: list.slice(0, 200).map(requestDTO),
    cursor: list.length > 200 ? list[199].id : null,
  };
}
async function available(db, vehicleId, date, time, except = 0) {
  const v = (
    await rows(
      db,
      "SELECT * FROM vehicles WHERE id=? AND deleted_at IS NULL FOR UPDATE",
      [integer(vehicleId)],
    )
  )[0];
  if (
    !v ||
    v.status !== "ok" ||
    !withinShift(v, time) ||
    v.cargo_capacity === 0
  )
    fail(409, "خودرو در شیفت یا وضعیت مناسب نیست.");
  const n = (
    await rows(
      db,
      "SELECT COUNT(*) n FROM transport_requests WHERE vehicle_id=? AND service_date=? AND status<>'cancelled' AND id<>?",
      [v.id, date, except],
    )
  )[0].n;
  if (Number(n) >= v.cargo_capacity)
    fail(409, "ظرفیت روزانهٔ خودرو تکمیل شده است.");
  return v;
}
async function event(db, u, id, kind, payload = {}) {
  await rows(
    db,
    "INSERT INTO request_events(request_id,actor_id,event_type,payload) VALUES (?,?,?,?)",
    [id, u.id, kind, json(payload)],
  );
}
async function bindDrivers(db, id, carId) {
  await rows(db, "DELETE FROM request_drivers WHERE request_id=?", [id]);
  await rows(
    db,
    "INSERT INTO request_drivers(request_id,user_id) SELECT ?,uv.user_id FROM user_vehicles uv JOIN users u ON u.id=uv.user_id WHERE uv.vehicle_id=? AND u.active=1 AND u.role_code='driver'",
    [id, carId],
  );
}
async function resource(db, table, id) {
  return (
    await rows(db, `SELECT * FROM ${table} WHERE id=?`, [integer(id)])
  )[0];
}
async function requestAllowed(db, u, r) {
  if (manager(u) || r.requester_user_id === u.id) return true;
  return (
    (
      await rows(
        db,
        "SELECT 1 FROM request_drivers WHERE request_id=? AND user_id=?",
        [r.id, u.id],
      )
    ).length > 0
  );
}
export async function mutate(u, method, path, b, key) {
  return transaction(async (db) => {
    // مجوز در همان تراکنش دوباره بررسی می‌شود؛ نقش ارسال‌شده از مرورگر قابل اعتماد نیست.
    const fresh = (
      await rows(
        db,
        "SELECT u.*,x.name unit_name FROM users u LEFT JOIN units x ON x.id=u.unit_id WHERE u.id=?",
        [u.id],
      )
    )[0];
    if (!fresh?.active || fresh.auth_version !== u.auth_version)
      fail(401, "نشست معتبر نیست.");
    u = fresh;
    await setHistoryActor(db, u.id);
    let response = { ok: true };
    const parts = path.split("/").filter(Boolean),
      kind = parts[0],
      id = parts[1],
      action = parts[2];
    if (method === "POST" && kind === "requests" && !id) {
      if (!["admin", "dispatcher", "requester"].includes(u.role_code))
        fail(403, "امکان ثبت درخواست ندارید.");
      if (typeof key !== "string" || !/^[0-9a-f-]{36}$/.test(key))
        fail(422, "شناسهٔ یکتای عملیات لازم است.");
      const bodyHash = hash(json(b));
      const old = (
        await rows(
          db,
          "SELECT * FROM idempotency_keys WHERE user_id=? AND request_key=?",
          [u.id, key],
        )
      )[0];
      if (old) {
        if (old.body_hash !== bodyHash)
          fail(409, "شناسهٔ عملیات برای دادهٔ دیگری استفاده شده است.");
        return typeof old.response === "string"
          ? JSON.parse(old.response)
          : old.response;
      }
      const date = isoDate(b.date),
        time = hhmm(b.time);
      if (date < today()) fail(422, "ثبت درخواست برای روز گذشته مجاز نیست.");
      const unitName = u.role_code === "requester" ? u.unit_name : text(b.unit);
      const un = (
        await rows(
          db,
          "SELECT * FROM units WHERE name=? AND deleted_at IS NULL",
          [unitName],
        )
      )[0];
      if (!un) fail(422, "ابتدا واحد را تعریف کنید.");
      const origin = (
          await rows(
            db,
            "SELECT * FROM centers WHERE name=? AND deleted_at IS NULL",
            [text(b.origin)],
          )
        )[0],
        destination = (
          await rows(
            db,
            "SELECT * FROM centers WHERE name=? AND deleted_at IS NULL",
            [text(b.destination)],
          )
        )[0];
      if (!origin || !destination || origin.id === destination.id)
        fail(422, "مبدأ و مقصد معتبر نیستند.");
      const v = await available(db, b.carId, date, time);
      const r = await rows(
        db,
        "INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          u.id,
          un.id,
          v.id,
          origin.id,
          destination.id,
          un.name,
          origin.name,
          destination.name,
          v.name,
          v.plate,
          date,
          time,
        ],
      );
      await rows(db, "UPDATE units SET used_ever=1 WHERE id=?", [un.id]);
      await bindDrivers(db, r.insertId, v.id);
      await event(db, u, r.insertId, "created");
      response = { ok: true, id: r.insertId };
      await rows(
        db,
        "INSERT INTO idempotency_keys(user_id,request_key,body_hash,response) VALUES (?,?,?,?)",
        [u.id, key, bodyHash, json(response)],
      );
      await audit(db, u, "request.created", "request", r.insertId);
      return response;
    }
    if (kind === "requests" && id) {
      const r = await resource(db, "transport_requests", id);
      version(r, b);
      if (!(await requestAllowed(db, u, r)))
        fail(403, "اجازهٔ مشاهده یا تغییر این درخواست را ندارید.");
      if (method === "DELETE" && !action) {
        if (["cancelled", "delivered"].includes(r.status))
          fail(
            409,
            "درخواست لغوشده یا تحویل‌شده قابل حذف نیست؛ سابقه حفظ می‌شود.",
          );
        if (
          !manager(u) &&
          (u.role_code !== "requester" ||
            r.requester_user_id !== u.id ||
            r.status !== "scheduled")
        )
          fail(403, "این درخواست قابل حذف نیست.");
        await rows(
          db,
          "UPDATE transport_requests SET status='cancelled',cancelled_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
          [r.id],
        );
        await event(db, u, r.id, "cancelled");
      } else if (method === "POST" && action === "start") {
        if (
          u.role_code !== "driver" ||
          r.status !== "scheduled" ||
          r.service_date > today()
        )
          fail(403, "مأموریت اکنون قابل شروع نیست.");
        await rows(
          db,
          "UPDATE transport_requests SET status='enroute',started_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
          [r.id],
        );
        await event(db, u, r.id, "started");
      } else if (method === "POST" && action === "deliver") {
        if (
          !manager(u) &&
          (u.role_code !== "driver" ||
            r.status !== "enroute" ||
            r.service_date > today())
        )
          fail(403, "ثبت تحویل مجاز نیست.");
        if (!["scheduled", "enroute"].includes(r.status))
          fail(409, "مأموریت باز نیست.");
        await rows(
          db,
          "UPDATE transport_requests SET status='delivered',delivered_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
          [r.id],
        );
        await event(db, u, r.id, "delivered");
      } else if (method === "POST" && action === "reassign") {
        manage(u);
        if (!["scheduled", "enroute"].includes(r.status))
          fail(409, "درخواست باز نیست.");
        const v = await available(
          db,
          b.carId,
          r.service_date,
          r.service_time.slice(0, 5),
          r.id,
        );
        await rows(
          db,
          "UPDATE transport_requests SET vehicle_id=?,vehicle_name=?,plate=?,version=version+1 WHERE id=?",
          [v.id, v.name, v.plate, r.id],
        );
        await bindDrivers(db, r.id, v.id);
        await event(db, u, r.id, "reassigned", {
          from: r.vehicle_id,
          to: v.id,
        });
      } else fail(404, "عملیات پیدا نشد.");
      await audit(db, u, `request.${action || "cancelled"}`, "request", r.id);
      return response;
    }
    if (kind === "preferences" && method === "PUT") {
      await rows(
        db,
        "INSERT INTO user_preferences(user_id,preferences) VALUES (?,?) ON DUPLICATE KEY UPDATE preferences=VALUES(preferences)",
        [u.id, json(preferences(b))],
      );
      return response;
    }
    if (kind === "units") {
      manage(u);
      if (method === "POST" && !id) {
        const r = await rows(db, "INSERT INTO units(name) VALUES (?)", [
          text(b.name),
        ]);
        response.id = r.insertId;
      } else if (method === "DELETE" && id) {
        const r = await resource(db, "units", id);
        if (!r || r.deleted_at) fail(404, "واحد پیدا نشد.");
        if (
          r.used_ever ||
          (
            await rows(db, "SELECT id FROM users WHERE unit_id=? LIMIT 1", [
              r.id,
            ])
          ).length
        )
          fail(409, "واحد دارای سابقه یا کاربر است.");
        await rows(
          db,
          "UPDATE units SET deleted_at=UTC_TIMESTAMP(3) WHERE id=?",
          [r.id],
        );
      } else fail(404, "عملیات نامعتبر است.");
    } else if (kind === "centers") {
      manage(u);
      if (method === "DELETE" && id) {
        const r = await resource(db, "centers", id);
        version(r, b);
        if (
          (
            await rows(
              db,
              "SELECT id FROM transport_requests WHERE (origin_id=? OR destination_id=?) AND status IN ('scheduled','enroute') LIMIT 1",
              [r.id, r.id],
            )
          ).length
        )
          fail(409, "مرکز در مأموریت باز استفاده می‌شود.");
        await rows(
          db,
          "UPDATE centers SET deleted_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
          [r.id],
        );
      } else if ((method === "POST" && !id) || (method === "PUT" && id)) {
        const name = text(b.name);
        if (id) {
          const r = await resource(db, "centers", id);
          version(r, b);
          if (r.deleted_at) fail(409, "مرکز حذف شده است.");
          await rows(
            db,
            "UPDATE centers SET name=?,version=version+1 WHERE id=?",
            [name, r.id],
          );
        } else {
          const lat = b.lat ?? null,
            lng = b.lng ?? null;
          if (
            (lat === null) !== (lng === null) ||
            (lat !== null &&
              (!Number.isFinite(lat) ||
                !Number.isFinite(lng) ||
                Math.abs(lat) > 90 ||
                Math.abs(lng) > 180))
          )
            fail(422, "مختصات معتبر نیست.");
          const r = await rows(
            db,
            "INSERT INTO centers(name,lat,lng) VALUES (?,?,?)",
            [name, lat, lng],
          );
          response.id = r.insertId;
        }
      } else fail(404, "عملیات نامعتبر است.");
    } else if (kind === "vehicles") {
      manage(u);
      if (action === "restore" && method === "POST" && parts.length === 3) {
        return restoreVehicle(db, u, id, b);
      } else if (
        action === "emergency" &&
        method === "POST" &&
        parts.length === 3
      ) {
        return applyEmergency(db, u, id, b, key);
      } else if (method === "DELETE" && id) {
        const v = await resource(db, "vehicles", id);
        version(v, b);
        if (
          (
            await rows(
              db,
              "SELECT id FROM transport_requests WHERE vehicle_id=? AND status IN ('scheduled','enroute') LIMIT 1",
              [v.id],
            )
          ).length ||
          (
            await rows(
              db,
              "SELECT u.id FROM user_vehicles uv JOIN users u ON u.id=uv.user_id WHERE uv.vehicle_id=? AND u.active=1 AND u.role_code='driver' LIMIT 1",
              [v.id],
            )
          ).length
        )
          fail(409, "خودرو مأموریت باز یا رانندهٔ فعال دارد.");
        await rows(
          db,
          "UPDATE vehicles SET deleted_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",
          [v.id],
        );
      } else if ((method === "POST" && !id) || (method === "PUT" && id)) {
        let previousVehicle = null;
        if (id) {
          const v = await resource(db, "vehicles", id);
          previousVehicle = v;
          version(v, b);
          if (
            v.deleted_at ||
            (
              await rows(
                db,
                "SELECT id FROM transport_requests WHERE vehicle_id=? AND status IN ('scheduled','enroute') LIMIT 1",
                [v.id],
              )
            ).length
          )
            fail(409, "خودرو حذف شده یا مأموریت باز دارد.");
        }
        const selectedType = await resolveVehicleType(
          db,
          b.bodyType,
          previousVehicle?.vehicle_type_id,
          b.vehicleTypeId,
        );
        const data = [
          text(b.name),
          text(b.plate, 40),
          plateKey(b.plate),
          selectedType.code,
          choice(b.serviceType, ["passenger", "cargo", "both"]),
          integer(b.passengerCapacity, 0, 1000),
          integer(b.cargoCapacity, 0, 10000),
          bool(b.hasFridge) ? 1 : 0,
          integer(b.fridgeCapacity, 0, 10000),
          b.shiftStart === null ? null : hhmm(b.shiftStart),
          b.shiftEnd === null ? null : hhmm(b.shiftEnd),
          choice(b.ownership, ["org", "contractor"]),
          b.ownership === "contractor" ? text(b.contractorName, 150) : "",
          choice(b.status, ["ok", "down", "maintenance"]),
          selectedType.id,
        ];
        if (
          (data[9] === null) !== (data[10] === null) ||
          (data[9] !== null && data[9] === data[10]) ||
          data[8] > data[6] ||
          (!data[7] && data[8])
        )
          fail(422, "ظرفیت یا شیفت خودرو معتبر نیست.");
        const cols = [
          "name",
          "plate",
          "plate_key",
          "body_type",
          "service_type",
          "passenger_capacity",
          "cargo_capacity",
          "has_fridge",
          "fridge_capacity",
          "shift_start",
          "shift_end",
          "ownership",
          "contractor_name",
          "status",
          "vehicle_type_id",
        ];
        if (id)
          await rows(
            db,
            `UPDATE vehicles SET ${cols.map((x) => x + "=?").join(",")},version=version+1 WHERE id=?`,
            [...data, integer(id)],
          );
        else {
          const r = await rows(
            db,
            `INSERT INTO vehicles(${cols.join(",")}) VALUES (${data.map(() => "?").join(",")})`,
            data,
          );
          response.id = r.insertId;
        }
      } else fail(404, "عملیات نامعتبر است.");
    } else if (kind === "users") {
      admin(u);
      if (!((method === "POST" && !id) || (method === "PUT" && id)))
        fail(404, "عملیات نامعتبر است.");
      let prev = null;
      if (id) {
        prev = await resource(db, "users", id);
        version(prev, b);
      }
      const name = text(b.name, 80),
        username = text(b.username, 32).toLowerCase();
      if (!/^[a-z0-9_.-]{3,32}$/.test(username))
        fail(422, "نام کاربری معتبر نیست.");
      const role = choice(b.role, [
          "admin",
          "dispatcher",
          "requester",
          "driver",
        ]),
        active = bool(b.active);
      if (Number(id) === u.id && (!active || role !== "admin"))
        fail(409, "نقش مدیریتی حساب فعلی باید حفظ شود.");
      if (
        prev?.role_code === "admin" &&
        (!active || role !== "admin") &&
        (
          await rows(
            db,
            "SELECT id FROM users WHERE active=1 AND role_code='admin' AND id<>?",
            [prev.id],
          )
        ).length === 0
      )
        fail(409, "آخرین مدیر فعال باید حفظ شود.");
      let unitId = null;
      if (role === "requester") {
        const unit = (
          await rows(
            db,
            "SELECT id FROM units WHERE name=? AND deleted_at IS NULL",
            [text(b.unit)],
          )
        )[0];
        if (!unit) fail(422, "واحد معتبر نیست.");
        unitId = unit.id;
      }
      const ids =
        role === "driver"
          ? Array.from(
              new Set(
                (Array.isArray(b.vehicleIds) ? b.vehicleIds : []).map((x) =>
                  integer(x),
                ),
              ),
            )
          : [];
      if (role === "driver" && ids.length === 0)
        fail(422, "حداقل یک خودرو انتخاب کنید.");
      if (ids.length > 100) fail(422, "تعداد خودرو زیاد است.");
      for (const v of ids)
        if (
          !(
            await rows(
              db,
              "SELECT id FROM vehicles WHERE id=? AND deleted_at IS NULL",
              [v],
            )
          ).length
        )
          fail(422, "خودرو معتبر نیست.");
      const ph = b.password
        ? await passwordHash(b.password)
        : prev?.password_hash;
      if (!ph) fail(422, "رمز اولیه لازم است.");
      let userId = prev?.id;
      if (prev)
        await rows(
          db,
          "UPDATE users SET name=?,username=?,role_code=?,unit_id=?,active=?,password_hash=?,version=version+1,auth_version=auth_version+1 WHERE id=?",
          [name, username, role, unitId, active ? 1 : 0, ph, userId],
        );
      else {
        const r = await rows(
          db,
          "INSERT INTO users(name,username,role_code,unit_id,active,password_hash) VALUES (?,?,?,?,?,?)",
          [name, username, role, unitId, active ? 1 : 0, ph],
        );
        userId = r.insertId;
      }
      await rows(db, "DELETE FROM user_vehicles WHERE user_id=?", [userId]);
      for (const v of ids)
        await rows(db, "INSERT INTO user_vehicles VALUES (?,?)", [userId, v]);
      // سوابق تحویل‌شده راننده حفظ می‌شود؛ مأموریت باز با تخصیص جدید تطبیق داده می‌شود.
      await rows(
        db,
        "DELETE rd FROM request_drivers rd JOIN transport_requests r ON r.id=rd.request_id WHERE rd.user_id=? AND r.status IN ('scheduled','enroute')",
        [userId],
      );
      if (active && role === "driver")
        await rows(
          db,
          "INSERT IGNORE INTO request_drivers(request_id,user_id) SELECT r.id,? FROM transport_requests r JOIN user_vehicles uv ON uv.vehicle_id=r.vehicle_id WHERE uv.user_id=? AND r.status IN ('scheduled','enroute')",
          [userId, userId],
        );
      response.id = userId;
    } else fail(404, "مسیر پیدا نشد.");
    await audit(
      db,
      u,
      `${kind}.${method.toLowerCase()}`,
      kind,
      id ? integer(id) : response.id || null,
      action ? { action } : {},
    );
    return response;
  });
}

async function dashboardData(db) {
  const now = today();
  const minus = (i) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() - i * 86400000));
  const predicate =
      "((r.status='delivered' AND r.service_date BETWEEN ? AND ?) OR (r.status IN ('scheduled','enroute') AND r.service_date=?))",
    args = [minus(6), now, now];
  const topVehicles = await rows(
    db,
    `SELECT v.name label,COUNT(*) value FROM transport_requests r JOIN vehicles v ON v.id=r.vehicle_id WHERE ${predicate} AND v.status='ok' AND v.deleted_at IS NULL GROUP BY v.id,v.name ORDER BY value DESC,v.id LIMIT 5`,
    args,
  );
  const topUnits = await rows(
    db,
    `SELECT r.unit_name label,COUNT(*) value FROM transport_requests r WHERE ${predicate} GROUP BY r.unit_name ORDER BY value DESC,label LIMIT 5`,
    args,
  );
  const topCenters = await rows(
    db,
    `SELECT label,COUNT(*) value FROM (SELECT r.origin_name label FROM transport_requests r WHERE ${predicate} UNION ALL SELECT r.destination_name label FROM transport_requests r WHERE ${predicate}) t GROUP BY label ORDER BY value DESC,label LIMIT 5`,
    [...args, ...args],
  );
  const counts = await rows(
    db,
    "SELECT service_date date,COUNT(*) value FROM transport_requests WHERE status='delivered' AND service_date BETWEEN ? AND ? GROUP BY service_date",
    [minus(4), now],
  );
  const days = Array.from({ length: 5 }, (_, i) => ({
    date: minus(4 - i),
    value: Number(counts.find((x) => x.date === minus(4 - i))?.value || 0),
  }));
  return {
    topVehicles: topVehicles.map((x) => ({ ...x, value: Number(x.value) })),
    topUnits: topUnits.map((x) => ({ ...x, value: Number(x.value) })),
    topCenters: topCenters.map((x) => ({ ...x, value: Number(x.value) })),
    days,
    recentTotal: days.reduce((a, d) => a + d.value, 0),
  };
}
