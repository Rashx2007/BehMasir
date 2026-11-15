// فقط برای دیتابیس تازه: خودروها، واحدها و مراکز؛ بدون سفر و رمز آزمایشی.
import { readFile } from "node:fs/promises";
import { pool, rows, transaction } from "./db.mjs";
import { plateKey } from "./core.mjs";
import {
  assertVehicleTypesSchema,
  resolveVehicleType,
} from "./vehicle-types.mjs";
try {
  await assertVehicleTypesSchema(pool);
  const seed = JSON.parse(
    await readFile(new URL("./catalog.json", import.meta.url), "utf8"),
  );
  await transaction(async (db) => {
    for (const t of ["vehicles", "centers", "units"])
      if ((await rows(db, `SELECT COUNT(*) n FROM ${t}`))[0].n > 0)
        throw Error("فهرست قبلاً داده دارد؛ ورود اولیه متوقف شد.");
    for (const n of seed.units)
      await rows(db, "INSERT INTO units(name) VALUES (?)", [n]);
    for (const c of seed.centers)
      await rows(db, "INSERT INTO centers(name,lat,lng) VALUES (?,?,?)", [
        c.name,
        c.lat,
        c.lng,
      ]);
    for (const v of seed.vehicles) {
      const type = await resolveVehicleType(db, v.bodyType);
      await rows(
        db,
        "INSERT INTO vehicles(name,plate,plate_key,body_type,service_type,passenger_capacity,cargo_capacity,has_fridge,fridge_capacity,shift_start,shift_end,ownership,contractor_name,status,vehicle_type_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          v.name,
          v.plate,
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
          v.contractorName,
          v.status,
          type.id,
        ],
      );
    }
  });
  console.log("فهرست پایه بدون حساب یا سفر آزمایشی ساخته شد.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
