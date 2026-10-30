// Read-only scoped access foundation. HTTP enforcement is NOT enabled by this module alone.
import { fail, integer } from "./core.mjs";
import { listUnitRows, unitTree } from "./unit-tree.mjs";
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
export const UNIT_READ_ROLE = "unit_manager";
export const UNIT_READ_PERMISSIONS = Object.freeze([
  "requests.read",
  "reports.read",
]);
export const MAX_UNIT_ASSIGNMENTS = 100;
export function evaluateUnitAccess(records, assignments, codes) {
  const tree = unitTree(records),
    ids = new Set(tree.map((r) => r.id)),
    allowed = new Set();
  if (assignments.length > MAX_UNIT_ASSIGNMENTS)
    fail(413, "تعداد محدوده‌های کاربر بیش از ظرفیت این مرحله است.");
  for (const a of assignments) {
    if (a.active === 0 || a.active === false) continue;
    if (
      ![1, true].includes(a.active) ||
      !Number.isSafeInteger(a.unit_id) ||
      ![0, 1, false, true].includes(a.include_descendants)
    )
      fail(409, "تعریف محدودهٔ کاربر معتبر نیست.");
    if (!ids.has(a.unit_id))
      fail(
        409,
        "واحدِ محدودهٔ دسترسی حذف شده یا موجود نیست؛ بررسی مدیریتی لازم است.",
      );
    allowed.add(a.unit_id);
    if (a.include_descendants === 1 || a.include_descendants === true)
      for (const r of tree)
        if (r.ancestorIds.includes(a.unit_id)) allowed.add(r.id);
  }
  const permissions = UNIT_READ_PERMISSIONS.filter((p) => codes.includes(p));
  return {
    permissions,
    unitIds: permissions.length ? [...allowed].sort((a, b) => a - b) : [],
  };
}
export function unitScopePredicate(access, permission, alias = "r") {
  if (!/^[a-z][a-z0-9_]{0,15}$/i.test(alias))
    fail(422, "نام مستعار پرس‌وجو معتبر نیست.");
  if (
    !UNIT_READ_PERMISSIONS.includes(permission) ||
    !access.permissions.includes(permission) ||
    !access.unitIds.length
  )
    return ["0=1", []];
  if (
    access.unitIds.length > 2000 ||
    access.unitIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    fail(409, "شناسهٔ محدوده معتبر نیست.");
  return [
    `${alias}.unit_id IN (${access.unitIds.map(() => "?").join(",")})`,
    [...access.unitIds],
  ];
}
export async function resolveUnitAccess(db, userId, expectedAuthVersion) {
  const id = integer(userId);
  const [u] = await rows(
    db,
    "SELECT id,role_code,active,auth_version FROM users WHERE id=?",
    [id],
  );
  if (
    !u ||
    Number(u.active) !== 1 ||
    u.auth_version !== integer(expectedAuthVersion)
  )
    fail(401, "نشست معتبر نیست.");
  if (u.role_code !== UNIT_READ_ROLE)
    fail(403, "این نقش در سازوکار مشاهدهٔ واحدی این مرحله پشتیبانی نمی‌شود.");
  const assignments = await rows(
    db,
    "SELECT unit_id,include_descendants,active FROM unit_role_assignments WHERE user_id=? AND role_code=? AND active=1 ORDER BY unit_id LIMIT 101",
    [id, UNIT_READ_ROLE],
  );
  const grants = await rows(
    db,
    "SELECT rp.permission_code FROM access_role_permissions rp JOIN access_permissions p ON p.code=rp.permission_code WHERE rp.role_code=? AND p.is_active=1 ORDER BY rp.permission_code LIMIT 101",
    [UNIT_READ_ROLE],
  );
  if (grants.length > 100)
    fail(413, "تعداد مجوزهای نقش بیش از ظرفیت این مرحله است.");
  return evaluateUnitAccess(
    await listUnitRows(db),
    assignments,
    grants.map((r) => r.permission_code),
  );
}
export async function assertUnitAccessSchema(db) {
  const [v] = await rows(
    db,
    "SELECT MAX(version) version FROM schema_migrations",
  );
  if (!Number.isFinite(Number(v.version)) || Number(v.version) < 4)
    throw Error("UNIT_ACCESS_SCHEMA_4_REQUIRED");
  await db.execute(
    "SELECT code,title,is_active,version,created_at,edited_at FROM access_permissions LIMIT 0",
  );
  await db.execute(
    "SELECT role_code,permission_code,created_at FROM access_role_permissions LIMIT 0",
  );
  await db.execute(
    "SELECT id,user_id,role_code,unit_id,include_descendants,active,version,created_at,edited_at FROM unit_role_assignments LIMIT 0",
  );
}
