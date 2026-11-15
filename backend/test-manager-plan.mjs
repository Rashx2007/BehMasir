// TEST ONLY. Caller must use transactionWithHistory; this function NEVER commits.
import { passwordHash } from "./core.mjs";
import { listUnitRows, unitTree } from "./unit-tree.mjs";
import { resolveUnitAccess } from "./unit-access.mjs";
export const MANAGER_CONFIRMATION = "TEST-MANAGERS";
export const TEST_MANAGER_PLAN = Object.freeze([
  Object.freeze({
    key: "support",
    username: "test_mgr_support",
    name: "آزمون مدیر پشتیبانی",
    unitId: 11,
    unitName: "پشتیبانی",
    parentId: null,
    unitIds: Object.freeze([1, 3, 9, 11]),
  }),
  Object.freeze({
    key: "office",
    username: "test_mgr_office",
    name: "آزمون مدیر امور اداری",
    unitId: 1,
    unitName: "امور اداری",
    parentId: 11,
    unitIds: Object.freeze([1]),
  }),
]);
export const READ_GRANTS = Object.freeze(["reports.read", "requests.read"]);
const rows = async (db, sql, args = []) => (await db.execute(sql, args))[0];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export async function privatePasswordHashes(input) {
  if (
    !input ||
    input.confirmation !== MANAGER_CONFIRMATION ||
    !input.passwords ||
    Object.keys(input).sort().join(",") !== "confirmation,passwords" ||
    Object.keys(input.passwords).sort().join(",") !== "office,support"
  )
    throw Error("PRIVATE_INPUT_INVALID");
  for (const p of TEST_MANAGER_PLAN) {
    const password = input.passwords[p.key];
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128 ||
      !password.trim() ||
      password.toLowerCase() === p.username
    )
      throw Error("PASSWORD_POLICY_12_128");
  }
  if (input.passwords.support === input.passwords.office)
    throw Error("PASSWORDS_MUST_DIFFER");
  const hashes = {};
  try {
    for (const p of TEST_MANAGER_PLAN)
      hashes[p.key] = await passwordHash(input.passwords[p.key]);
    return hashes;
  } finally {
    input.passwords.support = "";
    input.passwords.office = "";
  }
}
export function requireManagerPlan(tree, grants, existing, assignments) {
  if (
    existing.some((u) =>
      TEST_MANAGER_PLAN.some((p) => u.username.toLowerCase() === p.username),
    )
  )
    throw Error("TEST_ACCOUNTS_ALREADY_EXIST_CHECK_STATE");
  if (
    existing.some((u) => u.role_code === "unit_manager") ||
    assignments.length
  )
    throw Error("UNEXPECTED_EXISTING_MANAGER_STATE");
  if (
    !same(grants.map((g) => g.permission_code).sort(), READ_GRANTS) ||
    grants.some((g) => Number(g.is_active) !== 1)
  )
    throw Error("EXACT_READ_GRANTS_REQUIRED");
  for (const p of TEST_MANAGER_PLAN) {
    const u = tree.find((r) => r.id === p.unitId);
    if (!u || u.name !== p.unitName || u.parentId !== p.parentId)
      throw Error("EXPECTED_TEST_UNITS_REQUIRED");
    const ids = tree
      .filter((r) => r.id === p.unitId || r.ancestorIds.includes(p.unitId))
      .map((r) => r.id)
      .sort((a, b) => a - b);
    if (!same(ids, p.unitIds))
      throw Error("TEST_SCOPE_CHANGED_REVIEW_REQUIRED");
  }
  for (const id of [3, 9])
    if (tree.find((r) => r.id === id)?.parentId !== 11)
      throw Error("EXPECTED_TEST_UNITS_REQUIRED");
}
export async function provisionTestManagers(db, hashes) {
  if (
    !hashes ||
    Object.keys(hashes).sort().join(",") !== "office,support" ||
    TEST_MANAGER_PLAN.some(
      (p) => !/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(hashes[p.key] || ""),
    )
  )
    throw Error("PREHASHED_PASSWORDS_REQUIRED");
  const [context] = await rows(
    db,
    "SELECT CURRENT_USER() db_account,@behmasir_change_id change_id,@behmasir_actor_id actor_id",
  );
  if (
    context?.actor_id !== null ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      context.change_id || "",
    )
  )
    throw Error("CLEAN_HISTORY_TRANSACTION_REQUIRED");
  const existing = await rows(
    db,
    "SELECT id,username,name,role_code,unit_id,active,auth_version,version FROM users ORDER BY id FOR UPDATE",
  );
  const assignments = await rows(
    db,
    "SELECT id FROM unit_role_assignments ORDER BY id FOR UPDATE",
  );
  const records = await listUnitRows(db, true),
    tree = unitTree(records);
  const grants = await rows(
    db,
    "SELECT rp.permission_code,p.is_active FROM access_role_permissions rp JOIN access_permissions p ON p.code=rp.permission_code WHERE rp.role_code='unit_manager' ORDER BY rp.permission_code FOR UPDATE",
  );
  requireManagerPlan(tree, grants, existing, assignments);
  const accounts = [];
  for (const p of TEST_MANAGER_PLAN) {
    const result = await rows(
      db,
      "INSERT INTO users(username,name,role_code,password_hash,unit_id,active) VALUES (?,?,'unit_manager',?,?,1)",
      [p.username, p.name, hashes[p.key], p.unitId],
    );
    const userId = result.insertId;
    if (!Number.isSafeInteger(userId) || userId <= 0)
      throw Error("NEW_ACCOUNT_ID_INVALID");
    await rows(
      db,
      "INSERT INTO unit_role_assignments(user_id,role_code,unit_id,include_descendants,active) VALUES (?,'unit_manager',?,1,1)",
      [userId, p.unitId],
    );
    const access = await resolveUnitAccess(db, userId, 1);
    if (
      !same(access.unitIds, p.unitIds) ||
      !same([...access.permissions].sort(), READ_GRANTS)
    )
      throw Error("CREATED_SCOPE_VERIFICATION_FAILED");
    const [u] = await rows(
      db,
      "SELECT id,username,name,role_code,unit_id,active,auth_version,version FROM users WHERE id=?",
      [userId],
    );
    if (
      !u ||
      u.username !== p.username ||
      u.name !== p.name ||
      u.role_code !== "unit_manager" ||
      u.unit_id !== p.unitId ||
      u.active !== 1 ||
      u.auth_version !== 1 ||
      u.version !== 1
    )
      throw Error("CREATED_ACCOUNT_VERIFICATION_FAILED");
    accounts.push({
      id: userId,
      username: p.username,
      unitId: p.unitId,
      unitName: p.unitName,
      unitIds: access.unitIds,
      permissions: access.permissions,
    });
  }
  const after = await rows(
    db,
    "SELECT id,username,name,role_code,unit_id,active,auth_version,version FROM users ORDER BY id FOR UPDATE",
  );
  if (
    after.length !== existing.length + 2 ||
    !same(
      after.filter((u) => !accounts.some((a) => a.id === u.id)),
      existing,
    )
  )
    throw Error("EXISTING_ACCOUNTS_CHANGED");
  if (!same(await listUnitRows(db, true), records))
    throw Error("ORGANIZATION_TREE_CHANGED");
  const allAssignments = await rows(
    db,
    "SELECT id FROM unit_role_assignments ORDER BY id FOR UPDATE",
  );
  if (allAssignments.length !== 2) throw Error("ASSIGNMENT_COUNT_INVALID");
  const payload = {
    reason:
      "Approved isolated test managers; read-only scope, no operational approvals.",
    source: "offline_private_setup",
    accounts,
    db_account: context.db_account,
    change_id: context.change_id,
  };
  await rows(
    db,
    "INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'access.test_accounts_created','unit_role_assignments','test-managers-05d',?)",
    [JSON.stringify(payload)],
  );
  const events = await rows(
    db,
    "SELECT action,entity_type,entity_id,actor_id,payload FROM audit_log WHERE JSON_UNQUOTE(JSON_EXTRACT(payload,'$.change_id'))=? ORDER BY id",
    [context.change_id],
  );
  if (
    events.length !== 5 ||
    events.some((e) => e.actor_id !== null) ||
    events.filter(
      (e) => e.action === "history.create" && e.entity_type === "users",
    ).length !== 2 ||
    events.filter((e) => e.action === "access.assignment_create").length !==
      2 ||
    events.filter((e) => e.action === "access.test_accounts_created").length !==
      1
  )
    throw Error("ACCOUNT_AUDIT_VERIFICATION_FAILED");
  const serialized = JSON.stringify(events);
  if (TEST_MANAGER_PLAN.some((p) => serialized.includes(hashes[p.key])))
    throw Error("PASSWORD_HASH_IN_AUDIT");
  return accounts;
}
