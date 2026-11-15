import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  restoreVehicle,
  deletedVehicles,
  applyEmergency,
  loadEmergencyPlan,
  freshFleetUser,
  emergencyPreview,
} from "../backend/fleet-recovery.mjs";
import { fixture } from "./fleet-fixtures.mjs";
const admin = { id: 1, role_code: "admin", active: 1, auth_version: 1 };
function mock(options = {}) {
  const s = fixture(),
    calls = [];
  let old = null;
  const v = {
    ...s.source,
    body_type: "sedan",
    plate_key: "S",
    deleted_at: "2098-01-01",
  };
  const db = {
    async execute(sql, args = []) {
      calls.push({ sql, args });
      if (sql.includes("SELECT id,role_code,active,auth_version FROM users"))
        return [[options.fresh || admin]];
      if (sql.startsWith("SELECT body_hash,response"))
        return [[...(old ? [old] : [])]];
      if (sql.startsWith("SELECT * FROM vehicles WHERE id="))
        return [[options.emergency ? s.source : v]];
      if (sql.includes("FROM vehicle_types WHERE code="))
        return [
          [
            {
              id: 1,
              code: "sedan",
              title: "test",
              is_active: options.inactive ? 0 : 1,
              version: 1,
              deleted_at: null,
            },
          ],
        ];
      if (sql.startsWith("SELECT id FROM vehicles WHERE plate_key="))
        return [options.duplicate ? [{ id: 99 }] : []];
      if (sql.startsWith("SELECT id FROM transport_requests"))
        return [options.open ? [{ id: 99 }] : []];
      if (sql.startsWith("SELECT user_id FROM user_vehicles"))
        return [[{ user_id: 11 }]];
      if (sql.includes("WHERE deleted_at IS NOT NULL AND id<"))
        return [
          [
            ...Array.from({ length: 51 }, (_, i) => ({
              id: 100 - i,
              name: "x",
              plate: "x",
              version: 4,
              deleted_at: "x",
            })),
          ],
        ];
      if (sql.startsWith("SELECT * FROM transport_requests WHERE vehicle_id="))
        return [s.open];
      if (sql.startsWith("SELECT v.*,t.is_active")) return [s.vehicles];
      if (sql.startsWith("SELECT uv.vehicle_id")) return [s.drivers];
      if (sql.startsWith("SELECT r.id,r.vehicle_id")) return [s.bookings];
      if (sql.startsWith("INSERT INTO idempotency_keys")) {
        old = { body_hash: args[2], response: args[3] };
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    },
    async query(sql) {
      calls.push({ sql, args: [] });
    },
    async beginTransaction() {
      calls.push({ sql: "begin" });
    },
    async commit() {
      calls.push({ sql: "commit" });
    },
    async rollback() {
      calls.push({ sql: "rollback" });
    },
    release() {
      calls.push({ sql: "release" });
    },
  };
  return { db, s, v, calls };
}
const body = { version: 4, reason: "بازیابی آزمایشی مجاز" };
const status = (n) => (e) => e.status === n;
test("restore is admin-only and validates reason before writes", async () => {
  const f = mock();
  await assert.rejects(
    restoreVehicle(f.db, { ...admin, role_code: "dispatcher" }, 1, body),
    status(403),
  );
  await assert.rejects(
    restoreVehicle(f.db, admin, 1, { ...body, reason: "x" }),
    status(422),
  );
  assert.equal(f.calls.length, 0);
});
test("restore rejects stale version, inactive type, duplicate plate and open requests", async () => {
  for (const [options, expected] of [
    [{}, 409],
    [{ inactive: true }, 422],
    [{ duplicate: true }, 409],
    [{ open: true }, 409],
  ]) {
    const f = mock(options);
    await assert.rejects(
      restoreVehicle(f.db, admin, 1, {
        ...body,
        version: options.inactive || options.duplicate || options.open ? 4 : 3,
      }),
      status(expected),
    );
    assert(!f.calls.some((c) => /^(UPDATE|DELETE|INSERT)/.test(c.sql)));
  }
});
test("restore clears old driver links, sets maintenance, and records reason", async () => {
  const f = mock();
  const r = await restoreVehicle(f.db, admin, 1, body);
  assert.equal(r.status, "maintenance");
  assert(f.calls.some((c) => c.sql.startsWith("DELETE FROM user_vehicles")));
  assert(
    f.calls.some((c) => c.sql.includes("deleted_at=NULL,status='maintenance'")),
  );
  const audit = f.calls.find((c) => c.sql.startsWith("INSERT INTO audit_log"));
  assert.equal(audit.args[1], "vehicles.restore");
  assert.equal(JSON.parse(audit.args[4]).reason, body.reason);
});
test("deleted list revalidates role and returns only bounded non-secret fields", async () => {
  const f = mock();
  const r = await deletedVehicles(f.db, admin, null);
  assert.equal(r.items.length, 50);
  assert.equal(r.cursor, 51);
  assert.equal(r.items[0].id, 100);
  assert(!("password_hash" in r.items[0]));
  await assert.rejects(
    deletedVehicles(
      mock({ fresh: { ...admin, role_code: "requester" } }).db,
      admin,
      null,
    ),
    status(403),
  );
  await assert.rejects(
    freshFleetUser(mock({ fresh: { ...admin, auth_version: 2 } }).db, admin),
    status(401),
  );
});
test("old one-click emergency payload cannot perform any writes", async () => {
  const f = mock({ emergency: true });
  await assert.rejects(
    applyEmergency(f.db, admin, 1, { version: 4 }, randomUUID()),
  );
  assert.equal(f.calls.length, 0);
});
test("stale preview stops before changing source or missions", async () => {
  const f = mock({ emergency: true });
  await assert.rejects(
    applyEmergency(
      f.db,
      admin,
      1,
      {
        version: 4,
        reason: "خرابی آزمایشی خودرو",
        acknowledged: true,
        fingerprint: "0".repeat(64),
      },
      randomUUID(),
    ),
    status(409),
  );
  assert(!f.calls.some((c) => /^(INSERT|UPDATE|DELETE)/.test(c.sql)));
});
test("application records source status, target drivers, reason and idempotent response", async () => {
  const f = mock({ emergency: true });
  const plan = await loadEmergencyPlan(f.db, 1, 4);
  const b = {
      version: 4,
      reason: "خرابی آزمایشی خودرو",
      acknowledged: true,
      fingerprint: plan.fingerprint,
    },
    key = randomUUID();
  const result = await applyEmergency(f.db, admin, 1, b, key);
  assert.equal(result.moved, 1);
  assert(f.calls.some((c) => c.sql.includes("SET status='down'")));
  assert(f.calls.some((c) => c.sql.includes("AND status='scheduled'")));
  assert(
    f.calls.some(
      (c) =>
        c.sql.startsWith("INSERT INTO request_drivers") && c.args[1] === 20,
    ),
  );
  assert(f.calls.some((c) => c.sql.includes("FOR UPDATE")));
  const writes = f.calls.filter((c) =>
    /^(INSERT|UPDATE|DELETE)/.test(c.sql),
  ).length;
  const second = await applyEmergency(f.db, admin, 1, b, key);
  assert.deepEqual(second, result);
  assert.equal(
    f.calls.filter((c) => /^(INSERT|UPDATE|DELETE)/.test(c.sql)).length,
    writes,
  );
  await assert.rejects(
    applyEmergency(
      f.db,
      admin,
      1,
      { ...b, reason: "دلیل متفاوت آزمایشی" },
      key,
    ),
    status(409),
  );
});
test("preview is read-only, commits the read snapshot and releases connection", async () => {
  const f = mock({ emergency: true });
  const plan = await emergencyPreview(
    {
      async getConnection() {
        return f.db;
      },
    },
    admin,
    1,
    4,
  );
  assert.equal(plan.moves.length, 1);
  assert(f.calls.some((c) => c.sql === "commit"));
  assert.equal(f.calls.at(-1).sql, "release");
  assert(!f.calls.some((c) => /^(INSERT|UPDATE|DELETE)/.test(c.sql)));
});
