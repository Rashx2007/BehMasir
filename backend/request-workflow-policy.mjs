// Pure policy only: NOT wired to HTTP or SQL. Never pass browser-supplied
// identities, scopes, reporting relationships, candidates or section flags as context.
import { fail, integer } from "./core.mjs";
export const WORKFLOW_POLICY_VERSION = 1;
export const WORKFLOW_STATES = Object.freeze([
  "awaiting_approver",
  "awaiting_unit",
  "awaiting_fleet",
  "awaiting_dispatch",
  "returned",
  "rejected",
  "cancelled",
  "scheduled",
  "enroute",
  "delivered",
]);
const final = new Set([
  "rejected",
  "cancelled",
  "scheduled",
  "enroute",
  "delivered",
]);
const isId = (v) => Number.isSafeInteger(v) && v > 0 && v <= 4294967295;
function assertId(v) {
  if (!isId(v)) fail(422, "شناسه معتبر نیست.");
  return v;
}
function reason(v) {
  if (
    typeof v !== "string" ||
    [...v.trim()].length < 5 ||
    [...v.trim()].length > 500
  )
    fail(422, "دلیل روشن، بین ۵ تا ۵۰۰ نویسه، الزامی است.");
  return v.trim();
}
function version(v) {
  if (!Number.isSafeInteger(v) || v < 1 || v >= 4294967295)
    fail(409, "نسخهٔ درخواست معتبر نیست یا نیاز به بررسی دارد.");
  return v;
}
function actor(ctx) {
  if (!ctx || !isId(ctx.actor?.id) || ctx.actor.active !== true)
    fail(401, "حساب فعال و معتبر لازم است.");
  return ctx.actor.id;
}
function grant(ctx, capability, unitId) {
  actor(ctx);
  if (!Array.isArray(ctx.grants)) fail(403, "مجوز صریح لازم است.");
  return ctx.grants.some(
    (g) =>
      g.active === true &&
      g.capability === capability &&
      Array.isArray(g.unitIds) &&
      g.unitIds.every(isId) &&
      g.unitIds.includes(unitId),
  );
}
function requireGrant(ctx, capability, unitId) {
  if (!grant(ctx, capability, unitId))
    fail(403, "مجوز لازم در محدودهٔ این واحد ندارید.");
}
function validRecord(r) {
  if (!r || !WORKFLOW_STATES.includes(r.state))
    fail(409, "وضعیت گردش درخواست معتبر نیست.");
  for (const k of ["creatorId", "beneficiaryId", "unitId"]) assertId(r[k]);
  version(r.version);
  version(r.contentVersion);
  if (typeof r.beneficiaryIsManager !== "boolean")
    fail(409, "سمت بهره‌بردار باید از سرور تعیین شود.");
}
function noConflict(r, id) {
  if (id === r.creatorId || id === r.beneficiaryId)
    fail(403, "ثبت‌کننده یا بهره‌بردار نمی‌تواند همین درخواست را تأیید کند.");
}
function independent(r, person) {
  if (
    !person ||
    !isId(person.id) ||
    person.active !== true ||
    person.id === r.creatorId ||
    person.id === r.beneficiaryId
  )
    return false;
  // Loaded/verified assignment metadata, never a free-form client assertion.
  return (
    !r.beneficiaryIsManager ||
    ["superior", "independent_peer"].includes(person.relationship)
  );
}
function eligibleUnitApprovers(r, ctx) {
  if (!Array.isArray(ctx.unitApprovers))
    fail(409, "فهرست تأییدکنندگان بررسی نشده است.");
  return ctx.unitApprovers.filter(
    (p) =>
      independent(r, p) &&
      Array.isArray(p.unitIds) &&
      p.unitIds.every(isId) &&
      p.unitIds.includes(r.unitId),
  );
}
function initialState(r, ctx) {
  return eligibleUnitApprovers(r, ctx).length
    ? "awaiting_unit"
    : "awaiting_approver";
}
function clearApprovals(r) {
  r.unitApproval = null;
  r.fleetApproval = null;
  r.ownership = null;
  r.transportRequestId = null;
  r.vehicleId = null;
  r.driverIds = [];
}
export function assertApprovalBound(r) {
  for (const approval of [r.unitApproval, r.fleetApproval]) {
    if (
      !approval ||
      !isId(approval.actorId) ||
      approval.contentVersion !== r.contentVersion
    )
      fail(409, "تأیید معتبر برای نسخهٔ فعلی اطلاعات درخواست وجود ندارد.");
    noConflict(r, approval.actorId);
  }
}
function enabledSection(ctx, ownership) {
  if (!["org", "contractor"].includes(ownership))
    fail(422, "بخش دولتی یا پیمان‌کار را مشخص کنید.");
  if (ctx.sections?.[ownership] !== true)
    fail(409, "این بخش فعال نیست؛ تخصیص جدید مجاز نیست.");
}
// Creation has no capacity reservation, transport_requests insert or driver binding.
export function newWorkflowRecord(input, ctx) {
  const id = actor(ctx),
    unitId = assertId(input.unitId),
    beneficiaryId = assertId(input.beneficiaryId);
  requireGrant(ctx, "workflow.create", unitId);
  if (beneficiaryId !== id)
    requireGrant(ctx, "workflow.create_for_others", unitId);
  if (
    !ctx.beneficiary ||
    ctx.beneficiary.id !== beneficiaryId ||
    ctx.beneficiary.active !== true ||
    ctx.beneficiary.unitId !== unitId ||
    typeof ctx.beneficiary.isManager !== "boolean"
  )
    fail(422, "بهره‌بردار باید کاربر فعال همین واحد باشد.");
  const r = {
    creatorId: id,
    beneficiaryId,
    unitId,
    beneficiaryIsManager: ctx.beneficiary.isManager,
    state: "awaiting_approver",
    version: 1,
    contentVersion: 1,
  };
  clearApprovals(r);
  r.state = initialState(r, ctx);
  return r;
}
// The caller must lock & re-read SQL row, fresh user/scopes/relationships and
// configuration in ONE transaction, persist one audit/event and commit atomically.
// This function decides only: it must not be used as authorization outside that TX.
export function transitionWorkflow(record, action, input, ctx) {
  const id = actor(ctx);
  validRecord(record);
  if (!input || integer(input.version) !== record.version)
    fail(409, "اطلاعات تغییر کرده است؛ دوباره بررسی کنید.");
  if (final.has(record.state))
    fail(409, "این پرونده از مسیر معمول قابل تغییر نیست.");
  const r = structuredClone(record);
  let why = null;
  if (action === "refresh_approver") {
    requireGrant(ctx, "workflow.configure_approvers", r.unitId);
    if (!["awaiting_unit", "awaiting_approver"].includes(r.state))
      fail(409, "مرحلهٔ تأیید واحد نیست.");
    r.state = initialState(r, ctx);
    if (r.state === record.state)
      fail(409, "وضعیت تأییدکننده تغییری نکرده است.");
  } else if (action === "unit_approve") {
    requireGrant(ctx, "workflow.unit_approve", r.unitId);
    noConflict(r, id);
    if (!["awaiting_unit", "awaiting_approver"].includes(r.state))
      fail(409, "درخواست در مرحلهٔ تأیید واحد نیست.");
    if (!eligibleUnitApprovers(r, ctx).some((p) => p.id === id))
      fail(403, "تأییدکنندهٔ مستقلِ مجاز نیستید.");
    r.unitApproval = { actorId: id, contentVersion: r.contentVersion };
    r.fleetApproval = null;
    r.state = "awaiting_fleet";
  } else if (action === "fleet_approve") {
    requireGrant(ctx, "workflow.fleet_approve", r.unitId);
    noConflict(r, id);
    if (
      r.state !== "awaiting_fleet" ||
      !r.unitApproval ||
      r.unitApproval.contentVersion !== r.contentVersion
    )
      fail(409, "تأیید معتبر واحد لازم است.");
    noConflict(r, r.unitApproval.actorId);
    enabledSection(ctx, input.ownership);
    r.ownership = input.ownership;
    r.fleetApproval = { actorId: id, contentVersion: r.contentVersion };
    r.state = "awaiting_dispatch";
  } else if (action === "return" || action === "reject") {
    const capability = ["awaiting_unit", "awaiting_approver"].includes(r.state)
      ? "workflow.unit_approve"
      : r.state === "awaiting_fleet"
        ? "workflow.fleet_approve"
        : null;
    if (!capability)
      fail(409, "در این مرحله بازگرداندن یا رد سازمانی مجاز نیست.");
    requireGrant(ctx, capability, r.unitId);
    noConflict(r, id);
    if (
      capability === "workflow.unit_approve" &&
      !eligibleUnitApprovers(r, ctx).some((p) => p.id === id)
    )
      fail(403, "تأییدکنندهٔ مستقلِ مجاز نیستید.");
    why = reason(input.reason);
    clearApprovals(r);
    r.state = action === "return" ? "returned" : "rejected";
  } else if (action === "dispatch_return") {
    if (r.state !== "awaiting_dispatch")
      fail(409, "درخواست در مرحلهٔ تخصیص نیست.");
    requireGrant(ctx, "workflow.dispatch." + r.ownership, r.unitId);
    why = reason(input.reason);
    r.state = "awaiting_fleet";
    r.fleetApproval = null;
    r.ownership = null;
  } else if (action === "dispatch") {
    if (r.state !== "awaiting_dispatch")
      fail(409, "درخواست برای تخصیص آماده نیست.");
    requireGrant(ctx, "workflow.dispatch." + r.ownership, r.unitId);
    enabledSection(ctx, r.ownership);
    assertApprovalBound(r);
    // Actual vehicle availability, capacity, shift, ownership, driver checks and
    // transport_request creation are compulsory in the database service, not here.
    r.state = "scheduled";
  } else if (action === "edit" || action === "resubmit") {
    if (r.creatorId !== id)
      fail(403, "اصلاح و ارسال مجدد فقط توسط ثبت‌کننده انجام می‌شود.");
    requireGrant(ctx, "workflow.create", r.unitId);
    if (r.beneficiaryId !== id)
      requireGrant(ctx, "workflow.create_for_others", r.unitId);
    if (action === "resubmit" && r.state !== "returned")
      fail(409, "درخواست بازگردانده‌شده نیست.");
    why = reason(input.reason);
    // Material fields are validated separately; caller cannot retain old approvals.
    version(r.contentVersion);
    r.contentVersion++;
    clearApprovals(r);
    r.state = initialState(r, ctx);
  } else if (action === "cancel") {
    if (r.creatorId !== id)
      fail(403, "لغو اولیه فقط توسط ثبت‌کننده انجام می‌شود.");
    requireGrant(ctx, "workflow.create", r.unitId);
    why = reason(input.reason);
    clearApprovals(r);
    r.state = "cancelled";
  } else fail(422, "عملیات گردش درخواست معتبر نیست.");
  r.version++;
  return {
    record: r,
    event: {
      action,
      actorId: id,
      from: record.state,
      to: r.state,
      previousVersion: record.version,
      version: r.version,
      contentVersion: r.contentVersion,
      reason: why,
    },
  };
}
export function assertFleetSectionChange(current, next, ctx) {
  actor(ctx);
  if (ctx.canConfigureFleetSections !== true)
    fail(403, "مجوز مستقل تنظیم بخش‌های ناوگان لازم است.");
  if (
    typeof current.org !== "boolean" ||
    typeof current.contractor !== "boolean" ||
    typeof next.org !== "boolean" ||
    typeof next.contractor !== "boolean"
  )
    fail(422, "تنظیم بخش معتبر نیست.");
  const why = reason(ctx.reason);
  for (const part of ["org", "contractor"])
    if (current[part] && !next[part]) {
      if (
        !Number.isSafeInteger(ctx.openAssignments?.[part]) ||
        ctx.openAssignments[part] < 0
      )
        fail(409, "وضعیت مأموریت‌های باز بررسی نشده است.");
      if (ctx.openAssignments[part] > 0)
        fail(409, "ابتدا مأموریت‌های باز این بخش را تعیین تکلیف کنید.");
    }
  return {
    org: next.org,
    contractor: next.contractor,
    actorId: ctx.actor.id,
    reason: why,
  };
}
