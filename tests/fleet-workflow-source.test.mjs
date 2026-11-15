import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
test("restoration and crisis mutations run after authoritative user/actor checks", async () => {
  const source = await read("backend/domain.mjs");
  assert(
    source.indexOf("await setHistoryActor(db, u.id)") <
      source.indexOf("return restoreVehicle("),
  );
  assert.match(source, /return applyEmergency\(db, u, id, b, key\)/);
  assert.doesNotMatch(source, /ORDER BY n\/v\.cargo_capacity/);
});
test("preview and deleted list GET routes precede write routing and use secured helpers", async () => {
  const source = await read("backend/server.mjs");
  assert(
    source.indexOf("await deletedVehicles(pool, s") <
      source.indexOf("    csrf(req, s);"),
  );
  assert.match(source, /await emergencyPreview\(/);
});
test("dynamic workflow text is escaped and old instant confirmation is removed", async () => {
  const ui = await read("public/app.js");
  for (const str of [
    "esc(vehicle.name)",
    "esc(v.name)",
    "esc(r.targetName)",
    "esc(r.reason)",
    "esc(d.name)",
  ])
    assert(ui.includes(str), str);
  assert.match(ui, /پیش‌نمایش مدیریت بحران/);
  assert.match(ui, /acknowledged/);
  assert.doesNotMatch(
    ui,
    /مأموریت‌های باز با کنترل ظرفیت و شیفت به خودروهای دیگر منتقل شوند/,
  );
  assert.match(ui, /fleetDialogSequence\+\+/);
});
test("original modal pointer-down/up protection remains intact", async () => {
  const ui = await read("public/app.js");
  assert.match(ui, /event\.target !== press\.overlay/);
  assert.match(ui, /press\.moved/);
  assert.match(ui, /pointercancel/);
});
