import mysql from "mysql2/promise";
if (
  process.env.DB_HOST &&
  !["127.0.0.1", "localhost", "::1"].includes(process.env.DB_HOST)
) {
  throw new Error(
    "این بسته فقط اتصال محلی MySQL را می‌پذیرد؛ اتصال جدا به TLS و بازبینی تنظیمات نیاز دارد.",
  );
}
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "behmasir_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "behmasir",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL || 5),
  queueLimit: 50,
  dateStrings: true,
  timezone: "Z",
  charset: "utf8mb4",
  multipleStatements: false,
  enableKeepAlive: true,
});
export async function rows(db, sql, args = []) {
  const [r] = await db.execute(sql, args);
  return r;
}
export async function transaction(work) {
  const c = await pool.getConnection();
  try {
    await c.query("SET time_zone='+00:00'");
    await c.beginTransaction();
    await rows(c, "SELECT revision FROM app_meta WHERE id=1 FOR UPDATE");
    const r = await work(c);
    await rows(c, "UPDATE app_meta SET revision=revision+1 WHERE id=1");
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export const json = (v) => JSON.stringify(v);
export async function audit(db, user, action, entity, id, payload = {}) {
  await rows(
    db,
    "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (?,?,?,?,?)",
    [user?.id || null, action, entity, id, json(payload)],
  );
}
