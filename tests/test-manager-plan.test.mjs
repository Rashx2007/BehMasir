import test from "node:test";
import assert from "node:assert/strict";
import {
  privatePasswordHashes,
  requireManagerPlan,
  provisionTestManagers,
  TEST_MANAGER_PLAN,
} from "../backend/test-manager-plan.mjs";
import { verifyPassword } from "../backend/core.mjs";
import {
  requireManagerConfig,
  managerPoolOptions,
} from "../backend/test-manager-environment.mjs";
import { unitTree } from "../backend/unit-tree.mjs";
import { managerFixture, validHashes } from "./test-manager-fixtures.mjs";
import { transactionWithHistory } from "../backend/history-context.mjs";
const error = (message) => (e) => e.message === message;
test("private input requires exact confirmation, two distinct bounded passwords and no extra fields", async () => {
  for (const input of [
    null,
    {
      confirmation: "wrong",
      passwords: { support: "long-enough-one", office: "long-enough-two" },
    },
    {
      confirmation: "TEST-MANAGERS",
      passwords: { support: "short", office: "long-enough-two" },
    },
    {
      confirmation: "TEST-MANAGERS",
      passwords: {
        support: "same-password-value",
        office: "same-password-value",
      },
    },
    {
      confirmation: "TEST-MANAGERS",
      passwords: { support: "a".repeat(129), office: "long-enough-two" },
    },
    {
      confirmation: "TEST-MANAGERS",
      passwords: { support: " ".repeat(20), office: "long-enough-two" },
    },
    {
      confirmation: "TEST-MANAGERS",
      passwords: {
        support: "long-enough-one",
        office: "long-enough-two",
        admin: "not allowed",
      },
    },
  ])
    await assert.rejects(() => privatePasswordHashes(input));
});
test("private passwords use existing salted scrypt and clear the parsed input after hashing", async () => {
  const input = {
    confirmation: "TEST-MANAGERS",
    passwords: {
      support: "Private-test-support-123",
      office: "Private-test-office-456",
    },
  };
  const hashes = await privatePasswordHashes(input);
  assert.equal(input.passwords.support, "");
  assert.equal(input.passwords.office, "");
  assert(await verifyPassword("Private-test-support-123", hashes.support));
  assert(await verifyPassword("Private-test-office-456", hashes.office));
  assert.notEqual(hashes.support, hashes.office);
});
test("approved manager plan uses only fixed test identities, fixed hierarchy and two read grants", () => {
  const { state } = managerFixture();
  requireManagerPlan(
    unitTree(state.units),
    state.grants,
    state.users,
    state.assignments,
  );
  assert.deepEqual(
    TEST_MANAGER_PLAN.map((p) => p.username),
    ["test_mgr_support", "test_mgr_office"],
  );
});
test("any collision or prior unit-manager account/assignment fails without overwriting", () => {
  const { state } = managerFixture(),
    tree = unitTree(state.units);
  assert.throws(
    () =>
      requireManagerPlan(
        tree,
        state.grants,
        [
          ...state.users,
          { username: "TEST_MGR_SUPPORT", role_code: "requester" },
        ],
        [],
      ),
    error("TEST_ACCOUNTS_ALREADY_EXIST_CHECK_STATE"),
  );
  assert.throws(
    () =>
      requireManagerPlan(
        tree,
        state.grants,
        [...state.users, { username: "another", role_code: "unit_manager" }],
        [],
      ),
    error("UNEXPECTED_EXISTING_MANAGER_STATE"),
  );
  assert.throws(
    () => requireManagerPlan(tree, state.grants, state.users, [{ id: 5 }]),
    error("UNEXPECTED_EXISTING_MANAGER_STATE"),
  );
});
test("unexpected, inactive or missing role grants never create accounts", () => {
  const { state } = managerFixture();
  for (const grants of [
    [],
    state.grants.slice(0, 1),
    [...state.grants, { permission_code: "requests.approve", is_active: 1 }],
    state.grants.map((g) => ({ ...g, is_active: 0 })),
  ])
    assert.throws(
      () => requireManagerPlan(unitTree(state.units), grants, state.users, []),
      error("EXACT_READ_GRANTS_REQUIRED"),
    );
});
test("renamed, missing, reparented or unexpectedly expanded unit scope requires review", () => {
  for (const change of [
    (s) => {
      s.units.find((u) => u.id === 11).name = "different";
    },
    (s) => {
      s.units.find((u) => u.id === 1).parent_id = null;
    },
    (s) => s.units.push({ id: 22, name: "new", parent_id: 11, version: 1 }),
    (s) => {
      s.units.find((u) => u.id === 3).parent_id = 1;
    },
  ]) {
    const { state } = managerFixture();
    change(state);
    assert.throws(() =>
      requireManagerPlan(unitTree(state.units), state.grants, state.users, []),
    );
  }
});
test("provision inserts exactly two scoped accounts, preserves existing identities and audits without hashes", async () => {
  const { state, db } = managerFixture();
  const original = structuredClone(state.users[0]);
  const accounts = await provisionTestManagers(db, validHashes);
  assert.equal(accounts.length, 2);
  assert.deepEqual(state.users[0], original);
  assert.equal(state.assignments.length, 2);
  assert.deepEqual(accounts[0].unitIds, [1, 3, 9, 11]);
  assert.deepEqual(accounts[1].unitIds, [1]);
  assert(state.events.every((e) => e.actor_id === null));
  assert.equal(state.events.length, 5);
  assert(!JSON.stringify(state.events).includes(validHashes.support));
  assert(!JSON.stringify(accounts).includes("scrypt$"));
  assert(
    state.calls.every(
      (c) => !/^UPDATE|^DELETE|^CREATE|^ALTER|^GRANT/.test(c.sql),
    ),
  );
});
test("provision rejects plaintext input, dirty actor context and missing change identifier before inserts", async () => {
  for (const change of [
    (s) => {
      s.actor = 1;
    },
    (s) => {
      s.change = null;
    },
  ]) {
    const { state, db } = managerFixture();
    change(state);
    await assert.rejects(() => provisionTestManagers(db, validHashes));
    assert(!state.calls.some((c) => c.sql.startsWith("INSERT")));
  }
  const { state, db } = managerFixture();
  await assert.rejects(() =>
    provisionTestManagers(db, { support: "plaintext", office: "plaintext" }),
  );
  assert.equal(state.calls.length, 0);
});
test("missing audit trigger behavior prevents successful provisioning", async () => {
  const { state, db } = managerFixture();
  state.failure = "missing-audit";
  await assert.rejects(
    () => provisionTestManagers(db, validHashes),
    error("ACCOUNT_AUDIT_VERIFICATION_FAILED"),
  );
});
test("a second provisioning run is never an implicit password reset or role update", async () => {
  const { state, db } = managerFixture();
  await provisionTestManagers(db, validHashes);
  const before = JSON.stringify(state.users);
  await assert.rejects(
    () => provisionTestManagers(db, validHashes),
    error("TEST_ACCOUNTS_ALREADY_EXIST_CHECK_STATE"),
  );
  assert.equal(JSON.stringify(state.users), before);
});
test("transaction wrapper rolls back both accounts when the second insert fails", async () => {
  const { state, db } = managerFixture();
  state.failure = "second-user";
  const before = structuredClone({
      users: state.users,
      assignments: state.assignments,
      events: state.events,
    }),
    events = [];
  Object.assign(db, {
    async query() {},
    async beginTransaction() {
      events.push("begin");
    },
    async commit() {
      events.push("commit");
    },
    async rollback() {
      events.push("rollback");
      state.users = structuredClone(before.users);
      state.assignments = structuredClone(before.assignments);
      state.events = structuredClone(before.events);
    },
    release() {
      events.push("release");
    },
    destroy() {
      events.push("destroy");
    },
  });
  const execute = db.execute.bind(db);
  db.execute = async (sql, args = []) =>
    sql.startsWith("SET @")
      ? [[]]
      : sql === "SELECT revision FROM app_meta WHERE id=1 FOR UPDATE"
        ? [[{ revision: 4 }]]
        : execute(sql, args);
  await assert.rejects(
    () =>
      transactionWithHistory(
        {
          async getConnection() {
            return db;
          },
        },
        (c) => provisionTestManagers(c, validHashes),
      ),
    error("PROBE_SECOND_INSERT_FAILURE"),
  );
  assert(events.includes("rollback"));
  assert(!events.includes("commit"));
  assert.deepEqual(state.users, before.users);
  assert.deepEqual(state.assignments, []);
});
test("environment guard excludes live DB, root DB login, wrong worktree, ports, origin and cookie", () => {
  const env = {
    DB_NAME: "behmasir_upgrade_verify",
    PORT: "3002",
    APP_ORIGIN: "https://localhost:8444",
    DB_HOST: "127.0.0.1",
    DB_USER: "limited_app",
    SESSION_COOKIE_NAME: "__Host-behmasir-upgrade",
  };
  requireManagerConfig("/tmp/DB-upgrade/", env);
  for (const patch of [
    { DB_NAME: "behmasir" },
    { PORT: "3001" },
    { APP_ORIGIN: "https://localhost:8443" },
    { DB_HOST: "remote" },
    { DB_PORT: "3307" },
    { DB_USER: "root" },
    { SESSION_COOKIE_NAME: "__Host-behmasir" },
  ])
    assert.throws(() =>
      requireManagerConfig("/tmp/DB-upgrade", { ...env, ...patch }),
    );
  assert.throws(() => requireManagerConfig("/tmp/DB", env));
  assert.equal(managerPoolOptions(env).multipleStatements, false);
  assert.equal(managerPoolOptions(env).database, "behmasir_upgrade_verify");
});
