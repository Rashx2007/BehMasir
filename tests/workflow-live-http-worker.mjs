// Real Node HTTP server with strict mock SQL/session: not real MySQL/authentication.
import {registerHooks} from 'node:module';
import {workflowHttpFixture} from './workflow-http-fixtures.mjs';
const {state,db}=workflowHttpFixture();state.settings.enabled=0;
const execute=db.execute.bind(db);db.execute=async(sql,args=[])=>{
 if(sql.includes('LIMIT 0'))return [[]];
 if(sql==='SELECT 1')return [[{ok:1}]];
 return execute(sql,args);
};Object.assign(db,{async query(){},async beginTransaction(){},async commit(){},async rollback(){},release(){},destroy(){}});
globalThis.__workflowFixture={state,db,pool:{execute:db.execute,async getConnection(){return db},async end(){}}};
registerHooks({load(url,c,next){
 if(url.endsWith('/backend/db.mjs'))return {format:'module',shortCircuit:true,source:`export const json=JSON.stringify;export const pool=globalThis.__workflowFixture.pool;export const rows=async(db,s,a=[])=>(await db.execute(s,a))[0];export const transaction=async work=>work(globalThis.__workflowFixture.db);export const audit=async()=>{throw Error('NO_LEGACY_WRITE')};`};
 if(url.endsWith('/backend/auth-events.mjs'))return {format:'module',shortCircuit:true,source:`export const resolveSession=async()=>{const u=globalThis.__workflowFixture.state.user;return u?{...u,csrf_token:'a'.repeat(64),expires_at:'2099-01-01 00:00:00.000'}:null};export const requestIp=()=> '127.0.0.1';export const attemptLogin=async()=>{throw Error('NO_LOGIN')};export const authEvent=async()=>{};export const endUserSessions=async()=>{};export const expireSessionBatch=async()=>0;export const logoutSession=async()=>{};`};
 return next(url,c);
}});
process.on('message',m=>{if(m.type==='patch'){if(m.admin)state.user.role_code='admin';if(m.expired)state.user=null;process.send({type:'patched'})}});
const log=console.log;console.log=(...a)=>{log(...a);if(String(a[0]).includes('BehMasir API on loopback'))process.send({type:'ready'})};
await import('../backend/server.mjs');
