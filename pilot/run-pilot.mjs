// Fixed local-only pilot runner. No credentials in argv or log messages.
import {readFileSync,appendFileSync,statSync,renameSync,existsSync,unlinkSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {createSecureContext} from 'node:tls';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export function runtimeConfig(role,text,root='C:\\BehMasir-Pilot') {
 if(!['api','https'].includes(role))throw Error('ROLE_INVALID');
 const env=parseEnv(text),expected=role==='api'?{NODE_ENV:'production',DB_HOST:'127.0.0.1',DB_PORT:'3307',DB_NAME:'behmasir_pilot',DB_USER:'behmasir_pilot_app',DB_POOL:'5',PORT:'3003',APP_ORIGIN:'https://localhost:8445',EDGE_HOST:'127.0.0.1',TRUST_LOCAL_PROXY:'1',SESSION_COOKIE_NAME:'__Host-behmasir-pilot'}:{NODE_ENV:'production',PORT:'3003',APP_ORIGIN:'https://localhost:8445',EDGE_HOST:'127.0.0.1',HTTPS_PFX:join(root,'private','local-https','localhost.pfx')};
 for(const [k,v] of Object.entries(expected))if(env[k]!==v)throw Error('CONFIG_MISMATCH');
 const secret=role==='api'?'DB_PASSWORD':'HTTPS_PFX_PASSWORD';
 if(!/^[a-f0-9]{64}$/.test(env[secret]||''))throw Error('SECRET_FORMAT_INVALID');
 if(Object.keys(env).some(k=>!Object.hasOwn(expected,k)&&k!==secret))throw Error('UNEXPECTED_CONFIG_KEY');
 return {...expected,[secret]:env[secret]};
}
export async function startRole(role,root='C:\\BehMasir-Pilot') {
 const local=join(root,'private','local-https'),log=join(local,'logs',`managed-${role}.log`);
 let logging=false;
 function safeLog(event,code) {
  if(logging)return;logging=true;
  try{if(existsSync(log)&&statSync(log).size>2097152){if(existsSync(log+'.1'))unlinkSync(log+'.1');renameSync(log,log+'.1')}
   appendFileSync(log,JSON.stringify({at:new Date().toISOString(),role,pid:process.pid,event,code:/^[A-Z][A-Z0-9_]{2,60}$/.test(code||'')?code:undefined})+'\n');
  }finally{logging=false}
 }
 // Never serialize arbitrary console arguments, exceptions, environment or SQL.
 console.log=()=>safeLog('INFO');console.warn=()=>safeLog('WARNING');console.error=()=>safeLog('ERROR');
 const fatal=e=>{try{safeLog('FATAL',e?.code||(['CONFIG_MISMATCH','SECRET_FORMAT_INVALID','UNEXPECTED_CONFIG_KEY','ROLE_INVALID'].includes(e?.message)?e.message:'RUNTIME_START_FAILED'))}finally{process.exit(1)}};
 process.on('uncaughtException',fatal);process.on('unhandledRejection',fatal);
 try{
  const file=role==='api'?join(root,'private','api.env'):join(local,'edge.env');
  const config=runtimeConfig(role,readFileSync(file,'utf8'),root);
  for(const k of Object.keys(process.env))if(/^(DB_|NODE_|HTTPS_|APP_ORIGIN$|EDGE_HOST$|TRUST_LOCAL_PROXY$|SESSION_COOKIE_NAME$|PORT$|HTTP_PROXY$|ALL_PROXY$)/i.test(k))delete process.env[k];
  Object.assign(process.env,config);
  safeLog('START');
  await import(pathToFileURL(join(root,'app',role==='api'?'backend/server.mjs':'windows/https-edge.mjs')).href);
 }catch(e){fatal(e)}
}
export function preflightRuntime(nonce,root='C:\\BehMasir-Pilot') {
 if(!/^[a-f0-9]{32}$/.test(nonce))throw Error('PREFLIGHT_NONCE_INVALID');
 const local=join(root,'private','local-https'),logs=join(local,'logs');
 runtimeConfig('api',readFileSync(join(root,'private','api.env'),'utf8'),root);
 const edge=runtimeConfig('https',readFileSync(join(local,'edge.env'),'utf8'),root);
 createSecureContext({pfx:readFileSync(edge.HTTPS_PFX),passphrase:edge.HTTPS_PFX_PASSWORD,minVersion:'TLSv1.2'});
 for(const f of ['backend/server.mjs','windows/https-edge.mjs','public/index.html','public/dashboard-soft.css'])readFileSync(join(root,'app',f));
 createRequire(join(root,'app','backend','package.json'))('mysql2/promise');
 const result={format:1,nonce,pid:process.pid,ok:true,configuration:'VERIFIED',pfx:'PARSED',files:'READABLE',logs:'WRITABLE'};
 const tmp=join(logs,'preflight-'+nonce+'.tmp'),dest=join(logs,'preflight-'+nonce+'.json');
 if(existsSync(tmp)||existsSync(dest))throw Error('PREFLIGHT_RESULT_ALREADY_EXISTS');
 appendFileSync(tmp,JSON.stringify(result)+'\n',{flag:'wx'});renameSync(tmp,dest);
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.platform!=='win32'||fileURLToPath(import.meta.url).toLowerCase()!=='c:\\behmasir-pilot\\app\\pilot\\run-pilot.mjs')process.exit(1);
 if(process.argv.length===3&&['api','https'].includes(process.argv[2]))await startRole(process.argv[2]);
 else if(process.argv.length===4&&process.argv[2]==='preflight'){
  try{preflightRuntime(process.argv[3])}catch{process.exitCode=1}
 }else process.exitCode=1;
}
