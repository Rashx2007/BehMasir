import { fail, integer, text } from "./core.mjs";

// Reference data comes from the database, not a JavaScript enumeration.
export function vehicleTypeDTO(row) {
  return {
    id: Number(row.id),
    code: row.code,
    title: row.title,
    isActive: Number(row.is_active) === 1,
    version: Number(row.version),
    deletedAt: row.deleted_at ?? null,
  };
}

export async function listVehicleTypes(db) {
  const [list] = await db.execute(
    "SELECT id,code,title,is_active,version,deleted_at FROM vehicle_types ORDER BY id LIMIT 2001",
  );
  if (list.length > 2000)
    fail(413, "تعداد انواع خودرو بیش از حد این نسخه است؛ صفحه‌بندی لازم است.");
  // Retain labels for existing references to inactive/soft-deleted types.
  return list.map(vehicleTypeDTO);
}

export async function resolveVehicleType(
  db,
  bodyType,
  previousTypeId = null,
  requestedTypeId = undefined,
) {
  const code = text(bodyType, 24);
  if (!/^[a-z][a-z0-9_]{0,23}$/.test(code))
    fail(422, "کد نوع خودرو معتبر نیست.");
  const [list] = await db.execute(
    "SELECT id,code,title,is_active,version,deleted_at FROM vehicle_types WHERE code=? LOCK IN SHARE MODE",
    [code],
  );
  const row = list[0];
  if (!row) fail(422, "نوع خودرو در دیتابیس تعریف نشده است.");
  const type = vehicleTypeDTO(row);
  if (requestedTypeId !== undefined && integer(requestedTypeId) !== type.id)
    fail(409, "شناسه و کد نوع خودرو مطابقت ندارند؛ صفحه را تازه کنید.");
  if (
    (!type.isActive || type.deletedAt !== null) &&
    Number(previousTypeId) !== type.id
  )
    fail(422, "این نوع خودرو برای تخصیص جدید فعال نیست.");
  return type;
}

export async function assertVehicleTypesSchema(db) {
  const [list] = await db.execute(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  if (Number(list[0]?.version || 0) < 2)
    throw new Error(
      "این نسخهٔ بک‌اند به ساختار دیتابیس نسخهٔ ۲ یا بالاتر نیاز دارد؛ فعلاً فقط از دیتابیس آزمایشی ارتقایافته استفاده کنید.",
    );
  // A version number alone is not enough: verify the required columns too.
  await db.execute(
    "SELECT id,code,title,is_active,version,deleted_at FROM vehicle_types LIMIT 0",
  );
  await db.execute("SELECT vehicle_type_id FROM vehicles LIMIT 0");
}
