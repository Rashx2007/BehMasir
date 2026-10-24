import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL("../" + file, import.meta.url), "utf8");

test("all vehicle insert entry points supply the new foreign key", async () => {
  for (const file of ["backend/seed-catalog.mjs", "backend/import-local.mjs"]) {
    const source = await read(file);
    const inserts = [...source.matchAll(/INSERT INTO vehicles\(([^)]+)\)/g)];
    assert.equal(inserts.length, 1, file);
    assert.match(inserts[0][1], /vehicle_type_id/, file);
    assert.match(source, /await resolveVehicleType\(/, file);
  }
  const domain = await read("backend/domain.mjs");
  assert.match(domain, /"vehicle_type_id"/);
  assert.match(domain, /await resolveVehicleType\(/);
  assert.doesNotMatch(domain, /choice\(b\.bodyType/);
});

test("database-supplied type labels are escaped in both UI surfaces", async () => {
  const source = await read("public/app.js");
  assert.match(source, /const BODY_TYPE_LABELS = Object\.create\(null\)/);
  assert.match(
    source,
    /\$\{esc\(BODY_TYPE_LABELS\[car\.bodyType\] \|\| car\.bodyType\)\}/,
  );
  assert.match(source, /\$\{esc\(t\.title\)\}/);
  assert.match(source, /\$\{esc\(t\.code\)\}/);
  assert.match(source, /serverVehicleTypes = d\.vehicleTypes/);
});

test("schema readiness is checked before the server listens", async () => {
  const source = await read("backend/server.mjs");
  const guard = source.indexOf("await assertVehicleTypesSchema(pool)");
  const listen = source.indexOf("server.listen(");
  assert(guard > 0 && guard < listen);
});
