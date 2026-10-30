// Pure query fixture, deliberately rejects unrecognized/global data queries.
export function scopedFixture() {
  const state = {
    user: {
      id: 20,
      name: "manager",
      username: "mgr",
      role_code: "unit_manager",
      active: 1,
      auth_version: 3,
      version: 1,
      password_hash: "SECRET_HASH",
      unit_name: null,
    },
    units: [
      { id: 11, name: "support", parent_id: null, version: 1 },
      { id: 1, name: "office", parent_id: 11, version: 1 },
      { id: 3, name: "technical", parent_id: 11, version: 1 },
      { id: 9, name: "child", parent_id: 3, version: 1 },
      { id: 7, name: "OUTSIDE_CANARY", parent_id: null, version: 1 },
    ],
    assignments: [{ unit_id: 11, include_descendants: 1, active: 1 }],
    permissions: ["requests.read", "reports.read"],
    requests: [
      { id: 110, unit_id: 1, status: "scheduled", origin_name: "allowed" },
      { id: 109, unit_id: 3, status: "enroute" },
      { id: 108, unit_id: 9, status: "delivered" },
      { id: 107, unit_id: 11, status: "cancelled" },
      {
        id: 106,
        unit_id: 7,
        status: "delivered",
        origin_name: "OUTSIDE_CANARY",
      },
      {
        id: 105,
        unit_id: 7,
        status: "scheduled",
        origin_name: "OUTSIDE_CANARY",
      },
    ],
    revision: 40,
    calls: [],
  };
  const db = {
    async execute(sql, args = []) {
      state.calls.push({ sql, args: [...args] });
      if (sql.startsWith("SELECT u.*,x.name unit_name"))
        return [[state.user].filter(Boolean)];
      if (sql.startsWith("SELECT id,role_code,active,auth_version FROM users"))
        return [[state.user].filter(Boolean)];
      if (sql.startsWith("SELECT unit_id,include_descendants,active"))
        return [state.assignments.filter((x) => x.active === 1)];
      if (sql.startsWith("SELECT rp.permission_code"))
        return [
          state.permissions.map((permission_code) => ({ permission_code })),
        ];
      if (
        sql.startsWith("SELECT id,name,parent_id,version,used_ever FROM units")
      )
        return [state.units];
      if (sql.startsWith("SELECT id,name,parent_id FROM units WHERE"))
        return [state.units.filter((x) => args.includes(x.id))];
      if (sql === "SELECT title FROM roles WHERE code=?")
        return [[{ title: "مدیر واحد" }]];
      if (sql === "SELECT preferences FROM user_preferences WHERE user_id=?")
        return [[{ preferences: { theme: "light" } }]];
      if (sql === "SELECT revision FROM app_meta WHERE id=1")
        return [[{ revision: state.revision }]];
      if (sql.includes("FROM transport_requests r")) {
        if (!/WHERE (r\.unit_id IN \([?,]+\)|0=1)/.test(sql))
          throw Error("UNSCOPED_REQUEST_QUERY");
        const cursor = sql.includes("r.id<?") ? args.at(-1) : null;
        const ids = cursor === null ? args : args.slice(0, -1);
        let list = state.requests.filter(
          (r) => !sql.includes("WHERE 0=1") && ids.includes(r.unit_id),
        );
        if (sql.startsWith("SELECT r.unit_id")) {
          const map = new Map();
          for (const r of list) {
            const key = r.unit_id + ":" + r.status;
            const o = map.get(key) || {
              unit_id: r.unit_id,
              unit_name: state.units.find((x) => x.id === r.unit_id).name,
              status: r.status,
              total: 0,
            };
            o.total++;
            map.set(key, o);
          }
          return [[...map.values()]];
        }
        if (sql.includes("r.status IN ('scheduled','enroute')"))
          list = list
            .filter((x) => ["scheduled", "enroute"].includes(x.status))
            .sort((a, b) => a.id - b.id);
        else
          list = list
            .filter(
              (x) =>
                x.status === "delivered" && (cursor === null || x.id < cursor),
            )
            .sort((a, b) => b.id - a.id);
        return [list.slice(0, sql.includes("LIMIT 5001") ? 5001 : 201)];
      }
      throw Error("Unexpected query: " + sql);
    },
  };
  return { state, db };
}
export const mapRequest = (r) => ({
  id: r.id,
  unitId: r.unit_id,
  progress: r.status,
  origin: r.origin_name || "allowed",
});
