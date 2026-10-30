import test from "node:test";
import assert from "node:assert/strict";
import {
  unitTree,
  listUnitRows,
  createUnit,
  changeUnitParent,
  renameUnit,
  deleteUnit,
  UNIT_TREE_LIMITS,
} from "../backend/unit-tree.mjs";
const record = (id, parent_id = null, extra = {}) => ({
  id,
  parent_id,
  name: "unit-" + id,
  version: 1,
  used_ever: 0,
  ...extra,
});
const sample = () => [record(1), record(2, 1), record(3, 2), record(4)];
function fixture(list = sample()) {
  const state = {
    records: structuredClone(list),
    users: [],
    assignments: [],
    requests: [],
    calls: [],
    next: 100,
  };
  const db = {
    async execute(sql, args = []) {
      state.calls.push({ sql, args });
      if (
        sql.startsWith("SELECT id,name,parent_id,version,used_ever FROM units")
      )
        return [structuredClone(state.records.filter((r) => !r.deleted_at))];
      if (sql.startsWith("SELECT id FROM units WHERE name="))
        return [
          state.records
            .filter(
              (r) =>
                r.id !== args[1] &&
                r.name.toLowerCase() === args[0].toLowerCase(),
            )
            .slice(0, 1),
        ];
      if (sql.startsWith("UPDATE units SET name=")) {
        const r = state.records.find((r) => r.id === args[1]);
        r.name = args[0];
        r.version++;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("INSERT INTO units")) {
        const id = state.next++;
        state.records.push(record(id, args[1], { name: args[0] }));
        return [{ insertId: id, affectedRows: 1 }];
      }
      if (sql.startsWith("UPDATE units SET parent_id=")) {
        const r = state.records.find((r) => r.id === args[1]);
        r.parent_id = args[0];
        r.version++;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("SELECT id FROM users"))
        return [state.users.filter((r) => r.unit_id === args[0]).slice(0, 1)];
      if (sql.startsWith("SELECT id FROM transport_requests"))
        return [
          state.requests.filter((r) => r.unit_id === args[0]).slice(0, 1),
        ];
      if (sql.startsWith("SELECT id FROM unit_role_assignments"))
        return [
          state.assignments
            .filter((r) => r.unit_id === args[0] && r.active === 1)
            .slice(0, 1),
        ];
      if (sql.startsWith("UPDATE units SET deleted_at=")) {
        const r = state.records.find((r) => r.id === args[0]);
        r.deleted_at = "2099-01-01";
        r.version++;
        return [{ affectedRows: 1 }];
      }
      throw Error("Unexpected fixture SQL");
    },
  };
  return { db, state };
}
const status = (expected) => (error) => error.status === expected;
test("forest preserves several roots and orders each subtree deterministically", () => {
  assert.deepEqual(
    unitTree(sample().reverse()).map((r) => r.id),
    [1, 2, 3, 4],
  );
});
test("tree DTO exposes version, ancestry, depth and path without merging duplicate labels", () => {
  const tree = unitTree(sample());
  assert.deepEqual(tree[2].ancestorIds, [1, 2]);
  assert.equal(tree[2].depth, 2);
  assert.equal(tree[2].path, "unit-1 / unit-2 / unit-3");
  assert.equal(tree[2].version, 1);
  assert.equal(
    unitTree([record(1), record(2, null, { name: "unit-1" })]).length,
    2,
  );
});
test("empty organization is a valid forest", () =>
  assert.deepEqual(unitTree([]), []));
test("self cycle in stored data fails closed", () =>
  assert.throws(() => unitTree([record(1, 1)]), status(409)));
