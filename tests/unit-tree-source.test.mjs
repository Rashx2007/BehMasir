import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
test("unit mutation routes delegate under existing role revalidation and history transaction", async () => {
  const s = await read("backend/domain.mjs");
  assert(
    s.indexOf("fresh.auth_version") <
      s.indexOf("response = await changeUnitParent"),
  );
  assert.match(s, /manage\(u\); \/\/ Existing policy/);
  for (const helper of ["createUnit", "changeUnitParent", "deleteUnit"])
    assert(s.includes("await " + helper + "(db,"));
  assert.match(s, /await listUnitRows\(c\)/);
  assert.match(s, /const unitRecords = unitTree\(units\)/);
});
test("invalid tree fails startup before HTTP listen", async () => {
  const s = await read("backend/server.mjs");
  assert(
    s.indexOf("await assertUnitTreeSchema(pool)") < s.indexOf("server.listen("),
  );
});
test("unit forms send versions and numeric/null parents and exclude descendants from choices", async () => {
  const s = await read("public/app.js");
  assert.match(s, /!r.ancestorIds.includes\(excludedId\)/);
  assert.match(s, /version: expectedVersion/);
  assert.match(s, /version: r.version/);
  assert.match(s, /value === "" \? null : Number\(value\)/);
  assert.match(s, /esc\(r.path\)/);
  assert.match(s, /esc\(r.name\)/);
  assert.match(s, /esc\(parent.name\)/);
  assert.match(s, /دسترسی‌های محدوده‌دار هنوز فعال نشده‌اند/);
});
test("UI validates tree DTO and clears prior-session unit records", async () => {
  const s = await read("public/app.js");
  assert.match(s, /!Array.isArray\(r.ancestorIds\)/);
  assert.match(s, /requesterUnits = \[\];\s+serverUnitRecords = \[\];/);
});

test("unit rename uses the same backend authorization path and captured version in escaped form", async () => {
  const d = await read("backend/domain.mjs"),
    ui = await read("public/app.js");
  assert.match(d, /response = await renameUnit\(db, id, b\)/);
  assert.match(ui, /saveUnitRename\(\$\{r.id\},\$\{r.version\}\)/);
  assert.match(ui, /id="unitRenameInput"[^>]*value="\$\{esc\(r.name\)\}"/);
  assert.match(ui, /"units\/" \+ id \+ "\/name"/);
});
test("unit dashboard aggregates by stable identity while request DTO retains historical name", async () => {
  const d = await read("backend/domain.mjs");
  assert.match(d, /GROUP BY r.unit_id,un.name/);
  assert.doesNotMatch(d, /GROUP BY r.unit_name/);
  assert.match(d, /unit: r.unit_name/);
});
