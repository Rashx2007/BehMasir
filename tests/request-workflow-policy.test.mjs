import test from "node:test";
import assert from "node:assert/strict";
import {
  newWorkflowRecord,
  transitionWorkflow as step,
  assertApprovalBound,
  assertFleetSectionChange,
  WORKFLOW_STATES,
} from "../backend/request-workflow-policy.mjs";
const grants = [
  "workflow.create",
  "workflow.create_for_others",
  "workflow.configure_approvers",
  "workflow.unit_approve",
  "workflow.fleet_approve",
  "workflow.dispatch.org",
  "workflow.dispatch.contractor",
].map((capability) => ({ capability, active: true, unitIds: [11] }));
const ctx = (id = 3) => ({
  actor: { id, active: true },
  grants: structuredClone(grants),
  beneficiary: { id: 3, unitId: 11, active: true, isManager: false },
  unitApprovers: [
    { id: 4, active: true, unitIds: [11], relationship: "independent_peer" },
  ],
  sections: { org: true, contractor: true },
});
const create = (c = ctx()) =>
  newWorkflowRecord({ unitId: 11, beneficiaryId: 3 }, c);
const approve = (r) =>
  step(r, "unit_approve", { version: r.version }, ctx(4)).record;
const fleet = (r) =>
  step(r, "fleet_approve", { version: r.version, ownership: "org" }, ctx(5))
    .record;
const err = (f, status) => assert.throws(f, (e) => e.status === status);
test("submission is waiting, unassigned, immutable caller payload", () => {
  const r = create();
  assert.equal(r.state, "awaiting_unit");
  assert.equal(r.vehicleId, null);
  assert.deepEqual(r.driverIds, []);
  assert.equal(r.transportRequestId, null);
  assert.equal(r.contentVersion, 1);
});
test("no approver leaves request waiting for assignment, never auto approves", () => {
  const c = ctx();
  c.unitApprovers = [];
  const r = create(c);
  assert.equal(r.state, "awaiting_approver");
  assert.equal(r.unitApproval, null);
});
test("explicit create permission required; admin title is insufficient", () => {
  const c = ctx();
  c.actor.role = "admin";
  c.grants = [];
  err(() => create(c), 403);
});
test("delegated creation needs its separate grant", () => {
  const c = ctx(2);
  c.grants = c.grants.filter(
    (g) => g.capability !== "workflow.create_for_others",
  );
  err(() => create(c), 403);
});
test("authorized delegated creation keeps creator separate from beneficiary", () => {
  const r = create(ctx(2));
  assert.equal(r.creatorId, 2);
  assert.equal(r.beneficiaryId, 3);
});
for (const change of [
  (c) => (c.beneficiary.active = false),
  (c) => (c.beneficiary.unitId = 1),
  (c) => (c.beneficiary.isManager = undefined),
  (c) => (c.beneficiary.id = 9),
])
  test("beneficiary server metadata rejects " + change.toString(), () => {
    const c = ctx();
    change(c);
    err(() => create(c), 422);
  });
for (const id of [2, 3])
  test("creator or beneficiary cannot approve delegated request: " + id, () => {
    const c = ctx(2),
      r = create(c);
    const a = ctx(id);
    a.unitApprovers = [
      { id, active: true, unitIds: [11], relationship: "independent_peer" },
    ];
    err(() => step(r, "unit_approve", { version: 1 }, a), 403);
  });
for (const relationship of [
  "subordinate",
  null,
  undefined,
  "superior",
  "independent_peer",
])
  test(
    "manager request only independent peer or superior: " + relationship,
    () => {
      const c = ctx();
      c.beneficiary.isManager = true;
      c.unitApprovers[0].relationship = relationship;
      const r = create(c);
      assert.equal(
        r.state,
        ["superior", "independent_peer"].includes(relationship)
          ? "awaiting_unit"
          : "awaiting_approver",
      );
    },
  );
test("unit approval binds content version, advances only to fleet", () => {
  const r = create(),
    old = structuredClone(r),
    x = step(r, "unit_approve", { version: 1 }, ctx(4));
  assert.deepEqual(r, old);
  assert.equal(x.record.state, "awaiting_fleet");
  assert.deepEqual(x.record.unitApproval, { actorId: 4, contentVersion: 1 });
  assert.equal(x.event.actorId, 4);
  assert.equal(x.record.version, 2);
});
test("unit approver must have live explicit grant as well as assignment", () => {
  const c = ctx(4);
  c.grants = [];
  err(() => step(create(), "unit_approve", { version: 1 }, c), 403);
});
test("revoked, wrong-unit or inactive approval assignments fail closed", () => {
  for (const p of [
    { id: 4, active: false, unitIds: [11] },
    { id: 4, active: true, unitIds: [1] },
    { id: 4, active: true, unitIds: ["11"] },
  ]) {
    const c = ctx(4);
    c.unitApprovers = [p];
    err(() => step(create(), "unit_approve", { version: 1 }, c), 403);
  }
});
test("fleet approval cannot skip unit stage", () =>
  err(
    () =>
      step(create(), "fleet_approve", { version: 1, ownership: "org" }, ctx(5)),
    409,
  ));
