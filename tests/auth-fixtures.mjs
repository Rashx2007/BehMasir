import { hash } from "../backend/core.mjs";
export function authFixture() {
  const state = {
    now: Date.parse("2099-01-01T00:00:00Z"),
    users: new Map([
      [
        "tester",
        {
          id: 1,
          username: "tester",
          password_hash: "secret-hash",
          auth_version: 1,
          active: 1,
          role_code: "admin",
        },
      ],
    ]),
    limits: new Map(),
    sessions: new Map(),
    events: [],
  };
  const stamp = (ms) =>
    new Date(ms).toISOString().replace("T", " ").replace("Z", "");
  const sessions = (filter) =>
    [...state.sessions.values()].filter(filter).map((s) => ({
      ...structuredClone(s),
      expired: Number(s.expiresMs <= state.now),
      active: state.users.get("tester").active,
      current_auth_version: state.users.get("tester").auth_version,
    }));
  const db = {
    async execute(sql, args = []) {
      if (sql.startsWith("SET @behmasir_actor_id"))
        return [{ affectedRows: 0 }];
      if (sql.startsWith("INSERT INTO audit_log")) {
        state.events.push({
          actor: args[0],
          action: args[1],
          entity: args[2],
          user: args[3],
          payload: JSON.parse(args[4]),
          occurred: args[5],
        });
        return [{ affectedRows: 1, insertId: state.events.length }];
      }
      if (sql.startsWith("INSERT INTO login_limits")) {
        if (!state.limits.has(args[0]))
          state.limits.set(args[0], { failures: 0, start: state.now });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("UPDATE login_limits SET failures=0")) {
        const v = state.limits.get(args[0]);
        if (v.start <= state.now - 900000) {
          v.failures = 0;
          v.start = state.now;
        }
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("SELECT failures,")) {
        const v = state.limits.get(args[0]);
        return [
          [
            {
              failures: v.failures,
              retry_after: Math.max(
                1,
                Math.floor((v.start + 900000 - state.now) / 1000),
              ),
            },
          ],
        ];
      }
      if (sql.startsWith("UPDATE login_limits SET failures=failures+1")) {
        state.limits.get(args[0]).failures++;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("DELETE FROM login_limits")) {
        state.limits.delete(args[0]);
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("SELECT id,username,password_hash")) {
        const v = state.users.get(args[0]);
        return [[...(v ? [structuredClone(v)] : [])]];
      }
      if (sql.startsWith("INSERT INTO sessions")) {
        const [token, user, csrf, version] = args;
        state.sessions.set(token, {
          token_hash: token,
          user_id: user,
          csrf_token: csrf,
          auth_version: version,
          created_at: stamp(state.now),
          expires_at: stamp(state.now + 28800000),
          expiresMs: state.now + 28800000,
        });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("SELECT created_at,expires_at")) {
        const v = state.sessions.get(args[0]);
        return [[{ created_at: v.created_at, expires_at: v.expires_at }]];
      }
      if (sql.startsWith("SELECT u.*,s.token_hash")) {
        const v = state.sessions.get(args[0]);
        if (!v) return [[]];
        const u = state.users.get("tester");
        return [
          [
            {
              ...structuredClone(u),
              token_hash: v.token_hash,
              csrf_token: v.csrf_token,
              expires_at: v.expires_at,
              session_created_at: v.created_at,
              session_auth_version: v.auth_version,
              expired: Number(v.expiresMs <= state.now),
            },
          ],
        ];
      }
      if (sql.startsWith("SELECT s.token_hash")) {
        if (sql.includes("WHERE s.user_id=?"))
          return [
            sessions(
              (s) =>
                s.user_id === args[0] &&
                (!sql.includes("s.token_hash<>?") || s.token_hash !== args[1]),
            ).slice(0, 1001),
          ];
        if (sql.includes("WHERE s.token_hash=?"))
          return [sessions((s) => s.token_hash === args[0])];
        if (sql.includes("WHERE s.expires_at<="))
          return [sessions((s) => s.expiresMs <= state.now).slice(0, 200)];
      }
      if (sql.startsWith("DELETE FROM sessions WHERE token_hash=")) {
        return [{ affectedRows: state.sessions.delete(args[0]) ? 1 : 0 }];
      }
      throw Error("Unexpected SQL in auth fixture: " + sql);
    },
  };
  let tail = Promise.resolve();
  function run(work) {
    const pending = tail.then(async () => {
      const snapshot = structuredClone(state);
      try {
        return await work(db);
      } catch (error) {
        for (const key of Object.keys(state)) state[key] = snapshot[key];
        throw error;
      }
    });
    tail = pending.catch(() => {});
    return pending;
  }
  const session = () => [...state.sessions.values()][0];
  return { state, db, run, session, stamp, hash };
}
