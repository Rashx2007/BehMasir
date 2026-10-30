import test from "node:test";
import assert from "node:assert/strict";
import {
  scopedState,
  scopedHistory,
  scopedReports,
} from "../backend/scoped-read.mjs";
import { scopedFixture, mapRequest } from "./scoped-read-fixtures.mjs";
const code = (n) => (e) => e.status === n;
test("scoped state exposes only allowed requests, aggregate totals, own safe profile and no global catalogs", async () => {
  const { state, db } = scopedFixture();
  const d = await scopedState(db, state.user, mapRequest);
  assert.deepEqual(
    d.samples.map((x) => x.id),
    [109, 110],
  );
  assert.deepEqual(
    d.history.map((x) => x.id),
    [108],
  );
  assert.equal(d.scopeReport.total, 4);
  assert.equal(d.scopeReport.byStatus.cancelled, 1);
  for (const key of [
    "vehicles",
    "vehicleTypes",
    "centers",
    "units",
    "unitRecords",
    "usedUnits",
    "capacityUsage",
  ])
    assert.deepEqual(d[key], []);
  assert.equal(d.dashboard, null);
  assert.equal(d.users.length, 1);
  assert.equal(d.currentUser.id, 20);
  assert(!JSON.stringify(d).includes("OUTSIDE_CANARY"));
  assert(!JSON.stringify(d).includes("SECRET_HASH"));
  assert.deepEqual(d.currentUser.access.unitIds, [1, 3, 9, 11]);
  assert.equal(d.scopedReadVersion, 1);
  assert(
    state.calls.every((x) => x.sql.startsWith("SELECT ")),
    "read path performs no mutations",
  );
});
test("direct child scope does not expose ancestor names or sibling requests", async () => {
  const { state, db } = scopedFixture();
  state.assignments = [{ unit_id: 1, include_descendants: 0, active: 1 }];
  const d = await scopedState(db, state.user, mapRequest);
  assert.deepEqual(d.scopeUnits, [{ id: 1, name: "office", parentId: null }]);
  assert.deepEqual(
    d.samples.map((x) => x.id),
    [110],
  );
  assert.equal(d.scopeReport.total, 1);
});
test("role title without an explicit assignment grants zero data, not global fallback", async () => {
  const { state, db } = scopedFixture();
  state.assignments = [];
  const d = await scopedState(db, state.user, mapRequest);
  assert.deepEqual(d.samples, []);
  assert.deepEqual(d.history, []);
  assert.deepEqual(d.scopeUnits, []);
  assert.equal(d.scopeReport.total, 0);
});
test("report-only grant does not issue detail request queries or grant history", async () => {
  const { state, db } = scopedFixture();
  state.permissions = ["reports.read"];
  const d = await scopedState(db, state.user, mapRequest);
  assert.deepEqual(d.samples, []);
  assert.deepEqual(d.history, []);
  assert.equal(d.scopeReport.total, 4);
  assert(!state.calls.some((x) => x.sql.startsWith("SELECT r.*")));
  await assert.rejects(
    () => scopedHistory(db, state.user, 999, mapRequest),
    code(403),
  );
});
test("detail-only grant does not imply reports; no grant clears both", async () => {
  const { state, db } = scopedFixture();
  state.permissions = ["requests.read"];
  assert.equal(
    (await scopedState(db, state.user, mapRequest)).scopeReport,
    null,
  );
  await assert.rejects(() => scopedReports(db, state.user), code(403));
  state.permissions = [];
  const d = await scopedState(db, state.user, mapRequest);
  assert.deepEqual(d.scopeUnits, []);
  assert.deepEqual(d.samples, []);
  assert.equal(d.scopeReport, null);
});
test("revocation is re-evaluated even when revision did not change", async () => {
  const { state, db } = scopedFixture();
  const a = await scopedState(db, state.user, mapRequest);
  state.assignments[0].active = 0;
  const b = await scopedState(db, state.user, mapRequest);
  assert.equal(a.revision, b.revision);
  assert.equal(b.samples.length, 0);
  assert.equal(b.scopeReport.total, 0);
});
test("history cursor remains a parameter and cannot escape unit scope", async () => {
  const { state, db } = scopedFixture();
  let d = await scopedHistory(db, state.user, 999, mapRequest);
  assert.deepEqual(
    d.items.map((x) => x.id),
    [108],
  );
  assert.deepEqual(d.access.unitIds, [1, 3, 9, 11]);
  d = await scopedHistory(db, state.user, 108, mapRequest);
  assert.deepEqual(d.items, []);
  const last = state.calls.findLast((x) => x.sql.includes("r.id<?"));
  assert.deepEqual(last.args, [1, 3, 9, 11, 108]);
  await assert.rejects(
    () => scopedHistory(db, state.user, "1 OR 1=1", mapRequest),
    code(422),
  );
});
test("history pagination gives 200 unique records per page and advances twice", async () => {
  const { state, db } = scopedFixture();
  state.requests = Array.from({ length: 450 }, (_, i) => ({
    id: 1000 - i,
    unit_id: 1,
    status: "delivered",
  }));
  const a = await scopedState(db, state.user, mapRequest),
    b = await scopedHistory(db, state.user, a.historyCursor, mapRequest),
    c = await scopedHistory(db, state.user, b.cursor, mapRequest);
  assert.equal(a.history.length, 200);
  assert.equal(b.items.length, 200);
  assert.equal(c.items.length, 50);
  assert.equal(c.cursor, null);
  assert.equal(
    new Set([...a.history, ...b.items, ...c.items].map((x) => x.id)).size,
    450,
  );
});
test("open request limit fails closed rather than silently hiding records", async () => {
  const { state, db } = scopedFixture();
  state.requests = Array.from({ length: 5001 }, (_, i) => ({
    id: i + 1,
    unit_id: 1,
    status: "scheduled",
  }));
  await assert.rejects(
    () => scopedState(db, state.user, mapRequest),
    code(413),
  );
});
test("inactive, stale and legacy role sessions cannot use scoped detail queries", async () => {
  for (const [field, value, status] of [
    ["active", 0, 401],
    ["auth_version", 4, 401],
    ["role_code", "admin", 403],
  ]) {
    const { state, db } = scopedFixture();
    const u = { ...state.user };
    state.user[field] = value;
    await assert.rejects(() => scopedState(db, u, mapRequest), code(status));
    assert(!state.calls.some((x) => x.sql.includes("FROM transport_requests")));
  }
});