test("multi-node and disconnected cycles fail closed", () => {
  for (const list of [
    [record(1, 2), record(2, 1)],
    [record(3), record(1, 2), record(2, 1)],
  ])
    assert.throws(() => unitTree(list), status(409));
});
test("active units pointing to missing or deleted parents are not silently promoted", () => {
  assert.throws(() => unitTree([record(1, 2)]), status(409));
});
test("duplicate and malformed stored IDs are rejected", () => {
  for (const list of [
    [record(1), record(1)],
    [record("1")],
    [record(1, "2")],
    [record(0)],
  ])
    assert.throws(() => unitTree(list), status(409));
});
test("maximum depth is 32 levels including roots", () => {
  const list = Array.from({ length: 32 }, (_, i) => record(i + 1, i || null));
  assert.equal(unitTree(list).at(-1).depth, 31);
  assert.throws(() => unitTree([...list, record(33, 32)]), status(409));
});
test("capacity bound rejects 2001 units instead of truncating", () => {
  assert.equal(UNIT_TREE_LIMITS.units, 2000);
  assert.throws(
    () => unitTree(Array.from({ length: 2001 }, (_, i) => record(i + 1))),
    status(413),
  );
});
test("database list is bounded and uses explicit lock only for mutations", async () => {
  const f = fixture();
  await listUnitRows(f.db);
  await listUnitRows(f.db, true);
  assert.match(f.state.calls[0].sql, /LIMIT 2001$/);
  assert.match(f.state.calls[1].sql, /LIMIT 2001 FOR UPDATE$/);
});
test("root and child creation use bound parameters and preserve literal names", async () => {
  const f = fixture();
  await createUnit(f.db, { name: "<img src=x>" });
  await createUnit(f.db, { name: "child", parentId: 2 });
  assert.equal(f.state.records.at(-2).parent_id, null);
  assert.equal(f.state.records.at(-1).parent_id, 2);
  const call = f.state.calls.find((c) => c.sql.startsWith("INSERT"));
  assert(!call.sql.includes("<img"));
  assert.equal(call.args[0], "<img src=x>");
});
test("creation rejects missing/deleted/injectable parents", async () => {
  for (const parentId of [999, "1 OR 1=1", 0, false, true, "1"]) {
    const f = fixture();
    await assert.rejects(
      createUnit(f.db, { name: "child", parentId }),
      status(422),
    );
    assert(!f.state.calls.some((c) => c.sql.startsWith("INSERT")));
  }
  const f = fixture([record(1, null, { deleted_at: "2099-01-01" })]);
  await assert.rejects(
    createUnit(f.db, { name: "child", parentId: 1 }),
    status(422),
  );
});
test("creation below maximum-depth node is forbidden", async () => {
  const f = fixture(
    Array.from({ length: 32 }, (_, i) => record(i + 1, i || null)),
  );
  await assert.rejects(
    createUnit(f.db, { name: "deep", parentId: 32 }),
    status(422),
  );
});
test("create at full capacity is rejected", async () => {
  const f = fixture(Array.from({ length: 2000 }, (_, i) => record(i + 1)));
  await assert.rejects(createUnit(f.db, { name: "extra" }), status(413));
});
test("moving subtree preserves descendants and permits detaching to root", async () => {
  const f = fixture();
  await changeUnitParent(f.db, 2, { version: 1, parentId: 4 });
  assert.equal(f.state.records.find((r) => r.id === 3).parent_id, 2);
  assert.equal(
    unitTree(f.state.records).find((r) => r.id === 3).path,
    "unit-4 / unit-2 / unit-3",
  );
  await changeUnitParent(f.db, 2, { version: 2, parentId: null });
  assert.equal(f.state.records.find((r) => r.id === 2).parent_id, null);
});
test("self-parent and descendant-parent moves cannot form cycles", async () => {
  for (const parentId of [1, 2, 3]) {
    const f = fixture();
    await assert.rejects(
      changeUnitParent(f.db, 1, { version: 1, parentId }),
      status(422),
    );
    assert(!f.state.calls.some((c) => c.sql.startsWith("UPDATE")));
  }
});
test("subtree move checks depth for descendants, not only selected node", async () => {
  const list = Array.from({ length: 31 }, (_, i) => record(i + 1, i || null));
  const f = fixture([...list, record(100), record(101, 100)]);
  await assert.rejects(
    changeUnitParent(f.db, 100, { version: 1, parentId: 31 }),
    status(422),
  );
});
test("stale version and deleted targets are rejected before update", async () => {
  const f = fixture();
  await assert.rejects(
    changeUnitParent(f.db, 2, { version: 99, parentId: 4 }),
    status(409),
  );
  await assert.rejects(
    changeUnitParent(f.db, 999, { version: 1, parentId: null }),
    status(404),
  );
});
test("parent is required explicitly for moves; same parent is a no-op", async () => {
  const f = fixture();
  await assert.rejects(changeUnitParent(f.db, 2, { version: 1 }), status(422));
  assert.equal(
    (await changeUnitParent(f.db, 2, { version: 1, parentId: 1 })).changed,
    false,
  );
  assert(!f.state.calls.some((c) => c.sql.startsWith("UPDATE")));
});
test("deletion of a parent with active children is blocked", async () => {
  const f = fixture();
  await assert.rejects(deleteUnit(f.db, 1, { version: 1 }), status(409));
});
test("historical use, users including inactive ones, and real requests protect deletion", async () => {
  const a = fixture([record(1, null, { used_ever: 1 })]);
  const b = fixture([record(1)]);
  b.state.users.push({ id: 7, unit_id: 1, active: 0 });
  const c = fixture([record(1)]);
  c.state.requests.push({ id: 7, unit_id: 1, status: "cancelled" });
  for (const f of [a, b, c])
    await assert.rejects(deleteUnit(f.db, 1, { version: 1 }), status(409));
});
test("unreferenced leaf soft-deletes; stale delete version is rejected", async () => {
  const f = fixture();
  await assert.rejects(deleteUnit(f.db, 3, { version: 9 }), status(409));
  await deleteUnit(f.db, 3, { version: 1 });
  assert(f.state.records.find((r) => r.id === 3).deleted_at);
  assert(!f.state.calls.some((c) => /DELETE FROM units/.test(c.sql)));
});
test("deleted children do not permanently block deletion of an unused parent", async () => {
  const f = fixture([record(1), record(2, 1, { deleted_at: "2099-01-01" })]);
  await deleteUnit(f.db, 1, { version: 1 });
  assert(f.state.records[0].deleted_at);
});

