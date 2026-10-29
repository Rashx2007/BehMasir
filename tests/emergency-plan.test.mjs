import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEmergencyPlan,
  compatibleEmergencyTarget,
} from "../backend/emergency-plan.mjs";
import { fixture } from "./fleet-fixtures.mjs";
const plan = (s) => buildEmergencyPlan(s, "2099-01-01");
test("eligible scheduled request gets a compatible target and named active driver", () => {
  const s = fixture(),
    p = plan(s);
  assert.equal(p.moves.length, 1);
  assert.equal(p.moves[0].targetId, 2);
  assert.deepEqual(
    p.moves[0].drivers.map((d) => d.id),
    [20],
  );
  assert.deepEqual(p.moves[0].previousDriverIds, [11]);
  assert.equal(p.resultingStatus, "down");
  assert.equal(p.fingerprint.length, 64);
});
test("planning is pure and deterministic", () => {
  const s = fixture();
  const before = structuredClone(s);
  assert.deepEqual(plan(s), plan(s));
  assert.deepEqual(s, before);
});
test("enroute requests are never moved automatically", () => {
  const s = fixture();
  s.open[0].status = "enroute";
  const p = plan(s);
  assert.equal(p.moves.length, 0);
  assert.equal(p.blocked[0].code, "enroute");
});
test("past scheduled requests require manual reconciliation", () => {
  const s = fixture();
  s.open[0].service_date = "2098-12-31";
  assert.equal(plan(s).blocked[0].code, "past");
});
test("target with no active assigned driver is not usable", () => {
  const s = fixture();
  s.drivers = [];
  assert.equal(plan(s).moves.length, 0);
});
test("unavailable and deleted targets are excluded", () => {
  for (const changes of [
    { status: "down" },
    { status: "maintenance" },
    { deleted_at: "x" },
    { type_active: 0 },
    { type_deleted_at: "x" },
  ]) {
    const s = fixture();
    Object.assign(s.vehicles[1], changes);
    assert.equal(plan(s).moves.length, 0);
  }
});
test("service, cold-chain, body type, ownership and capacity never silently downgrade", () => {
  for (const changes of [
    { service_type: "cargo" },
    { has_fridge: 0 },
    { fridge_capacity: 2 },
    { vehicle_type_id: 2 },
    { ownership: "contractor" },
    { passenger_capacity: 2 },
    { cargo_capacity: 4 },
    { cargo_capacity: 0 },
  ]) {
    const s = fixture();
    Object.assign(s.vehicles[1], changes);
    assert.equal(plan(s).moves.length, 0, JSON.stringify(changes));
  }
});
test("cross-contractor transfer is not inferred", () => {
  const s = fixture();
  s.source.ownership = "contractor";
  s.source.contractor_name = "A";
  s.vehicles[1].ownership = "contractor";
  s.vehicles[1].contractor_name = "B";
  assert.equal(plan(s).moves.length, 0);
  s.vehicles[1].contractor_name = "A";
  assert.equal(plan(s).moves.length, 1);
});
test("target both-service can preserve a cargo service", () => {
  const s = fixture();
  s.source.service_type = "cargo";
  assert(compatibleEmergencyTarget(s.source, s.vehicles[1]));
});
test("out-of-shift target is rejected; overnight shift is supported", () => {
  const s = fixture();
  s.vehicles[1].shift_start = "21:00:00";
  s.vehicles[1].shift_end = "06:00:00";
  assert.equal(plan(s).moves.length, 0);
  s.open[0].service_time = "23:00:00";
  assert.equal(plan(s).moves.length, 1);
});
test("delivered bookings consume daily quota and duplicate driver rows count once", () => {
  const s = fixture();
  for (let i = 0; i < 5; i++)
    s.bookings.push({
      ...s.open[0],
      id: 100 + i,
      vehicle_id: 2,
      status: "delivered",
      driver_id: 30,
    });
  assert.equal(plan(s).moves.length, 0);
  s.bookings.pop();
  s.bookings.push({ ...s.bookings.at(-1), driver_id: 31 });
  assert.equal(plan(s).moves.length, 1);
});
test("without trip duration an occupied target is not assigned another open trip that day", () => {
  const s = fixture();
  s.bookings.push({ ...s.open[0], id: 12, vehicle_id: 2, driver_id: 22 });
  assert.equal(plan(s).moves.length, 0);
});
test("driver booked on another vehicle that day is rejected", () => {
  const s = fixture();
  s.bookings.push({ ...s.open[0], id: 12, vehicle_id: 3, driver_id: 20 });
  assert.equal(plan(s).moves.length, 0);
});
test("a free driver remains usable even when another assigned driver is busy", () => {
  const s = fixture();
  s.drivers.push({ vehicle_id: 2, id: 21, name: "free", auth_version: 1 });
  s.bookings.push({ ...s.open[0], id: 12, vehicle_id: 3, driver_id: 20 });
  assert.deepEqual(
    plan(s).moves[0].drivers.map((d) => d.id),
    [21],
  );
});
test("new allocations consume target availability inside the same plan", () => {
  const s = fixture();
  s.open.push({ ...s.open[0], id: 11 });
  const p = plan(s);
  assert.equal(p.moves.length, 1);
  assert.equal(p.blocked.length, 1);
});
test("fingerprint catches driver, source, request and target changes", () => {
  const s = fixture();
  const original = plan(s).fingerprint;
  for (const mutate of [
    (x) => x.source.version++,
    (x) => x.vehicles[1].cargo_capacity++,
    (x) => x.drivers[0].auth_version++,
    (x) => x.open[0].version++,
  ]) {
    const copy = structuredClone(s);
    mutate(copy);
    assert.notEqual(plan(copy).fingerprint, original);
  }
});
