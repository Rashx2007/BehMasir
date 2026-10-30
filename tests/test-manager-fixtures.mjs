import { TEST_MANAGER_PLAN } from "../backend/test-manager-plan.mjs";
export const validHashes = {
  support: "scrypt$" + "a".repeat(32) + "$" + "b".repeat(128),
  office: "scrypt$" + "c".repeat(32) + "$" + "d".repeat(128),
};
export function managerFixture() {
  const state = {
    users: [
      {
        id: 1,
        username: "admin",
        name: "original",
        role_code: "admin",
        unit_id: null,
        active: 1,
        auth_version: 1,
        version: 3,
      },
    ],
    units: [
      { id: 11, name: "پشتیبانی", parent_id: null, version: 1, used_ever: 0 },
      { id: 1, name: "امور اداری", parent_id: 11, version: 2, used_ever: 1 },
      { id: 3, name: "واحد فنی", parent_id: 11, version: 2, used_ever: 0 },
      { id: 9, name: "تدارکات", parent_id: 11, version: 2, used_ever: 0 },
      { id: 7, name: "اداره خدمات", parent_id: null, version: 2, used_ever: 0 },
    ],
    assignments: [],
    grants: [
      { permission_code: "reports.read", is_active: 1 },
      { permission_code: "requests.read", is_active: 1 },
    ],
    events: [],
    actor: null,
    change: "aaaa0000-0000-4000-a000-000000000000",
    calls: [],
    failure: null,
    nextId: 30,
    hashes: {},
  };
  const db = {
    async execute(sql, args = []) {
      state.calls.push({ sql, args: [...args] });
      if (sql.startsWith("SELECT CURRENT_USER()"))
        return [
          [
            {
              db_account: "limited_app@127.0.0.1",
              change_id: state.change,
              actor_id: state.actor,
            },
          ],
        ];
      if (
        sql ===
        "SELECT id,username,name,role_code,unit_id,active,auth_version,version FROM users ORDER BY id FOR UPDATE"
      )
        return [structuredClone(state.users)];
      if (sql === "SELECT id FROM unit_role_assignments ORDER BY id FOR UPDATE")
        return [state.assignments.map((a) => ({ id: a.id }))];
      if (
        sql.startsWith("SELECT id,name,parent_id,version,used_ever FROM units")
      )
        return [structuredClone(state.units)];
      if (sql.startsWith("SELECT rp.permission_code,p.is_active"))
        return [structuredClone(state.grants)];
      if (sql.startsWith("INSERT INTO users(")) {
        if (state.failure === "second-user" && state.users.length === 2)
          throw Error("PROBE_SECOND_INSERT_FAILURE");
        const [username, name, hash, unit_id] = args,
          id = state.nextId++;
        state.users.push({
          id,
          username,
          name,
          unit_id,
          role_code: "unit_manager",
          active: 1,
          auth_version: 1,
          version: 1,
        });
        state.hashes[id] = hash;
        state.events.push({
          action: "history.create",
          entity_type: "users",
          entity_id: String(id),
          actor_id: null,
          payload: { change_id: state.change },
        });
        return [{ insertId: id }];
      }
      if (sql.startsWith("INSERT INTO unit_role_assignments(")) {
        const [user_id, unit_id] = args;
        const id = state.assignments.length + 1;
        state.assignments.push({
          id,
          user_id,
          unit_id,
          include_descendants: 1,
          active: 1,
        });
        if (state.failure !== "missing-audit")
          state.events.push({
            action: "access.assignment_create",
            entity_type: "unit_role_assignments",
            entity_id: String(id),
            actor_id: null,
            payload: { change_id: state.change },
          });
        return [{ insertId: id }];
      }
      if (
        sql === "SELECT id,role_code,active,auth_version FROM users WHERE id=?"
      )
        return [state.users.filter((u) => u.id === args[0])];
      if (
        sql.startsWith(
          "SELECT unit_id,include_descendants,active FROM unit_role_assignments",
        )
      )
        return [
          state.assignments.filter(
            (a) => a.user_id === args[0] && a.active === 1,
          ),
        ];
      if (
        sql.startsWith("SELECT rp.permission_code FROM access_role_permissions")
      )
        return [state.grants.filter((g) => g.is_active === 1)];
      if (
        sql ===
        "SELECT id,username,name,role_code,unit_id,active,auth_version,version FROM users WHERE id=?"
      )
        return [state.users.filter((u) => u.id === args[0])];
      if (sql.startsWith("INSERT INTO audit_log(")) {
        state.events.push({
          action: "access.test_accounts_created",
          entity_type: "unit_role_assignments",
          entity_id: "test-managers-05d",
          actor_id: null,
          payload: JSON.parse(args[0]),
        });
        return [{ insertId: 100 }];
      }
      if (
        sql.startsWith(
          "SELECT action,entity_type,entity_id,actor_id,payload FROM audit_log",
        )
      )
        return [structuredClone(state.events)];
      throw Error("Unexpected test manager fixture query");
    },
  };
  return { state, db };
}