for (const id of [2, 3])
  test("fleet approval also rejects creator/beneficiary " + id, () => {
    const r = approve(create(ctx(2)));
    err(
      () =>
        step(
          r,
          "fleet_approve",
          { version: r.version, ownership: "org" },
          ctx(id),
        ),
      403,
    );
  });
test("fleet approval chooses enabled section and preserves unit approval", () => {
  const r = fleet(approve(create()));
  assert.equal(r.state, "awaiting_dispatch");
  assert.equal(r.ownership, "org");
  assert.equal(r.unitApproval.actorId, 4);
  assert.equal(r.fleetApproval.actorId, 5);
});
for (const ownership of ["org", "contractor"])
  test("disabled section rejects approval: " + ownership, () => {
    const r = approve(create()),
      c = ctx(5);
    c.sections[ownership] = false;
    err(
      () => step(r, "fleet_approve", { version: r.version, ownership }, c),
      409,
    );
  });
test("changing material content invalidates both approvals and increments content version", () => {
  const r = fleet(approve(create())),
    x = step(
      r,
      "edit",
      { version: r.version, reason: "اصلاح ساعت درخواست" },
      ctx(),
    ).record;
  assert.equal(x.state, "awaiting_unit");
  assert.equal(x.unitApproval, null);
  assert.equal(x.fleetApproval, null);
  assert.equal(x.ownership, null);
  assert.equal(x.contentVersion, 2);
});
test("revoked creation grant prevents edit/resubmission", () => {
  const c = ctx();
  c.grants = [];
  err(
    () =>
      step(create(), "edit", { version: 1, reason: "اصلاح ساعت درخواست" }, c),
    403,
  );
});
test("only creator can edit original submission", () =>
  err(
    () =>
      step(
        create(),
        "edit",
        { version: 1, reason: "اصلاح ساعت درخواست" },
        ctx(4),
      ),
    403,
  ));
for (const v of [0, 2, undefined, -1])
  test("stale or missing expected version rejected: " + v, () =>
    err(
      () => step(create(), "unit_approve", { version: v }, ctx(4)),
      v === undefined || v === 0 || v === -1 ? 422 : 409,
    ),
  );
for (const action of ["return", "reject"])
  test(action + " requires reason and records independent actor", () => {
    const r = create();
    err(() => step(r, action, { version: 1 }, ctx(4)), 422);
    const x = step(
      r,
      action,
      { version: 1, reason: "اطلاعات مسیر ناقص است" },
      ctx(4),
    );
    assert.equal(x.record.state, action === "return" ? "returned" : "rejected");
    assert.equal(x.event.reason, "اطلاعات مسیر ناقص است");
  });
test("resubmitting returned request restarts at unit with no old approvals", () => {
  const r = step(
    approve(create()),
    "return",
    { version: 2, reason: "تاریخ نیاز به اصلاح دارد" },
    ctx(5),
  ).record;
  const x = step(
    r,
    "resubmit",
    { version: r.version, reason: "تاریخ درخواست اصلاح شد" },
    ctx(),
  ).record;
  assert.equal(x.state, "awaiting_unit");
  assert.equal(x.contentVersion, 2);
  assert.equal(x.unitApproval, null);
});
test("cannot resubmit non-returned request", () =>
  err(
    () =>
      step(
        create(),
        "resubmit",
        { version: 1, reason: "ارسال مجدد درخواست" },
        ctx(),
      ),
    409,
  ));
test("dispatch return goes to fleet only; preserves unit approval", () => {
  const r = fleet(approve(create())),
    x = step(
      r,
      "dispatch_return",
      { version: r.version, reason: "خودروی مناسب موجود نیست" },
      ctx(6),
    ).record;
  assert.equal(x.state, "awaiting_fleet");
  assert.equal(x.unitApproval.actorId, 4);
  assert.equal(x.fleetApproval, null);
});
test("dispatcher cannot reject organizational request", () => {
  const r = fleet(approve(create()));
  err(
    () =>
      step(
        r,
        "reject",
        { version: r.version, reason: "خودرو موجود نیست" },
        ctx(6),
      ),
    409,
  );
});
test("dispatch requires ownership-specific grant, both approvals and enabled section", () => {
  const r = fleet(approve(create()));
  const c = ctx(6);
  c.grants = c.grants.filter((g) => g.capability !== "workflow.dispatch.org");
  err(() => step(r, "dispatch", { version: r.version }, c), 403);
  assert.equal(
    step(r, "dispatch", { version: r.version }, ctx(6)).record.state,
    "scheduled",
  );
});
test("disabled section prevents new dispatch even after fleet approval", () => {
  const r = fleet(approve(create())),
    c = ctx(6);
  c.sections.org = false;
  err(() => step(r, "dispatch", { version: r.version }, c), 409);
});
test("mismatched approval content version cannot authorize dispatch", () => {
  const r = fleet(approve(create()));
  r.contentVersion++;
  err(() => assertApprovalBound(r), 409);
});
test("unassigned request cannot skip stages into dispatch", () =>
  err(() => step(create(), "dispatch", { version: 1 }, ctx(6)), 409));
