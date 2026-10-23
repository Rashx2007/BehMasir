// رمز از فایل موقت با دسترسی محدود خوانده می‌شود؛ در آرگومان فرمان قرار نگیرد.
import { readFile } from "node:fs/promises";
import { pool, rows, transaction, audit } from "./db.mjs";
import { passwordHash, text, fail } from "./core.mjs";
try {
  if (!process.env.ADMIN_PASSWORD_FILE)
    throw Error("ADMIN_PASSWORD_FILE لازم است.");
  const password = (
    await readFile(process.env.ADMIN_PASSWORD_FILE, "utf8")
  ).replace(/\r?\n$/, "");
  const username = text(process.env.ADMIN_USERNAME || "admin", 32);
  if (!/^[a-z0-9_.-]{3,32}$/.test(username))
    fail(422, "نام کاربری معتبر نیست.");
  const ph = await passwordHash(password);
  await transaction(async (db) => {
    if ((await rows(db, "SELECT id FROM users WHERE role_code='admin'")).length)
      throw Error("مدیر قبلاً ساخته شده است؛ بازنویسی انجام نمی‌شود.");
    const r = await rows(
      db,
      "INSERT INTO users(username,name,role_code,password_hash) VALUES (?,?,'admin',?)",
      [username, process.env.ADMIN_NAME || "مدیر سیستم", ph],
    );
    await audit(db, null, "bootstrap.admin_created", "user", r.insertId);
  });
  console.log("مدیر ساخته شد؛ رمز در خروجی نمایش داده نمی‌شود.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
