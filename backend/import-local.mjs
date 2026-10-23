// ورود یک‌بارهٔ خروجی schema3 به دیتابیس خالی، با بازنشانی همهٔ رمزها.
// اجرای واقعی فقط IMPORT_APPLY=YES؛ فایل ورودی هرگز حذف نمی‌شود.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { pool, rows, transaction, audit } from "./db.mjs";
import {
  text,
  integer,
  isoDate,
  hhmm,
  plateKey,
  passwordHash,
} from "./core.mjs";
try {
  if (!process.env.IMPORT_FILE) throw Error("IMPORT_FILE لازم است.");
  const d = JSON.parse(await readFile(process.env.IMPORT_FILE, "utf8"));
  if (
    d.schemaVersion !== 3 ||
    !["users", "vehicles", "centers", "samples"].every((k) =>
      Array.isArray(d[k]),
    )
  )
    throw Error("خروجی schemaVersion=3 لازم است.");
  const records = [...d.samples];
  const seen = new Set(
    records.filter((x) => x.status === "delivered").map((x) => x.id),
  );
  for (const h of d.history || [])
    if (!h.sampleId || !seen.has(h.sampleId)) {
      records.push({
        ...h,
        status: "delivered",
        progress: "delivered",
        id: null,
      });
      if (h.sampleId) seen.add(h.sampleId);
    }
  const owner = process.env.MIGRATION_OWNER_ID
    ? integer(process.env.MIGRATION_OWNER_ID)
    : null;
  if (!d.users.some((u) => u.active && u.role === "admin"))
    throw Error("مدیر فعال در دادهٔ ورودی وجود ندارد.");
  if (owner && !d.users.some((u) => u.id === owner))
    throw Error("مالک تعیین‌شده در فهرست کاربران نیست.");
  const missingOwners = records.filter(
    (r) => !d.users.some((u) => u.id === r.requesterUserId),
  ).length;
  const missingCars = records.filter(
    (r) => !d.vehicles.some((v) => v.id === r.carId),
  ).length;
  console.log(
    JSON.stringify(
      {
        users: d.users.length,
        vehicles: d.vehicles.length,
        centers: d.centers.length,
        requests: records.length,
        missingOwners,
        missingCars,
        apply: process.env.IMPORT_APPLY === "YES",
      },
      null,
      2,
    ),
  );
  if (missingOwners && !owner)
    throw Error(
      "برای سوابق بدون مالک، MIGRATION_OWNER_ID را آگاهانه تعیین کنید؛ نسبت‌دادن خودکار انجام نشد.",
    );
  if (missingCars)
    throw Error(
      "برخی سوابق خودروی حذف‌شده/نامشخص دارند؛ ابتدا نگاشت معتبر carId را در یک کپی خروجی اصلاح کنید.",
    );
  if (process.env.IMPORT_APPLY !== "YES") {
    console.log("فقط پیش‌بررسی؛ هیچ داده‌ای نوشته نشد.");
  } else {
    if (!process.env.PASSWORD_OUTPUT_FILE)
      throw Error("مسیر PASSWORD_OUTPUT_FILE خارج از public لازم است.");
    const credentials = [];
    const passwords = new Map();
    for (const u of d.users) {
      const pwd = randomBytes(18).toString("base64url");
      passwords.set(u.id, await passwordHash(pwd));
      credentials.push({ username: u.username, password: pwd });
    }
    // فایل حساس پیش از commit ساخته می‌شود تا موفقیت DB بدون دسترسی به رمزها رخ ندهد.
    await writeFile(
      process.env.PASSWORD_OUTPUT_FILE,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    await transaction(async (db) => {
      for (const t of [
        "users",
        "vehicles",
        "centers",
        "units",
        "transport_requests",
      ])
        if (Number((await rows(db, `SELECT COUNT(*) n FROM ${t}`))[0].n) !== 0)
          throw Error(
            "دیتابیس عملیاتی خالی نیست؛ ادغام یا بازنویسی انجام نشد.",
          );
      const unitNames = [
        ...new Set(
          [
            ...(d.units || []),
            ...(d.usedUnits || []),
            ...records.map((r) => r.unit),
            ...d.users.map((u) => u.unit),
          ].filter(Boolean),
        ),
      ];
      const unitMap = new Map();
      for (const n of unitNames) {
        const used =
          records.some((r) => r.unit === n) || (d.usedUnits || []).includes(n);
        const r = await rows(
          db,
          "INSERT INTO units(name,used_ever) VALUES (?,?)",
          [text(n), used ? 1 : 0],
        );
        unitMap.set(n, r.insertId);
      }
      const centers = new Map();
      for (const c of d.centers) {
        await rows(
          db,
          "INSERT INTO centers(id,name,lat,lng) VALUES (?,?,?,?)",
          [integer(c.id), text(c.name), c.lat ?? null, c.lng ?? null],
        );
        centers.set(c.name, c.id);
      }
      for (const name of new Set(
        records.flatMap((r) => [r.origin, r.destination]),
      ))
        if (!centers.has(name)) {
          const r = await rows(db, "INSERT INTO centers(name) VALUES (?)", [
            text(name),
          ]);
          centers.set(name, r.insertId);
        }
      for (const v of d.vehicles)
        await rows(
          db,
          "INSERT INTO vehicles(id,name,plate,plate_key,body_type,service_type,passenger_capacity,cargo_capacity,has_fridge,fridge_capacity,shift_start,shift_end,ownership,contractor_name,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            integer(v.id),
            text(v.name),
            text(v.plate, 40),
            plateKey(v.plate),
            v.bodyType,
            v.serviceType,
            v.passengerCapacity,
            v.cargoCapacity,
            v.hasFridge ? 1 : 0,
            v.fridgeCapacity,
            v.shiftStart,
            v.shiftEnd,
            v.ownership,
            v.contractorName || "",
            v.status,
          ],
        );
      for (const u of d.users) {
        if (!/^[a-z0-9_.-]{3,32}$/.test(u.username))
          throw Error("نام کاربری نامعتبر: " + u.id);
        await rows(
          db,
          "INSERT INTO users(id,username,name,role_code,password_hash,unit_id,active) VALUES (?,?,?,?,?,?,?)",
          [
            integer(u.id),
            u.username,
            text(u.name, 80),
            u.role,
            passwords.get(u.id),
            u.role === "requester" ? unitMap.get(u.unit) : null,
            u.active ? 1 : 0,
          ],
        );
        await rows(
          db,
          "INSERT INTO user_preferences(user_id,preferences) VALUES (?,?)",
          [u.id, JSON.stringify(u.preferences || {})],
        );
        for (const v of u.vehicleIds || [])
          await rows(db, "INSERT INTO user_vehicles VALUES (?,?)", [
            u.id,
            integer(v),
          ]);
      }
      // شناسه‌های جاری حفظ می‌شوند؛ سوابق قدیمی بدون شناسهٔ درخواست، شناسهٔ جدید می‌گیرند.
      const sorted = [
        ...records.filter((x) => x.id),
        ...records.filter((x) => !x.id),
      ];
      for (const s of sorted) {
        const v = d.vehicles.find((v) => v.id === s.carId),
          ownerId = d.users.some((u) => u.id === s.requesterUserId)
            ? s.requesterUserId
            : owner;
        const status =
          s.status === "delivered"
            ? "delivered"
            : s.progress === "enroute"
              ? "enroute"
              : "scheduled";
        const r = await rows(
          db,
          "INSERT INTO transport_requests(id,requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            s.id || null,
            ownerId,
            unitMap.get(s.unit),
            v.id,
            centers.get(s.origin),
            centers.get(s.destination),
            text(s.unit),
            s.origin,
            s.destination,
            s.carName || v.name,
            v.plate,
            isoDate(s.date),
            hhmm(s.time.slice(0, 5)),
            status,
          ],
        );
        // زمان واقعی نامعلوم تحویل جعل نمی‌شود؛ در تاریخچه service_date حفظ است.
        if (s.deliveredAt && Number.isFinite(Date.parse(s.deliveredAt)))
          await rows(
            db,
            "UPDATE transport_requests SET delivered_at=? WHERE id=?",
            [
              new Date(s.deliveredAt)
                .toISOString()
                .slice(0, 23)
                .replace("T", " "),
              r.insertId,
            ],
          );
        await rows(
          db,
          "INSERT INTO request_drivers(request_id,user_id) SELECT ?,uv.user_id FROM user_vehicles uv JOIN users u ON u.id=uv.user_id WHERE uv.vehicle_id=? AND u.role_code='driver'",
          [r.insertId, v.id],
        );
        await rows(
          db,
          "INSERT INTO request_events(request_id,actor_id,event_type,payload) VALUES (?,?,?,?)",
          [
            r.insertId,
            ownerId,
            "legacy_imported",
            JSON.stringify({
              legacyId: s.id || null,
              ownerMapped: ownerId !== s.requesterUserId,
            }),
          ],
        );
      }
      await audit(db, null, "migration.local_import", "migration", null, {
        requests: records.length,
        missingOwners,
      });
    });
    console.log(
      "ورود داده انجام شد. فایل رمزها حساس است؛ امن توزیع و پس از تحویل حذف شود.",
    );
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
