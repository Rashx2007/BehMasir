import { fail, integer, text } from "./core.mjs";
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
export const UNIT_TREE_LIMITS = Object.freeze({ units: 2000, levels: 32 });

// The organization is a forest: several top-level units are permitted.
// Iterative traversal avoids recursion and rejects existing corrupt trees.
export function unitTree(records, status = 409) {
  if (records.length > UNIT_TREE_LIMITS.units)
    fail(
      413,
      "تعداد واحدها بیش از ظرفیت این نسخه است؛ بررسی مدیریتی لازم است.",
    );
  const byId = new Map();
  for (const r of records) {
    if (
      !Number.isSafeInteger(r.id) ||
      r.id <= 0 ||
      byId.has(r.id) ||
      (r.parent_id !== null &&
        (!Number.isSafeInteger(r.parent_id) || r.parent_id <= 0))
    )
      fail(status, "شناسه‌های درخت واحدها معتبر نیستند.");
    byId.set(r.id, r);
  }
  const children = new Map([[null, []]]);
  for (const r of records) {
    if (r.parent_id !== null && !byId.has(r.parent_id))
      fail(status, "واحد فعال به والد ناموجود یا حذف‌شده متصل است.");
    if (!children.has(r.parent_id)) children.set(r.parent_id, []);
    children.get(r.parent_id).push(r);
  }
  for (const list of children.values()) list.sort((a, b) => a.id - b.id);
  const stack = (children.get(null) || [])
    .slice()
    .reverse()
    .map((r) => ({ r, depth: 0, ancestors: [] }));
  const result = [],
    seen = new Set();
  while (stack.length) {
    const { r, depth, ancestors } = stack.pop();
    if (seen.has(r.id)) fail(status, "چرخه در درخت واحدها وجود دارد.");
    if (depth >= UNIT_TREE_LIMITS.levels)
      fail(status, "ساختار واحدها نمی‌تواند بیش از ۳۲ سطح داشته باشد.");
    seen.add(r.id);
    result.push({
      id: r.id,
      name: r.name,
      parentId: r.parent_id,
      version: r.version,
      depth,
      ancestorIds: ancestors,
      path: [...ancestors.map((id) => byId.get(id).name), r.name].join(" / "),
    });
    for (const child of (children.get(r.id) || []).slice().reverse())
      stack.push({
        r: child,
        depth: depth + 1,
        ancestors: [...ancestors, r.id],
      });
  }
  if (seen.size !== records.length)
    fail(status, "چرخه در درخت واحدها وجود دارد.");
  return result;
}
export async function listUnitRows(db, lock = false) {
  const result = await rows(
    db,
    "SELECT id,name,parent_id,version,used_ever FROM units WHERE deleted_at IS NULL ORDER BY id LIMIT 2001" +
      (lock ? " FOR UPDATE" : ""),
  );
  unitTree(result); // Never silently omit invalid or excessive trees.
  return result;
}
const checkVersion = (r, expected) => {
  if (!r) fail(404, "واحد فعال پیدا نشد.");
  if (r.version !== integer(expected))
    fail(409, "واحد تغییر کرده است؛ صفحه را تازه کنید.");
};
const parentValue = (value) => {
  if (value === null) return null;
  if (!Number.isSafeInteger(value))
    fail(422, "شناسهٔ والد باید عدد صحیح یا null باشد.");
  return integer(value);
};
const proposed = (records, id, parentId) => {
  if (parentId === id) fail(422, "واحد نمی‌تواند والد خودش باشد.");
  if (parentId !== null && !records.some((r) => r.id === parentId))
    fail(422, "والد انتخاب‌شده فعال یا موجود نیست.");
  unitTree(
    records.map((r) => (r.id === id ? { ...r, parent_id: parentId } : r)),
    422,
  );
};
export async function createUnit(db, body) {
  const name = text(body.name),
    parentId = parentValue(body.parentId === undefined ? null : body.parentId);
  const records = await listUnitRows(db, true);
  if (records.length >= UNIT_TREE_LIMITS.units)
    fail(413, "ظرفیت واحدهای این نسخه تکمیل است.");
  if (parentId !== null) {
    const parent = unitTree(records).find((r) => r.id === parentId);
    if (!parent) fail(422, "والد انتخاب‌شده فعال یا موجود نیست.");
    if (parent.depth + 1 >= UNIT_TREE_LIMITS.levels)
      fail(422, "حداکثر عمق درخت رعایت نشده است.");
  }
  const result = await rows(
    db,
    "INSERT INTO units(name,parent_id) VALUES (?,?)",
    [name, parentId],
  );
  return { id: result.insertId };
}
export async function changeUnitParent(db, idValue, body) {
  const id = integer(idValue);
  if (!Object.hasOwn(body, "parentId"))
    fail(422, "والد جدید باید مشخص شود؛ برای سطح اول مقدار null لازم است.");
  const parentId = parentValue(body.parentId);
  const records = await listUnitRows(db, true),
    target = records.find((r) => r.id === id);
  checkVersion(target, body.version);
  proposed(records, id, parentId);
  if (target.parent_id === parentId) return { id, changed: false };
  await rows(db, "UPDATE units SET parent_id=? WHERE id=?", [parentId, id]);
  return { id, changed: true };
}
// Names are labels, not identity: never rewrite foreign keys or historical request snapshots.
export async function renameUnit(db, idValue, body) {
  const id = integer(idValue),
    name = text(body.name);
  const records = await listUnitRows(db, true),
    target = records.find((r) => r.id === id);
  checkVersion(target, body.version);
  if (target.name === name) return { id, changed: false };
  const duplicate = await rows(
    db,
    "SELECT id FROM units WHERE name=? AND id<>? LIMIT 1 FOR UPDATE",
    [name, id],
  );
  if (duplicate.length)
    fail(
      409,
      "این نام قبلاً برای واحد دیگری استفاده شده است؛ واحد حذف‌شده نیز ممکن است این نام را داشته باشد.",
    );
  await rows(db, "UPDATE units SET name=? WHERE id=?", [name, id]);
  return { id, changed: true };
}
export async function deleteUnit(db, idValue, body) {
  const id = integer(idValue),
    records = await listUnitRows(db, true),
    target = records.find((r) => r.id === id);
  checkVersion(target, body.version);
  if (records.some((r) => r.parent_id === id))
    fail(409, "واحد دارای زیرواحد فعال است؛ ابتدا ساختار را اصلاح کنید.");
  if (
    target.used_ever ||
    (await rows(db, "SELECT id FROM users WHERE unit_id=? LIMIT 1", [id]))
      .length ||
    (
      await rows(
        db,
        "SELECT id FROM transport_requests WHERE unit_id=? LIMIT 1",
        [id],
      )
    ).length
  )
    fail(409, "واحد دارای سابقه یا کاربر است.");
  await rows(db, "UPDATE units SET deleted_at=UTC_TIMESTAMP(3) WHERE id=?", [
    id,
  ]);
  return { id };
}
export async function assertUnitTreeSchema(db) {
  await db.execute(
    "SELECT id,name,parent_id,version,used_ever,deleted_at FROM units LIMIT 0",
  );
  await listUnitRows(db);
}
