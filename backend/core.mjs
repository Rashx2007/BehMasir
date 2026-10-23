import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const hash = (v) => createHash("sha256").update(v).digest("hex");
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export function text(value, max = 100) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    [...value.trim()].length > max
  )
    fail(422, "متن واردشده معتبر نیست.");
  return value.trim();
}
export function integer(v, min = 1, max = 4294967295) {
  if (!Number.isSafeInteger(Number(v)) || Number(v) < min || Number(v) > max)
    fail(422, "مقدار عددی معتبر نیست.");
  return Number(v);
}
export function choice(v, values) {
  if (!values.includes(v)) fail(422, "گزینه معتبر نیست.");
  return v;
}
export function bool(v) {
  if (typeof v !== "boolean") fail(422, "مقدار منطقی معتبر نیست.");
  return v;
}
export function isoDate(v) {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v + "T00:00:00Z")) ||
    new Date(v + "T00:00:00Z").toISOString().slice(0, 10) !== v
  )
    fail(422, "تاریخ معتبر نیست.");
  return v;
}
export function hhmm(v) {
  if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    fail(422, "ساعت معتبر نیست.");
  return v;
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function withinShift(v, time) {
  if (v.shift_start === null && v.shift_end === null) return true;
  const s = v.shift_start.slice(0, 5),
    e = v.shift_end.slice(0, 5);
  return s < e ? time >= s && time <= e : time >= s || time <= e;
}
export function plateKey(v) {
  return text(v, 40)
    .replace(/[۰-۹٠-٩]/g, (d) =>
      "۰۱۲۳۴۵۶۷۸۹".includes(d)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(d),
    )
    .replace(/[\s\-ـ]/g, "");
}
export async function passwordHash(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    fail(422, "رمز باید بین ۱۲ تا ۱۲۸ نویسه باشد.");
  const salt = randomBytes(16).toString("hex");
  const b = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt}$${b.toString("hex")}`;
}
export async function verifyPassword(password, record) {
  if (typeof password !== "string" || password.length > 128) return false;
  const [alg, salt, key] = String(record).split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const b = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return expected.length === b.length && timingSafeEqual(expected, b);
}
export function preferences(p) {
  const out = { theme: null, dismissedGuides: [], hideModalCloseHelp: false };
  if (p?.theme !== null && p?.theme !== undefined)
    out.theme = choice(p.theme, ["system", "light", "dark", "colorful"]);
  if (p?.dismissedGuides) {
    if (!Array.isArray(p.dismissedGuides) || p.dismissedGuides.length > 10)
      fail(422, "تنظیمات نامعتبر است.");
    out.dismissedGuides = [
      ...new Set(
        p.dismissedGuides.map((x) =>
          choice(x, [
            "dashboard",
            "vehicles",
            "requests",
            "centers",
            "history",
            "units",
            "users",
            "missions",
          ]),
        ),
      ),
    ];
  }
  out.hideModalCloseHelp = !!p?.hideModalCloseHelp;
  return out;
}
