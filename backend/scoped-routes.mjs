import { fail } from "./core.mjs";
export const SCOPED_READ_VERSION = 1;
const roles = new Set([
  "admin",
  "dispatcher",
  "requester",
  "driver",
  "unit_manager",
]);
const scopedRoutes = new Set([
  "GET state",
  "GET history",
  "GET unit-reports",
  "PUT preferences",
  "POST password",
  "POST logout",
]);
export function assertScopedRoute(user, method, path) {
  if (!roles.has(user.role_code)) fail(403, "نقش حساب پشتیبانی نمی‌شود.");
  if (
    user.role_code === "unit_manager" &&
    !scopedRoutes.has(method + " " + path) &&
    !(method === 'GET' && path === 'workflow') &&
    !(method === 'POST' && /^(workflow\/(settings|grants|requests)|workflow\/grants\/\d+|workflow\/requests\/\d+\/(unit_approve|fleet_approve|return|reject|dispatch_return|dispatch|edit|resubmit|cancel))$/.test(path))
  )
    fail(
      403,
      "در این مرحله فقط مشاهدهٔ محدوده و تنظیمات حساب خودتان مجاز است.",
    );
}
export async function readSnapshot(pool, work) {
  const db = await pool.getConnection();
  let usable = true;
  try {
    await db.query("SET time_zone='+00:00'");
    await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await db.beginTransaction();
    const result = await work(db);
    await db.commit();
    return result;
  } catch (e) {
    try {
      await db.rollback();
    } catch {
      usable = false;
    }
    throw e;
  } finally {
    if (usable) db.release();
    else db.destroy();
  }
}
export async function freshReadUser(db, session) {
  const [list] = await db.execute(
    "SELECT u.*,x.name unit_name FROM users u LEFT JOIN units x ON x.id=u.unit_id WHERE u.id=?",
    [session.id],
  );
  const u = list[0];
  if (!u || Number(u.active) !== 1 || u.auth_version !== session.auth_version)
    fail(401, "نشست معتبر نیست.");
  assertScopedRoute(u, "GET", "state");
  return u;
}
