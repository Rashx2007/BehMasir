// Child-process integration fixture: REAL server/domain/routes, MOCK DB and session lookup.
// No mysql2 connection, credentials, actual authentication or persistent account is used.
import { registerHooks } from "node:module";
import { scopedFixture } from "./scoped-read-fixtures.mjs";
const { state, db } = scopedFixture();
state.requests = state.requests.map((r) => ({
  ...r,
  requester_user_id: 3,
  vehicle_id: 1,
  unit_name: "unit",
  origin_name: r.origin_name || "allowed",
  destination_name: "destination",
  vehicle_name: "vehicle",
  plate: "TEST",
  service_date: "2020-01-01",
  service_time: "10:00:00",
  started_at: null,
  delivered_at: null,
  version: 1,
}));
const execute = db.execute.bind(db);
db.execute = async (sql, args = []) => {
  if (sql.includes("LIMIT 0")) return [[]];
  if (sql.includes("FROM schema_migrations")) return [[{ version: 4 }]];
  if (sql === "SELECT 1") return [[{ ok: 1 }]];
  return execute(sql, args);
};
Object.assign(db, {
  async query() {},
  async beginTransaction() {},
  async commit() {},
  async rollback() {},
  release() {},
  destroy() {},
});
globalThis.__scopedHttp = {
  state,
  db,
  pool: {
    execute: db.execute,
    async getConnection() {
      return db;
    },
    async end() {},
  },
};
registerHooks({
  load(url, context, next) {
    if (url.endsWith("/backend/db.mjs"))
      return {
        format: "module",
        shortCircuit: true,
        source: `export const pool=globalThis.__scopedHttp.pool;export const rows=async(db,sql,args=[])=>(await db.execute(sql,args))[0];export const transaction=async work=>work(globalThis.__scopedHttp.db);export const audit=async()=>{throw Error('UNEXPECTED_WRITE')};export const json=JSON.stringify;`,
      };
    if (url.endsWith("/backend/auth-events.mjs"))
      return {
        format: "module",
        shortCircuit: true,
        source: `export const resolveSession=async()=>{const u=globalThis.__scopedHttp.state.user;return u?{...u,csrf_token:'a'.repeat(64),expires_at:'2099-01-01 00:00:00.000'}:null};export const requestIp=()=> '127.0.0.1';export const attemptLogin=async()=>{throw Error('NO_LOGIN_FIXTURE')};export const authEvent=async()=>{};export const endUserSessions=async()=>{};export const expireSessionBatch=async()=>0;export const logoutSession=async()=>{};`,
      };
    return next(url, context);
  },
});
process.on("message", (msg) => {
  if (msg.type === "patch") {
    if ("permissions" in msg) state.permissions = msg.permissions;
    if ("assignments" in msg) state.assignments = msg.assignments;
    if ("role" in msg) state.user.role_code = msg.role;
    if ("active" in msg) state.user.active = msg.active;
    process.send({ type: "patched" });
  }
});
const log = console.log;
console.log = (...args) => {
  log(...args);
  if (String(args[0]).includes("BehMasir API on loopback"))
    process.send({ type: "ready" });
};
await import("../backend/server.mjs");
