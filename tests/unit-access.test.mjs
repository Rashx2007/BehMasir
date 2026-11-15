import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateUnitAccess,
  resolveUnitAccess,
  unitScopePredicate,
  UNIT_READ_PERMISSIONS,
} from "../backend/unit-access.mjs";
const units = [
  { id: 11, parent_id: null, name: "support", version: 1 },
  { id: 1, parent_id: 11, name: "office", version: 2 },
  { id: 3, parent_id: 11, name: "technical", version: 2 },
  { id: 9, parent_id: 3, name: "child", version: 1 },
  { id: 7, parent_id: null, name: "services", version: 2 },
];
const assignment = (unit_id, include_descendants = 1, active = 1) => ({
  unit_id,
  include_descendants,
  active,
});
const codes = ["requests.read", "reports.read"];
const status = (n) => (e) => e.status === n;
function fixture() {
  const state = {
    user: {
      id: 20,
      role_code: "unit_manager",
      active: 1,
      auth_version: 3,
      unit_id: 7,
    },
    assignments: [assignment(11)],
    codes: [...codes],
    calls: [],
  };
  const db = {
    async execute(sql, args = []) {
      state.calls.push({ sql, args });
      if (sql.startsWith("SELECT id,role_code,active,auth_version FROM users"))
        return [[state.user].filter(Boolean)];
      if (sql.startsWith("SELECT unit_id,include_descendants,active"))
        return [state.assignments];
      if (sql.startsWith("SELECT rp.permission_code"))
        return [state.codes.map((permission_code) => ({ permission_code }))];
      if (
        sql.startsWith("SELECT id,name,parent_id,version,used_ever FROM units")
      )
        return [units];
      throw Error("Unexpected fixture query");
    },
  };
  return { state, db };
}
test("parent scope includes only itself and its complete active subtree", () => {
  assert.deepEqual(
    evaluateUnitAccess(units, [assignment(11)], codes).unitIds,
    [1, 3, 9, 11],
  );
});
test("direct-only scope excludes children and never expands to a parent or sibling", () => {
  assert.deepEqual(
    evaluateUnitAccess(units, [assignment(3, 0)], codes).unitIds,
    [3],
  );
  assert.deepEqual(
    evaluateUnitAccess(units, [assignment(1)], codes).unitIds,
    [1],
  );
});
test("multiple explicit scopes union and deduplicate without granting unrelated units", () => {
  assert.deepEqual(
    evaluateUnitAccess(
      units,
      [assignment(11), assignment(1), assignment(7, 0)],
      codes,
    ).unitIds,
    [1, 3, 7, 9, 11],
  );
});
test("inactive assignments cannot contribute to access", () => {
  assert.deepEqual(
    evaluateUnitAccess(units, [assignment(11, 1, 0), assignment(7, 0)], codes)
      .unitIds,
    [7],
  );
});
test("missing assignments deny all rows, regardless of role title", () => {
  assert.deepEqual(
    unitScopePredicate(evaluateUnitAccess(units, [], codes), "requests.read"),
    ["0=1", []],
  );
});
test("scope without granted permission does not grant rows", () => {
  assert.deepEqual(evaluateUnitAccess(units, [assignment(11)], []).unitIds, []);
});
test("permissions are independent: report grant does not imply detailed requests", () => {
  const a = evaluateUnitAccess(units, [assignment(11)], ["reports.read"]);
  assert.deepEqual(unitScopePredicate(a, "requests.read"), ["0=1", []]);
  assert.deepEqual(unitScopePredicate(a, "reports.read")[1], [1, 3, 9, 11]);
});
test("wildcards and future operational permission names never grant capabilities", () => {
  const a = evaluateUnitAccess(
    units,
    [assignment(11)],
    ["*", "requests.approve", "fleet.write"],
  );
  assert.deepEqual(a, { permissions: [], unitIds: [] });
  assert.deepEqual(UNIT_READ_PERMISSIONS, ["requests.read", "reports.read"]);
});
test("missing or deleted scope root fails closed instead of becoming global", () => {
  assert.throws(
    () => evaluateUnitAccess(units, [assignment(999)], codes),
    status(409),
  );
});
test("malformed assignment flags and identities fail closed", () => {
  for (const a of [assignment("11"), assignment(11, 2), assignment(11, 1, "1")])
    assert.throws(() => evaluateUnitAccess(units, [a], codes), status(409));
});
test("scope count capacity is bounded", () => {
  assert.throws(
    () =>
      evaluateUnitAccess(
        units,
        Array.from({ length: 101 }, () => assignment(11)),
        codes,
      ),
    status(413),
  );
});
test("existing invalid tree is not silently treated as a valid scope", () => {
  assert.throws(
    () =>
      evaluateUnitAccess(
        [{ id: 1, name: "bad", parent_id: 1, version: 1 }],
        [assignment(1)],
        codes,
      ),
    status(409),
  );
});
test("parent moves change effective ancestry; renames do not change identity scopes", () => {
  const a = evaluateUnitAccess(units, [assignment(11)], codes);
  const renamed = units.map((u) => ({ ...u, name: "renamed-" + u.id }));
  assert.deepEqual(evaluateUnitAccess(renamed, [assignment(11)], codes), a);
  const moved = units.map((u) => (u.id === 3 ? { ...u, parent_id: 7 } : u));
  assert.deepEqual(
    evaluateUnitAccess(moved, [assignment(11)], codes).unitIds,
    [1, 11],
  );
});
test("scope SQL binds IDs and validates aliases, unknown actions always deny", () => {
  const a = evaluateUnitAccess(units, [assignment(11)], codes);
  assert.deepEqual(unitScopePredicate(a, "requests.read", "req"), [
    "req.unit_id IN (?,?,?,?)",
    [1, 3, 9, 11],
  ]);
  assert.throws(
    () => unitScopePredicate(a, "requests.read", "r OR 1=1"),
    status(422),
  );
  assert.deepEqual(unitScopePredicate(a, "requests.approve"), ["0=1", []]);
  assert.throws(
    () =>
      unitScopePredicate(
        { permissions: codes, unitIds: ["1) OR 1=1"] },
        "requests.read",
      ),
    status(409),
  );
});
test("loader revalidates user role and auth version from database, not submitted role", async () => {
  const f = fixture();
  const a = await resolveUnitAccess(f.db, 20, 3);
  assert.deepEqual(a.unitIds, [1, 3, 9, 11]);
  assert(!a.unitIds.includes(f.state.user.unit_id));
  assert.deepEqual(f.state.calls[0].args, [20]);
  for (const c of f.state.calls) assert(!/INSERT|UPDATE |DELETE /.test(c.sql));
});
test("inactive, missing or stale user is rejected before scope lookup", async () => {
  for (const change of [
    (f) => (f.state.user = null),
    (f) => (f.state.user.active = 0),
    (f) => (f.state.user.auth_version = 4),
  ]) {
    const f = fixture();
    change(f);
    await assert.rejects(resolveUnitAccess(f.db, 20, 3), status(401));
    assert.equal(f.state.calls.length, 1);
  }
});
test("legacy and unknown roles are not silently promoted by new evaluator", async () => {
  for (const role of [
    "admin",
    "dispatcher",
    "requester",
    "driver",
    "unknown",
  ]) {
    const f = fixture();
    f.state.user.role_code = role;
    await assert.rejects(resolveUnitAccess(f.db, 20, 3), status(403));
  }
});
test("loader sees current grants on every call; there is no stale permission cache", async () => {
  const f = fixture();
  assert(
    (await resolveUnitAccess(f.db, 20, 3)).permissions.includes(
      "requests.read",
    ),
  );
  f.state.codes = ["reports.read"];
  assert(
    !(await resolveUnitAccess(f.db, 20, 3)).permissions.includes(
      "requests.read",
    ),
  );
  f.state.assignments = [];
  assert.deepEqual((await resolveUnitAccess(f.db, 20, 3)).unitIds, []);
});
test("loader refuses excessive granted permission rows", async () => {
  const f = fixture();
  f.state.codes = Array(101).fill("reports.read");
  await assert.rejects(resolveUnitAccess(f.db, 20, 3), status(413));
});
