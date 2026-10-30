import test from "node:test";
import assert from "node:assert/strict";
import {
  assertScopedRoute,
  readSnapshot,
  freshReadUser,
} from "../backend/scoped-routes.mjs";
import { scopedFixture } from "./scoped-read-fixtures.mjs";
const unit = { role_code: "unit_manager" };
test("scoped HTTP allowlist permits only declared reads and own account operations", () => {
  for (const [method, path] of [
    ["GET", "state"],
    ["GET", "history"],
    ["GET", "unit-reports"],
    ["PUT", "preferences"],
    ["POST", "password"],
    ["POST", "logout"],
  ])
    assert.doesNotThrow(() => assertScopedRoute(unit, method, path));
  for (const [method, path] of [
    ["POST", "requests"],
    ["PUT", "requests/1"],
    ["DELETE", "requests/1"],
    ["POST", "users"],
    ["GET", "vehicles/deleted"],
    ["GET", "vehicles/1/emergency-preview"],
    ["POST", "vehicles/1/emergency"],
    ["POST", "units"],
    ["PUT", "units/1/name"],
    ["GET", "unknown"],
    ["POST", "state"],
    ["GET", "preferences"],
  ])
    assert.throws(
      () => assertScopedRoute(unit, method, path),
      (e) => e.status === 403,
    );
});
test("unknown roles have no fallback; existing roles retain existing downstream authorization", () => {
  assert.throws(
    () => assertScopedRoute({ role_code: "typo" }, "GET", "state"),
    (e) => e.status === 403,
  );
  for (const role_code of ["admin", "dispatcher", "requester", "driver"])
    assert.doesNotThrow(() => assertScopedRoute({ role_code }, "GET", "state"));
});
test("fresh read identity rejects revoked, missing, unsupported and changed sessions", async () => {
  const { state, db } = scopedFixture();
  const session = { id: 20, auth_version: 3 };
  assert.equal((await freshReadUser(db, session)).id, 20);
  state.user.active = 0;
  await assert.rejects(
    () => freshReadUser(db, session),
    (e) => e.status === 401,
  );
  state.user.active = 1;
  state.user.auth_version = 4;
  await assert.rejects(
    () => freshReadUser(db, session),
    (e) => e.status === 401,
  );
  state.user.auth_version = 3;
  state.user.role_code = "unknown";
  await assert.rejects(
    () => freshReadUser(db, session),
    (e) => e.status === 403,
  );
  state.user = null;
  await assert.rejects(
    () => freshReadUser(db, session),
    (e) => e.status === 401,
  );
});
function connection(failure) {
  const events = [];
  const c = {
    async query(s) {
      events.push(s);
    },
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
      if (failure === "commit") throw Error("commit");
    },
    async rollback() {
      events.push("rollback");
      if (failure === "rollback") throw Error("rollback");
    },
    release() {
      events.push("release");
    },
    destroy() {
      events.push("destroy");
    },
  };
  return {
    events,
    pool: {
      async getConnection() {
        return c;
      },
    },
  };
}
test("read snapshot uses coherent UTC repeatable-read transaction and releases after commit", async () => {
  const { events, pool } = connection();
  assert.equal(await readSnapshot(pool, async () => 7), 7);
  assert.deepEqual(events, [
    "SET time_zone='+00:00'",
    "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
    "begin",
    "commit",
    "release",
  ]);
});
test("read errors roll back; rollback failure destroys connection; commit failure never returns success", async () => {
  for (const failure of [null, "rollback", "commit"]) {
    const { events, pool } = connection(failure);
    await assert.rejects(() =>
      readSnapshot(pool, async () => {
        if (failure !== "commit") throw Error("work");
        return 7;
      }),
    );
    assert(events.includes("rollback"));
    assert.equal(events.at(-1), failure === "rollback" ? "destroy" : "release");
  }
});
