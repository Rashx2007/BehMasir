// Test-only DDL installer; root password only through JSON stdin.
import mysql from 'mysql2/promise';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {basename,join} from 'node:path';
import {createConnection} from 'node:net';
import {randomUUID} from 'node:crypto';
import {workflowStatements,requireFreshWorkflowState,WORKFLOW_TABLES,WORKFLOW_TRIGGERS} from './workflow-install-plan.mjs';
import {assertHistorySchema} from './history-context.mjs';
import {assertUnitAccessSchema} from './unit-access.mjs';
const target='behmasir_upgrade_verify', root=fileURLToPath(new URL('../',import.meta.url));
let db,locked=false,changed=false,inTx=false;
const q=async(sql,args=[])=>(await db.execute(sql,args))[0];
const occupied=port=>new Promise(resolve=>{const s=createConnection({host:'127.0.0.1',port});s.setTimeout(1000);s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>resolve(false));s.once('timeout',()=>{s.destroy();resolve(true)})});
try {
 if(process.argv.length!==2||basename(root.replace(/[\\/]$/,'')).toLowerCase()!=='db-upgrade')throw Error('TEST_WORKTREE_REQUIRED');
 const env=(await readFile(join(root,'private/api.env'),'utf8')).split(/\r?\n/);
 for(const x of ['DB_NAME='+target,'PORT=3002','APP_ORIGIN=https://localhost:8444'])if(!env.includes(x))throw Error('TEST_CONFIG_REQUIRED');
 if(await occupied(3002)||await occupied(8444))throw Error('STOP_UPGRADE_SERVICES_FIRST');
 let backup=false;
 for(const f of await readdir(join(root,'private')))if(/^before-request-workflow-.*\.sql$/.test(f)){
  const p=join(root,'private',f),s=await stat(p);
  if(s.isFile()&&s.size>1024&&Date.now()-s.mtimeMs<86400000&&s.mtimeMs<Date.now()+300000){
   const dump=await readFile(p,'utf8');
   if(dump.slice(0,8192).includes('Database: '+target)&&dump.slice(-8192).includes('-- Dump completed on'))backup=true;
  }
 }
 if(!backup)throw Error('RECENT_COMPLETE_WORKFLOW_BACKUP_REQUIRED');
 process.stdin.setEncoding('utf8');let input='';for await(const c of process.stdin){input+=c;if(input.length>8192)throw Error('INVALID_INPUT')}
 const secret=JSON.parse(input.replace(/^\uFEFF/,''));input='';
 if(typeof secret.password!=='string'||!secret.password)throw Error('PASSWORD_REQUIRED');
 db=await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:secret.password,database:target,charset:'utf8mb4',timezone:'Z',dateStrings:true,multipleStatements:false});secret.password='';
 await db.query("SET time_zone='+00:00'");
 const [server]=await q('SELECT VERSION() version,DATABASE() db');if(!/^8\.4\./.test(server.version)||/MariaDB/i.test(server.version)||server.db!==target)throw Error('MYSQL84_TEST_ONLY');
 const [l]=await q("SELECT GET_LOCK('behmasir_upgrade_verify.workflow_005',0) acquired");if(Number(l.acquired)!==1)throw Error('MIGRATION_LOCK_BUSY');locked=true;
 const versions=await q('SELECT version FROM schema_migrations ORDER BY version');
 const found=await q('SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?,?,?)',[target,...WORKFLOW_TABLES]);
 const oldTriggers=await q("SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh5_'",[target]);
 requireFreshWorkflowState(versions.map(v=>v.version),found,oldTriggers);
 await assertHistorySchema(db);await assertUnitAccessSchema(db);
 // Check the installed audit/access triggers using root metadata privileges.
 for(const [file,prefix] of [['003_history_spec_TEST_ONLY.json','bh3_'],['004_scoped_access_spec_TEST_ONLY.json','bh4_']]){
  const spec=JSON.parse(await readFile(new URL('../sql/'+file,import.meta.url),'utf8'));
  const physical=await q('SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)=?',[target,prefix]);
  if(JSON.stringify(physical.map(r=>r.name).sort())!==JSON.stringify([...spec.triggers].sort()))throw Error('EXISTING_HISTORY_TRIGGERS_REQUIRED');
 }
 const spec=JSON.parse(await readFile(new URL('../sql/005_request_workflow_spec_TEST_ONLY.json',import.meta.url),'utf8'));
 const statements=workflowStatements(await readFile(new URL('../sql/005_request_workflow_TEST_ONLY.sql',import.meta.url),'utf8'),spec);
 const protectedTables=['users','units','centers','vehicles','vehicle_types','roles','transport_requests','request_drivers','request_events','user_vehicles','access_permissions','access_role_permissions','unit_role_assignments','sessions','user_preferences','idempotency_keys','login_limits'];
 const before={};for(const t of protectedTables)before[t]=JSON.stringify(await q('SELECT * FROM `'+t+'` ORDER BY '+(t==='roles'||t==='access_permissions'?'code':t==='sessions'?'token_hash':t==='login_limits'?'bucket':'1')));
 await db.query('SET @behmasir_actor_id=NULL');await db.execute('SET @behmasir_change_id=?',[randomUUID()]);
 changed=true;
 for(let i=0;i<statements.length;i++){await db.query(statements[i]);console.log(`Workflow DDL ${i+1}/${statements.length}: OK`)}
 const afterTriggers=await q("SELECT TRIGGER_NAME name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND LEFT(TRIGGER_NAME,4)='bh5_'",[target]);
 if(JSON.stringify(afterTriggers.map(r=>r.name).sort())!==JSON.stringify([...WORKFLOW_TRIGGERS].sort()))throw Error('WORKFLOW_TRIGGER_VERIFICATION_FAILED');
 for(const t of WORKFLOW_TABLES){const cols=await q('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',[target,t]);if(JSON.stringify(cols.map(c=>c.name).sort())!==JSON.stringify([...spec.tables[t]].sort()))throw Error('WORKFLOW_COLUMNS_VERIFICATION_FAILED')}
 await db.beginTransaction();inTx=true;await q('SELECT revision FROM app_meta WHERE id=1 FOR UPDATE');
 await db.execute('INSERT INTO workflow_settings(id,enabled,org_enabled,contractor_enabled) VALUES (1,0,0,0)');
 for(const t of protectedTables)if(JSON.stringify(await q('SELECT * FROM `'+t+'` ORDER BY '+(t==='roles'||t==='access_permissions'?'code':t==='sessions'?'token_hash':t==='login_limits'?'bucket':'1')))!==before[t])throw Error('EXISTING_DATA_CHANGED');
 await db.execute("INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'workflow.storage_installed','app',NULL,JSON_OBJECT('schema_version',5,'enabled',FALSE,'grants',0,'db_account',USER(),'change_id',@behmasir_change_id))");
 await db.execute('UPDATE app_meta SET revision=revision+1 WHERE id=1');
 // Marker LAST; failure above must not advertise a complete installation.
 await db.execute('INSERT INTO schema_migrations(version) VALUES (5)');await db.commit();inTx=false;
 console.log('READY: behmasir_upgrade_verify; schema=5; workflow_tables=3; workflow_triggers=15; grants=0; workflow_enabled=0.');
 console.log('Storage only. No HTTP routes or UI activation. Runtime database acceptance is still required.');
} catch(e){
 if(inTx&&db)try{await db.rollback()}catch{}
 console.error('STOP:',e.code||(/^[A-Z0-9_]+$/.test(e.message||'')?e.message:'WORKFLOW_INSTALL_FAILED'));
 if(changed)console.error('Partial DDL may remain. Do NOT rerun blindly or start the API.');
 process.exitCode=1;
}finally{
 if(db){try{await db.query('SET @behmasir_actor_id=NULL,@behmasir_change_id=NULL');if(locked)await db.query("DO RELEASE_LOCK('behmasir_upgrade_verify.workflow_005')")}catch{}await db.end()}
}