test("rename preserves identity, parent and referenced users/requests even for used units", async () => {
  const f = fixture();
  f.state.records[1].used_ever = 1;
  f.state.users.push({ id: 20, unit_id: 2 });
  f.state.requests.push({ id: 30, unit_id: 2, unit_name: "unit-2" });
  const before = structuredClone({
    users: f.state.users,
    requests: f.state.requests,
  });
  assert(
    (await renameUnit(f.db, 2, { version: 1, name: "اداره خدمات" })).changed,
  );
  const r = f.state.records.find((r) => r.id === 2);
  assert.equal(r.id, 2);
  assert.equal(r.parent_id, 1);
  assert.equal(r.version, 2);
  assert.deepEqual(
    { users: f.state.users, requests: f.state.requests },
    before,
  );
  assert.equal(
    unitTree(f.state.records).find((r) => r.id === 3).path,
    "unit-1 / اداره خدمات / unit-3",
  );
});
test("rename rejects stale versions and deleted targets", async () => {
  const f = fixture();
  await assert.rejects(
    renameUnit(f.db, 2, { version: 99, name: "new" }),
    status(409),
  );
  f.state.records[3].deleted_at = "2099-01-01";
  await assert.rejects(
    renameUnit(f.db, 4, { version: 1, name: "new" }),
    status(404),
  );
});
test("rename checks duplicate names including deleted records using database comparison", async () => {
  const f = fixture();
  await assert.rejects(
    renameUnit(f.db, 2, { version: 1, name: "UNIT-4" }),
    status(409),
  );
  f.state.records[3].deleted_at = "2099-01-01";
  await assert.rejects(
    renameUnit(f.db, 2, { version: 1, name: "unit-4" }),
    status(409),
  );
  assert(!f.state.calls.some((c) => c.sql.startsWith("UPDATE")));
});
test("rename trims names, skips unchanged label and validates text length", async () => {
  const f = fixture();
  assert(
    !(await renameUnit(f.db, 2, { version: 1, name: "  unit-2  " })).changed,
  );
  for (const name of ["", "  ", "x".repeat(101), null])
    await assert.rejects(
      renameUnit(f.db, 2, { version: 1, name }),
      status(422),
    );
  assert(!f.state.calls.some((c) => c.sql.startsWith("UPDATE")));
});
test("rename treats hostile labels as bound data, not SQL or executable markup", async () => {
  const f = fixture();
  const name = "<img src=x onerror=alert(1)> --";
  await renameUnit(f.db, 2, { version: 1, name });
  const call = f.state.calls.find((c) => c.sql.startsWith("UPDATE"));
  assert.equal(call.sql, "UPDATE units SET name=? WHERE id=?");
  assert.deepEqual(call.args, [name, 2]);
});

test("unit with active scoped assignment cannot be soft-deleted", async () => {
  const f = fixture([record(1)]);
  f.state.assignments.push({ id: 1, unit_id: 1, active: 1 });
  await assert.rejects(deleteUnit(f.db, 1, { version: 1 }), status(409));
  f.state.assignments[0].active = 0;
  await deleteUnit(f.db, 1, { version: 1 });
});
