import test from "node:test";
import assert from "node:assert/strict";
import {
  vehicleTypeDTO,
  listVehicleTypes,
  resolveVehicleType,
  assertVehicleTypesSchema,
} from "../backend/vehicle-types.mjs";

const active = {
  id: 2,
  code: "pickup_single",
  title: "وانت تک‌کابین",
  is_active: 1,
  version: 1,
  deleted_at: null,
};
const mock = (list) => ({
  calls: [],
  async execute(sql, args) {
    this.calls.push({ sql, args });
    return [list];
  },
});

test("vehicle type DTO exposes reference fields, with numeric and boolean types", () => {
  assert.deepEqual(vehicleTypeDTO({ ...active, id: "2", is_active: "0" }), {
    id: 2,
    code: "pickup_single",
    title: "وانت تک‌کابین",
    isActive: false,
    version: 1,
    deletedAt: null,
  });
});

test("reference list preserves inactive labels for existing vehicles", async () => {
  const db = mock([active, { ...active, id: 3, is_active: 0 }]);
  const list = await listVehicleTypes(db);
  assert.equal(list.length, 2);
  assert.equal(list[1].isActive, false);
});

test("reference list has an explicit capacity bound", async () => {
  await assert.rejects(
    () => listVehicleTypes(mock(Array(2001).fill(active))),
    (e) => e.status === 413,
  );
});

test("type lookup uses a bound parameter and a shared row lock", async () => {
  const db = mock([active]);
  assert.equal((await resolveVehicleType(db, "pickup_single")).id, 2);
  assert.deepEqual(db.calls[0].args, ["pickup_single"]);
  assert.match(db.calls[0].sql, /WHERE code=\? LOCK IN SHARE MODE/);
});

test("unknown codes are rejected rather than silently substituted", async () => {
  await assert.rejects(
    () => resolveVehicleType(mock([]), "unknown"),
    (e) => e.status === 422,
  );
});

test("invalid or injectable type codes never reach the database", async () => {
  for (const code of ["bad-code", "x' OR 1=1", "__proto__", "", null]) {
    const db = mock([active]);
    await assert.rejects(
      () => resolveVehicleType(db, code),
      (e) => e.status === 422,
    );
    assert.equal(db.calls.length, 0);
  }
});

test("client id and code must describe the same type", async () => {
  await assert.rejects(
    () => resolveVehicleType(mock([active]), active.code, null, 3),
    (e) => e.status === 409,
  );
  assert.equal(
    (await resolveVehicleType(mock([active]), active.code, null, 2)).id,
    2,
  );
});

test("an inactive type cannot be assigned to a new vehicle", async () => {
  await assert.rejects(
    () => resolveVehicleType(mock([{ ...active, is_active: 0 }]), active.code),
    (e) => e.status === 422,
  );
});

test("a deleted type cannot be newly assigned", async () => {
  await assert.rejects(
    () =>
      resolveVehicleType(
        mock([{ ...active, deleted_at: "2026-10-23 20:00:00" }]),
        active.code,
      ),
    (e) => e.status === 422,
  );
});

test("editing other vehicle fields may retain its existing inactive type", async () => {
  const db = mock([{ ...active, is_active: 0 }]);
  assert.equal((await resolveVehicleType(db, active.code, 2, 2)).id, 2);
});

test("changing to a different inactive type remains forbidden", async () => {
  await assert.rejects(
    () =>
      resolveVehicleType(mock([{ ...active, is_active: 0 }]), active.code, 99),
    (e) => e.status === 422,
  );
});

test("schema version 1 fails before the API starts accepting requests", async () => {
  const db = mock([{ version: 1 }]);
  await assert.rejects(() => assertVehicleTypesSchema(db), /نسخهٔ ۲/);
  assert.equal(db.calls.length, 1);
});

test("schema version 2 checks both required structures", async () => {
  const db = mock([{ version: 2 }]);
  await assertVehicleTypesSchema(db);
  assert.equal(db.calls.length, 3);
  assert.match(db.calls[1].sql, /vehicle_types LIMIT 0/);
  assert.match(db.calls[2].sql, /vehicle_type_id FROM vehicles LIMIT 0/);
});

test("a migration marker cannot hide missing physical columns", async () => {
  const db = {
    calls: 0,
    async execute() {
      this.calls++;
      if (this.calls === 1) return [[{ version: 2 }]];
      throw new Error("Missing table");
    },
  };
  await assert.rejects(() => assertVehicleTypesSchema(db), /Missing table/);
});