for (const state of [
  "rejected",
  "cancelled",
  "scheduled",
  "enroute",
  "delivered",
])
  test(
    "terminal/operational state cannot be reopened by ordinary edit: " + state,
    () => {
      const r = { ...create(), state };
      err(
        () =>
          step(
            r,
            "edit",
            { version: 1, reason: "اصلاح اطلاعات درخواست" },
            ctx(),
          ),
        409,
      );
    },
  );
test("refresh approver cannot silently approve or be used without separate permission", () => {
  const c = ctx();
  c.unitApprovers = [];
  const r = create(c);
  const x = step(r, "refresh_approver", { version: 1 }, ctx(9));
  assert.equal(x.record.state, "awaiting_unit");
  assert.equal(x.record.unitApproval, null);
  const d = ctx(9);
  d.grants = [];
  err(() => step(r, "refresh_approver", { version: 1 }, d), 403);
});
test("cancel before dispatch requires owner grant and reason", () => {
  const r = create();
  err(
    () =>
      step(r, "cancel", { version: 1, reason: "نیاز سازمان لغو شد" }, ctx(4)),
    403,
  );
  assert.equal(
    step(r, "cancel", { version: 1, reason: "نیاز سازمان لغو شد" }, ctx())
      .record.state,
    "cancelled",
  );
});
test("unknown action and unknown state fail closed", () => {
  err(() => step(create(), "hacked", { version: 1 }, ctx()), 422);
  err(
    () =>
      step(
        { ...create(), state: "approved" },
        "unit_approve",
        { version: 1 },
        ctx(4),
      ),
    409,
  );
});
test("unverified accounts fail closed", () => {
  for (const active of [false, 1, undefined]) {
    const c = ctx();
    c.actor.active = active;
    err(() => create(c), 401);
  }
});
test("unsafe ids and versions never accepted", () => {
  err(() => newWorkflowRecord({ unitId: "11", beneficiaryId: 3 }, ctx()), 422);
  err(
    () =>
      step(
        { ...create(), version: 4294967295 },
        "unit_approve",
        { version: 4294967295 },
        ctx(4),
      ),
    409,
  );
});
const sc = (extra = {}) => ({
  ...ctx(1),
  canConfigureFleetSections: true,
  reason: "تصویب تنظیمات ناوگان",
  openAssignments: { org: 0, contractor: 0 },
  ...extra,
});
test("fleet sections are independently configurable including neither enabled", () => {
  for (const next of [
    { org: true, contractor: false },
    { org: false, contractor: true },
    { org: false, contractor: false },
  ]) {
    const x = assertFleetSectionChange(
      { org: true, contractor: true },
      next,
      sc(),
    );
    assert.equal(x.org, next.org);
    assert.equal(x.contractor, next.contractor);
  }
});
test("section configuration requires separate verified permission", () =>
  err(
    () =>
      assertFleetSectionChange(
        { org: true, contractor: true },
        { org: false, contractor: true },
        sc({ canConfigureFleetSections: false }),
      ),
    403,
  ));
test("section disable blocked when open assignments exist or were not checked", () => {
  for (const openAssignments of [{ org: 1, contractor: 0 }, {}, undefined])
    err(
      () =>
        assertFleetSectionChange(
          { org: true, contractor: true },
          { org: false, contractor: true },
          sc({ openAssignments }),
        ),
      409,
    );
});
test("re-enabling section possible with permission and reason", () =>
  assert.equal(
    assertFleetSectionChange(
      { org: false, contractor: false },
      { org: true, contractor: false },
      sc(),
    ).org,
    true,
  ));
test("changing fleet section must reject missing or short reason", () =>
  err(
    () =>
      assertFleetSectionChange(
        { org: true, contractor: true },
        { org: false, contractor: true },
        sc({ reason: " " }),
      ),
    422,
  ));
test("all public state names are unique and explicit", () =>
  assert.equal(new Set(WORKFLOW_STATES).size, WORKFLOW_STATES.length));

test("delegated edit must revalidate separate create-for-others grant", () => {
  const r = create(ctx(2)),
    c = ctx(2);
  c.grants = c.grants.filter(
    (g) => g.capability !== "workflow.create_for_others",
  );
  err(
    () => step(r, "edit", { version: 1, reason: "اصلاح اطلاعات درخواست" }, c),
    403,
  );
});
