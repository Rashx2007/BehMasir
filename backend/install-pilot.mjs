// New dedicated database ONLY. Root/admin credentials enter via JSON stdin, never argv/env/files.
import mysql from 'mysql2/promise';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {passwordHash,verifyPassword} from './core.mjs';
import {TARGET,APP_USER,validatePilotInput,validateCleanPlan,requireFreshTarget} from './pilot-install-plan.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const production=process.argv.length===2;
// Tests import the exported function; importing never starts an installation.
export async function installPilot(input,{host='127.0.0.1',port=3307,envFile,manifestHash,windowsGuard=true}={}) {
 let db,app,locked=false,changed=false,inTx=false,stage='PREFLIGHT';
 const q=async(s,p=[])=>(await db.execute(s,p))[0];
 try {
  validatePilotInput(input);
  if(windowsGuard && (process.platform!=='win32' || resolve(root).toLowerCase()!=='c:\\behmasir-pilot\\app'))throw Error('PILOT_WINDOWS_FOLDER_REQUIRED');
  if(host!=='127.0.0.1'||(windowsGuard&&port!==3307))throw Error('LOCAL_PILOT_ENDPOINT_REQUIRED');
  const raw=await readFile(new URL('../pilot/clean-plan.json',import.meta.url));
  const plan=JSON.parse(raw);
  validateCleanPlan(plan,manifestHash,raw);
  const ph=await passwordHash(input.adminPassword);
  if(!await verifyPassword(input.adminPassword,ph))throw Error('ADMIN_PASSWORD_HASH_CHECK_FAILED');
  db=await mysql.createConnection({host,port,user:'root',password:input.rootPassword,charset:'utf8mb4',timezone:'Z',dateStrings:true,multipleStatements:false});
  input.rootPassword='';
  await db.query("SET time_zone='+00:00'");
  const [server]=await q('SELECT VERSION() version,@@port port,@@bind_address bind,@@general_log general_log');
  if(!/^8\.4\.11(?:-|$)/.test(server.version)||Number(server.port)!==port||server.bind!=='127.0.0.1'||Number(server.general_log)!==0)throw Error('LOCAL_MYSQL_8411_REQUIRED');
  const [l]=await q("SELECT GET_LOCK('behmasir_pilot.clean_install',0) acquired");
  if(Number(l.acquired)!==1)throw Error('PILOT_INSTALL_LOCK_BUSY');locked=true;
  requireFreshTarget(await q('SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',[TARGET]),await q('SELECT User FROM mysql.user WHERE User=?',[APP_USER]));
  stage='CREATE_FRESH_DATABASE';changed=true;
  // No IF NOT EXISTS: an existing or partial target is NEVER reused, emptied or overwritten.
  await db.query('CREATE DATABASE `behmasir_pilot` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
  await db.query('USE `behmasir_pilot`');
  await db.query("SET time_zone='+00:00'");
  await db.query('SET @behmasir_actor_id=NULL');
  await db.execute('SET @behmasir_change_id=?',[randomUUID()]);
  stage='INSTALL_DDL';
  for(let i=0;i<plan.statements.length;i++)await db.query(plan.statements[i]);
  stage='VERIFY_PHYSICAL_SCHEMA';
  const tables=await q('SELECT TABLE_NAME name,ENGINE engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=?',[TARGET]);
  if(JSON.stringify(tables.map(x=>x.name).sort())!==JSON.stringify([...plan.tables].sort())||tables.some(x=>x.engine!=='InnoDB'))throw Error('TABLE_VERIFICATION_FAILED');
  const triggers=await q('SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?',[TARGET]);
  if(JSON.stringify(triggers.map(x=>x.name).sort())!==JSON.stringify([...plan.triggers].sort()))throw Error('TRIGGER_VERIFICATION_FAILED');
  const [fks]=await q("SELECT COUNT(*) n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND CONSTRAINT_TYPE='FOREIGN KEY'",[TARGET]);
  if(Number(fks.n)!==plan.foreignKeys)throw Error('FOREIGN_KEY_VERIFICATION_FAILED');
  for(const [t,expected] of Object.entries(plan.columns)){
   const actual=await q('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',[TARGET,t]);
   if(JSON.stringify(actual.map(x=>x.name).sort())!==JSON.stringify([...expected].sort()))throw Error('COLUMN_VERIFICATION_FAILED');
  }
  stage='REFERENCE_DATA_AND_FIRST_ADMIN';
  await db.beginTransaction();inTx=true;
  for(const [code,title] of [['admin','مدیر سیستم'],['dispatcher','مسئول ناوگان'],['requester','درخواست‌کننده'],['driver','راننده'],[plan.accessCatalog.role.code,plan.accessCatalog.role.title]])await q('INSERT INTO roles(code,title) VALUES (?,?)',[code,title]);
  await db.query(plan.vehicleSeed);
  await q('INSERT INTO app_meta(id,revision) VALUES (1,1)');
  for(const p of plan.accessCatalog.permissions){
   await q('INSERT INTO access_permissions(code,title) VALUES (?,?)',[p.code,p.title]);
   await q('INSERT INTO access_role_permissions(role_code,permission_code) VALUES (?,?)',['unit_manager',p.code]);
  }
  await q('INSERT INTO workflow_settings(id,enabled,org_enabled,contractor_enabled) VALUES (1,0,0,0)');
  const admin=await q("INSERT INTO users(username,name,role_code,password_hash) VALUES ('pilot_admin',?,'admin',?)",['مدیر سیستم',ph]);
  if(Number(admin.insertId)!==1)throw Error('INITIAL_ADMIN_ID_MISMATCH');
  const [stored]=await q("SELECT password_hash FROM users WHERE id=1 AND username='pilot_admin' AND active=1 AND role_code='admin'");
  if(!stored||!await verifyPassword(input.adminPassword,stored.password_hash))throw Error('STORED_ADMIN_PASSWORD_CHECK_FAILED');
  input.adminPassword='';
  await q("INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'bootstrap.pilot_installed','app',NULL,JSON_OBJECT('schema_version',5,'baseline','2f064c0','change_id',@behmasir_change_id,'sample_data',FALSE))");
  await q('INSERT INTO schema_migrations(version) VALUES (1),(2),(3),(4),(5)');
  await db.commit();inTx=false;
  stage='CREATE_LIMITED_RUNTIME_ACCOUNT';
  const appPassword=randomBytes(32).toString('hex');
  await db.query("CREATE USER 'behmasir_pilot_app'@'127.0.0.1' IDENTIFIED BY "+db.escape(appPassword));
  for(const t of plan.tables){
   const privileges=t==='schema_migrations'?'SELECT': ['audit_log','request_events'].includes(t)?'SELECT,INSERT':'SELECT,INSERT,UPDATE,DELETE';
   await db.query(`GRANT ${privileges} ON \`behmasir_pilot\`.\`${t}\` TO 'behmasir_pilot_app'@'127.0.0.1'`);
  }
  stage='VERIFY_RUNTIME_ACCOUNT_AND_EMPTY_STATE';
  app=await mysql.createConnection({host,port,user:APP_USER,password:appPassword,database:TARGET,charset:'utf8mb4',timezone:'Z',dateStrings:true,multipleStatements:false});
  const countExpected={roles:5,vehicle_types:6,access_permissions:2,access_role_permissions:2,app_meta:1,workflow_settings:1,schema_migrations:5,users:1};
  for(const t of plan.tables){
   if(t==='audit_log')continue;
   const [[c]]=await app.execute(`SELECT COUNT(*) n FROM \`${t}\``);
   if(Number(c.n)!==(countExpected[t]??0))throw Error('FRESH_DATA_COUNT_MISMATCH');
  }
  const [[ws]]=await app.query('SELECT enabled,org_enabled,contractor_enabled FROM workflow_settings WHERE id=1');
  if(ws.enabled||ws.org_enabled||ws.contractor_enabled)throw Error('WORKFLOW_MUST_START_DISABLED');
  const [grants]=await db.query("SHOW GRANTS FOR 'behmasir_pilot_app'@'127.0.0.1'");
  if(grants.some(x=>/GRANT OPTION|ALL PRIVILEGES|CREATE|ALTER|DROP|TRIGGER|FILE|SUPER|PROCESS|UPDATE.*audit_log|DELETE.*audit_log/i.test(Object.values(x).join(' '))))throw Error('EXCESSIVE_RUNTIME_PRIVILEGES');
  stage='WRITE_PRIVATE_RUNTIME_CONFIG';
  const env=['# BehMasir local pilot; baseline 2f064c0; do not share this file',
   'NODE_ENV=production','DB_HOST=127.0.0.1',`DB_PORT=${port}`,`DB_NAME=${TARGET}`,`DB_USER=${APP_USER}`,`DB_PASSWORD=${appPassword}`,
   'DB_POOL=5','PORT=3003','APP_ORIGIN=https://localhost:8445','EDGE_HOST=127.0.0.1','TRUST_LOCAL_PROXY=1','SESSION_COOKIE_NAME=__Host-behmasir-pilot',''].join('\r\n');
  await writeFile(envFile,env,{encoding:'utf8',flag:'wx',mode:0o600});
  return {ok:true,baseline:plan.baseline,schema:5,tables:tables.length,triggers:triggers.length,foreignKeys:plan.foreignKeys,adminUsername:'pilot_admin',sampleAccounts:0,businessRows:0,workflowEnabled:false,appStarted:false};
 }catch(e){
  if(inTx&&db)try{await db.rollback()}catch{}
  const code=/^[A-Z][A-Z0-9_]{2,90}$/.test(e.code||'')?e.code:/^[A-Z][A-Z0-9_]{2,90}$/.test(e.message||'')?e.message:'PILOT_INSTALL_FAILED';
  throw Object.assign(new Error(code),{safeCode:code,stage,partial:changed});
 }finally{
  if(input&&typeof input==='object'){input.rootPassword='';input.adminPassword='';}
  if(app)try{await app.end()}catch{}
  if(db){try{await db.query('SET @behmasir_actor_id=NULL,@behmasir_change_id=NULL');if(locked)await db.query("DO RELEASE_LOCK('behmasir_pilot.clean_install')")}catch{}try{await db.end()}catch{}}
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(!production)throw Error('NO_ARGUMENTS_ALLOWED');
  let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>8192)throw Error('INPUT_TOO_LARGE')}
  const credentials=JSON.parse(input.replace(/^\uFEFF/,''));input='';
  const manifest=JSON.parse(await readFile(new URL('../pilot/release-manifest.json',import.meta.url)));
  const result=await installPilot(credentials,{envFile:'C:\\BehMasir-Pilot\\private\\api.env',manifestHash:manifest.files['pilot/clean-plan.json']});
  console.log('PILOT_DATABASE_READY');console.log(JSON.stringify(result));
  console.log('No HTTP/HTTPS processes started. No firewall or existing service changed.');
 }catch(e){
  console.error(`STOP: stage=${e.stage||'INPUT'}; code=${e.safeCode||(/^[A-Z][A-Z0-9_]+$/.test(e.message||'')?e.message:'INPUT_OR_INSTALL_FAILED')}; partial=${Boolean(e.partial)}`);
  console.error('Do not rerun, delete the database, or start the application. Send only the STOP line.');process.exitCode=1;
 }
}
