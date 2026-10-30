// No global fleet/users/catalog query is permitted in these read views.
import { fail, integer, preferences } from "./core.mjs";
import { resolveUnitAccess, unitScopePredicate } from "./unit-access.mjs";
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
async function context(db, u) {
  const access = await resolveUnitAccess(db, u.id, u.auth_version);
  const units = access.unitIds.length
    ? await rows(
        db,
        `SELECT id,name,parent_id FROM units WHERE deleted_at IS NULL AND id IN (${access.unitIds.map(() => "?").join(",")}) ORDER BY id`,
        access.unitIds,
      )
    : [];
  const ids = new Set(access.unitIds);
  return {
    access,
    scopeUnits: units.map((r) => ({
      id: r.id,
      name: r.name,
      parentId: ids.has(r.parent_id) ? r.parent_id : null,
    })),
  };
}
async function report(db, access, scopeUnits) {
  if (!access.permissions.includes("reports.read")) return null;
  const [predicate, args] = unitScopePredicate(access, "reports.read");
  const stats = await rows(
    db,
    `SELECT r.unit_id,un.name unit_name,r.status,COUNT(*) total FROM transport_requests r JOIN units un ON un.id=r.unit_id WHERE ${predicate} GROUP BY r.unit_id,un.name,r.status ORDER BY r.unit_id,r.status`,
    args,
  );
  const byStatus = { scheduled: 0, enroute: 0, delivered: 0, cancelled: 0 },
    byUnit = new Map(
      scopeUnits.map((u) => [
        u.id,
        { id: u.id, name: u.name, total: 0, ...byStatus },
      ]),
    );
  let total = 0;
  for (const r of stats) {
    if (!Object.hasOwn(byStatus, r.status) || !byUnit.has(r.unit_id))
      throw Error("INVALID_SCOPED_REPORT_ROW");
    const count = Number(r.total);
    if (!Number.isSafeInteger(count) || count < 0)
      throw Error("INVALID_SCOPED_REPORT_COUNT");
    total += count;
    byStatus[r.status] += count;
    byUnit.get(r.unit_id)[r.status] += count;
    byUnit.get(r.unit_id).total += count;
  }
  return { period: "all_time", total, byStatus, byUnit: [...byUnit.values()] };
}
export async function scopedReports(db, u) {
  const { access, scopeUnits } = await context(db, u);
  if (!access.permissions.includes("reports.read"))
    fail(403, "مجوز مشاهدهٔ گزارش ندارید.");
  return { scopeUnits, report: await report(db, access, scopeUnits) };
}
export async function scopedState(db, u, mapRequest) {
  const { access, scopeUnits } = await context(db, u);
  let open = [],
    delivered = [];
  if (access.permissions.includes("requests.read")) {
    const [predicate, args] = unitScopePredicate(access, "requests.read");
    open = await rows(
      db,
      `SELECT r.* FROM transport_requests r WHERE ${predicate} AND r.status IN ('scheduled','enroute') ORDER BY r.id LIMIT 5001`,
      args,
    );
    if (open.length > 5000)
      fail(
        413,
        "حجم درخواست‌های باز محدوده بیش از حد این نسخه است؛ صفحه‌بندی لازم است.",
      );
    delivered = await rows(
      db,
      `SELECT r.* FROM transport_requests r WHERE ${predicate} AND r.status='delivered' ORDER BY r.id DESC LIMIT 201`,
      args,
    );
  }
  const [role] = await rows(db, "SELECT title FROM roles WHERE code=?", [
    u.role_code,
  ]);
  const [pref] = await rows(
    db,
    "SELECT preferences FROM user_preferences WHERE user_id=?",
    [u.id],
  );
  const raw =
    typeof pref?.preferences === "string"
      ? JSON.parse(pref.preferences)
      : pref?.preferences || {};
  const currentUser = {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role_code,
    roleTitle: role?.title || "مدیر واحد",
    active: true,
    unit: u.unit_name || null,
    vehicleIds: [],
    preferences: preferences(raw),
    authVersion: u.auth_version,
    version: u.version,
    access: {
      enforced: true,
      version: 1,
      permissions: access.permissions,
      unitIds: access.unitIds,
    },
  };
  const [meta] = await rows(db, "SELECT revision FROM app_meta WHERE id=1");
  return {
    revision: meta.revision,
    vehicles: [],
    vehicleTypes: [],
    centers: [],
    units: [],
    unitRecords: [],
    usedUnits: [],
    capacityUsage: [],
    dashboard: null,
    samples: open.map(mapRequest),
    history: delivered.slice(0, 200).map(mapRequest),
    historyCursor: delivered.length > 200 ? delivered[199].id : null,
    users: [currentUser],
    currentUser,
    scopeUnits,
    scopeReport: await report(db, access, scopeUnits),
    scopedReadVersion: 1,
  };
}
export async function scopedHistory(db, u, before, mapRequest) {
  const { access } = await context(db, u);
  if (!access.permissions.includes("requests.read"))
    fail(403, "مجوز مشاهدهٔ درخواست‌ها ندارید.");
  const [predicate, args] = unitScopePredicate(access, "requests.read");
  const list = await rows(
    db,
    `SELECT r.* FROM transport_requests r WHERE ${predicate} AND r.status='delivered' AND r.id<? ORDER BY r.id DESC LIMIT 201`,
    [...args, integer(before)],
  );
  return {
    access: { permissions: access.permissions, unitIds: access.unitIds },
    items: list.slice(0, 200).map(mapRequest),
    cursor: list.length > 200 ? list[199].id : null,
  };
}
