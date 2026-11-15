import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {workflowStatements,requireFreshWorkflowState,assertWorkflowSchema,WORKFLOW_TABLES,WORKFLOW_TRIGGERS} from '../backend/workflow-install-plan.mjs';
import {createWorkflow,workflowContext,workflowRecord,changeWorkflow} from '../backend/workflow-storage.mjs';
const sql=await readFile(new URL('../sql/005_request_workflow_TEST_ONLY.sql',import.meta.url),'utf8');
const spec=JSON.parse(await readFile(new URL('../sql/005_request_workflow_spec_TEST_ONLY.json',import.meta.url),'utf8'));
const source=await readFile(new URL('../backend/workflow-storage.mjs',import.meta.url),'utf8');
const installer=await readFile(new URL('../backend/install-workflow.mjs',import.meta.url),'utf8');
const verifier=await readFile(new URL('../backend/verify-workflow-storage.mjs',import.meta.url),'utf8');
const err=(f,status)=>assert.rejects(f,e=>e.status===status);
function fixture(){
 const state={settings:{enabled:1,org_enabled:1,contractor_enabled:0},user:{id:3,unit_id:11,role_code:'requester',active:1,auth_version:1},beneficiary:{id:3,unit_id:11,role_code:'requester',active:1},grants:[{user_id:3,unit_id:11,capability:'workflow.create',include_descendants:0,active:1}],approvers:[{user_id:4,unit_id:11,capability:'workflow.unit_approve',relationship:'independent_peer',include_descendants:0,active:1}],old:null,keys:new Map(),record:null,missions:0,blockedVehicle:false,busyDriver:false,queries:[],inserted:0};
 const db={async execute(s,a=[]){state.queries.push([s,a]);
  if(s.includes('SELECT id,unit_id,role_code,active,auth_version FROM users'))return [[state.user]];
  if(s.includes('SELECT * FROM workflow_settings'))return [[state.settings]];
  if(s.includes('SELECT id,unit_id,role_code,active FROM users'))return [[state.beneficiary]];
  if(s.includes('FROM units')&&s.includes('parent_id'))return [[{id:11,name:'واحد',parent_id:null,version:1,deleted_at:null},{id:12,name:'زیرواحد',parent_id:11,version:1,deleted_at:null}]];
  if(s.includes('FROM workflow_grants WHERE user_id'))return [state.grants];
  if(s.includes('FROM workflow_grants g JOIN users'))return [state.approvers];
  if(s.startsWith('SELECT body_hash,response FROM idempotency_keys')){const old=state.keys.get(a[0]+':'+a[1]);return [old?[old]:[]]};
  if(s.includes('SELECT id,name FROM centers'))return [[{id:1,name:'مبدأ'},{id:2,name:'مقصد'}]];
  if(s.startsWith('SET @behmasir_actor_id'))return [{}];
  if(s==='SELECT @behmasir_change_id change_id')return [[{change_id:'fixture-change'}]];
  if(s.startsWith('INSERT INTO workflow_requests')){state.inserted++;state.record={id:10,creator_id:a[0],beneficiary_id:a[1],unit_id:a[2],origin_id:a[3],destination_id:a[4],service_date:a[5],service_time:a[6]+':00',needs:a[7],state:a[8],version:1,content_version:1,unit_approval:null,fleet_approval:null,ownership:null,transport_request_id:null};return [{insertId:10}]}
  if(s.startsWith('SELECT * FROM workflow_requests WHERE id='))return [state.record?[state.record]:[]];
  if(s.startsWith('SELECT * FROM vehicles'))return [[{id:7,status:state.blockedVehicle?'down':'ok',ownership:'org',cargo_capacity:3,shift_start:null,shift_end:null,name:'خودرو',plate:'TEST'}]];
  if(s.startsWith('SELECT COUNT(*) n FROM transport_requests'))return [[{n:state.missions}]];
  if(s.startsWith('SELECT u.id FROM users u JOIN user_vehicles'))return [[{id:8}]];
  if(s.startsWith('SELECT r.id FROM request_drivers'))return [state.busyDriver?[{id:44}]:[]];
  if(s.startsWith('SELECT name FROM units WHERE'))return [[{name:'واحد'}]];
  if(s.startsWith('INSERT INTO transport_requests')){state.missions++;return [{insertId:20}]}
  if(s.startsWith('INSERT INTO request_drivers')||s.startsWith('INSERT INTO request_events'))return [{insertId:30}];
  if(s.startsWith('UPDATE workflow_requests')){const [beneficiary_id,unit_id,origin_id,destination_id,service_date,service_time,needs,status,content_version,unit_approval,fleet_approval,ownership,transport_request_id,version]=a;Object.assign(state.record,{beneficiary_id,unit_id,origin_id,destination_id,service_date,service_time:service_time+':00',needs,state:status,content_version,unit_approval,fleet_approval,ownership,transport_request_id,version});return [{affectedRows:1}]}
  if(s.startsWith('SELECT version FROM workflow_requests'))return [[{version:state.record.version}]];
  if(s.startsWith('UPDATE units SET used_ever'))return [{affectedRows:1}];
  if(s.startsWith('INSERT INTO audit_log'))return [{insertId:100}];
  if(s.startsWith('INSERT INTO idempotency_keys')){state.old={body_hash:a[2],response:JSON.parse(a[3])};state.keys.set(a[0]+':'+a[1],state.old);return [{affectedRows:1}]}
  throw Error('UNEXPECTED_SQL: '+s);
 }};return {state,db};
}
const body=()=>({unitId:11,beneficiaryId:3,originId:1,destinationId:2,date:'2099-01-01',time:'10:00',needs:'انتقال نمونه آزمایشی'});
const session={id:3,auth_version:1},key='11111111-1111-4111-8111-111111111111';
test('workflow migration is exactly three tables + fifteen triggers; supports CRLF',()=>{assert.equal(workflowStatements(sql,spec).length,18);assert.equal(workflowStatements(sql.replace(/\n/g,'\r\n'),spec).length,18);assert.equal(WORKFLOW_TABLES.length,3);assert.equal(WORKFLOW_TRIGGERS.length,15)});
test('modified SQL or manifest is rejected before DDL',()=>{assert.throws(()=>workflowStatements(sql+' ',spec));assert.throws(()=>workflowStatements(sql,{...spec,triggers:[]}));assert.throws(()=>workflowStatements(sql,{...spec,statement_count:19}))});
test('partial or repeated migration fails closed',()=>{assert.doesNotThrow(()=>requireFreshWorkflowState([1,2,3,4],[],[]));for(const args of [[[1,2,3],[],[]],[[1,2,3,4,5],[],[]],[[1,2,3,4],['workflow_settings'],[]],[[1,2,3,4],[],['bh5_wr_bi']]])assert.throws(()=>requireFreshWorkflowState(...args))});
test('schema marker cannot hide missing physical workflow columns',async()=>{let n=0;await assert.rejects(()=>assertWorkflowSchema({async execute(s){n++;if(s.includes('schema_migrations'))return [[{version:5}]];throw Error('missing columns')}}),/missing/);assert.equal(n,2)});
test('migration excludes seeds, accounts, grants, deletes and operational data writes',()=>{assert(!/INSERT INTO (users|roles|workflow_grants|transport_requests)\b/i.test(sql));assert(!/DROP TABLE|ALTER TABLE (users|transport_requests)|GRANT /i.test(sql));assert(sql.includes('Physical')||sql.includes('physical deletion blocked'))});
test('all new records have protected identities, no-op-aware version and complete audit snapshots',()=>{for(const p of ['ws','wg','wr']){for(const s of ['bi','bu','bd','ai','au'])assert(sql.includes('bh5_'+p+'_'+s));assert(sql.includes("'workflow."+p+'_update'))}assert(sql.includes("'before',JSON_OBJECT("));assert(sql.includes("'after',JSON_OBJECT("));assert(sql.includes('NEW.version=OLD.version'));assert(sql.includes('NEW.edited_at=UTC_TIMESTAMP(3)'))});
test('pending rows have no vehicle reservation; operational state must have linked request',()=>{assert(!spec.tables.workflow_requests.includes('vehicle_id'));assert(sql.includes('ck_wr_operational'));assert(sql.includes('transport_request_id IS NOT NULL'));assert(sql.includes('UNIQUE KEY uq_wr_transport'))});
test('installer is test-only, stopped-services guarded, marker last and no automatic recovery',()=>{for(const x of ['behmasir_upgrade_verify','STOP_UPGRADE_SERVICES_FIRST','RECENT_COMPLETE_WORKFLOW_BACKUP_REQUIRED','MIGRATION_LOCK_BUSY','requireFreshWorkflowState','EXISTING_DATA_CHANGED','workflow_enabled=0'])assert(installer.includes(x),x);assert(installer.indexOf('INSERT INTO schema_migrations(version) VALUES (5)')>installer.indexOf("'workflow.storage_installed'"));assert(!installer.includes('ALTER USER'));assert(!installer.includes('GRANT '));assert(installer.includes('process.stdin'));assert(!installer.includes('process.argv[2]'))});
test('runtime verifier rolls back, uses limited app account and never requires trigger metadata privileges',()=>{assert(verifier.includes("process.env.DB_USER.toLowerCase()==='root'"));assert(verifier.includes('await db.rollback()'));assert(!verifier.includes('db.commit('));assert(!verifier.includes('information_schema.TRIGGERS'));assert(verifier.includes('eq(await counts(),before)'))});
test('context recomputes explicit grant scopes and active approvers from DB',async()=>{const {db,state}=fixture();const c=await workflowContext(db,session,3);assert.deepEqual(c.ctx.grants[0].unitIds,[11]);state.grants[0].include_descendants=1;const d=await workflowContext(db,session,3);assert.deepEqual(d.ctx.grants[0].unitIds,[11,12]);assert(state.queries.some(([s])=>s.includes('u.active=1')))});
test('fresh user auth version mismatch prevents all workflow queries',async()=>{const {db,state}=fixture();state.user.auth_version=2;await err(()=>workflowContext(db,session,3),401);assert.equal(state.queries.length,1)});
test('disabled workflow refuses creation before writes',async()=>{const {db,state}=fixture();state.settings.enabled=0;await err(()=>createWorkflow(db,session,body(),key),409);assert.equal(state.inserted,0)});
test('request creation uses bound parameters, waiting state and no transport mutation',async()=>{const {db,state}=fixture();const b=body();b.needs='متن <img src=x onerror=alert(1)> غیرواقعی';const r=await createWorkflow(db,session,b,key);assert.equal(r.state,'awaiting_unit');assert.equal(r.id,10);const insert=state.queries.find(([s])=>s.startsWith('INSERT INTO workflow_requests'));assert(insert[1].includes(b.needs));assert(!insert[0].includes(b.needs));assert(!state.queries.some(([s])=>/INSERT INTO transport_requests|INSERT INTO request_drivers/.test(s)))});
test('creation without eligible approver stays waiting for one',async()=>{const {db,state}=fixture();state.approvers=[];assert.equal((await createWorkflow(db,session,body(),key)).state,'awaiting_approver')});
test('create requires explicit grant; current legacy title does not grant it',async()=>{const {db,state}=fixture();state.user.role_code='admin';state.grants=[];await err(()=>createWorkflow(db,session,body(),key),403);assert.equal(state.inserted,0)});
test('idempotent replay does not create a second intake and revalidates grants',async()=>{const {db,state}=fixture();const first=await createWorkflow(db,session,body(),key);assert.deepEqual(await createWorkflow(db,session,body(),key),first);assert.equal(state.inserted,1);state.grants=[];await err(()=>createWorkflow(db,session,body(),key),403)});
test('same key cannot submit different content',async()=>{const {db}=fixture();await createWorkflow(db,session,body(),key);await err(()=>createWorkflow(db,session,{...body(),needs:'محتوای متفاوت برای آزمون'},key),409)});
test('missing key, invalid date and invalid center route cause no intake insert',async()=>{for(const [change,k] of [[b=>b,'bad'],[b=>({...b,date:'2026-02-30'}),key],[b=>({...b,originId:2}),key]]){const {db,state}=fixture();await err(()=>createWorkflow(db,session,change(body()),k),422);assert.equal(state.inserted,0)}});
test('missing grant root fails closed instead of allowing orphaned or global scope',async()=>{const {db,state}=fixture();state.grants[0].unit_id=999;await err(()=>workflowContext(db,session,3),409)});
test('stored JSON approvals are hydrated without a client authority flag',()=>{const r=workflowRecord({creator_id:1,beneficiary_id:2,unit_id:3,state:'awaiting_fleet',version:2,content_version:1,unit_approval:'{"actorId":4,"contentVersion":1}',fleet_approval:null,ownership:null,transport_request_id:null},true);assert.equal(r.unitApproval.actorId,4);assert.equal(r.beneficiaryIsManager,true);assert.equal(r.fleetApproval,null)});
test('dispatch service locks, checks real availability and writes mission+drivers+event atomically',()=>{for(const x of ['FOR UPDATE','withinShift(v,m.time)','v.ownership!==rec.ownership',"v.status!=='ok'",'Number(count.n)>=v.cargo_capacity',"u.role_code='driver'",'UNIQUE','INSERT INTO transport_requests','INSERT INTO request_drivers','workflow_dispatched'])if(x!=='UNIQUE')assert(source.includes(x),x);assert(source.includes("r.status IN ('scheduled','enroute')"));assert(source.includes('driverIds.length>10'))});
test('SQL mutation services have no nested commit or connection lifetime of their own',()=>{assert(!/\.(commit|beginTransaction|rollback|release|end)\(/.test(source));assert(source.includes('WORKFLOW_HISTORY_TRANSACTION_REQUIRED'));assert(source.includes('WORKFLOW_VERSION_STORAGE_MISMATCH'))});

async function flowing(){
 const f=fixture();await createWorkflow(f.db,session,body(),key);
 function as(id,cap){f.state.user={...f.state.user,id,role_code:id===4?'unit_manager':'dispatcher'};f.state.grants=[{user_id:id,unit_id:11,capability:cap,include_descendants:0,active:1}];return {id,auth_version:1}}
 const s4=as(4,'workflow.unit_approve');const a=await changeWorkflow(f.db,s4,10,'unit_approve',{version:1},'22222222-2222-4222-8222-222222222222');assert.equal(a.state,'awaiting_fleet');
 const s5=as(5,'workflow.fleet_approve');const b=await changeWorkflow(f.db,s5,10,'fleet_approve',{version:2,ownership:'org'},'33333333-3333-4333-8333-333333333333');assert.equal(b.state,'awaiting_dispatch');
 const s6=as(6,'workflow.dispatch.org');return {...f,dispatcher:s6};
}
test('service full approval chain creates exactly one linked mission with idempotent dispatch (mock SQL)',async()=>{const {db,state,dispatcher}=await flowing();assert.equal(state.missions,0);const b={version:3,vehicleId:7,driverIds:[8]},k='44444444-4444-4444-8444-444444444444';const r=await changeWorkflow(db,dispatcher,10,'dispatch',b,k);assert.equal(r.state,'scheduled');assert.equal(r.transportRequestId,20);assert.equal(state.record.version,4);assert.equal(state.missions,1);assert.deepEqual(await changeWorkflow(db,dispatcher,10,'dispatch',b,k),r);assert.equal(state.missions,1)});
test('service dispatch rejects unavailable vehicle before operational insert',async()=>{const {db,state,dispatcher}=await flowing();state.blockedVehicle=true;await err(()=>changeWorkflow(db,dispatcher,10,'dispatch',{version:3,vehicleId:7,driverIds:[8]},'44444444-4444-4444-8444-444444444444'),409);assert.equal(state.missions,0)});
test('service dispatch rejects busy driver before operational insert',async()=>{const {db,state,dispatcher}=await flowing();state.busyDriver=true;await err(()=>changeWorkflow(db,dispatcher,10,'dispatch',{version:3,vehicleId:7,driverIds:[8]},'44444444-4444-4444-8444-444444444444'),409);assert.equal(state.missions,0)});
test('service dispatch rejects missing or duplicated drivers',async()=>{for(const driverIds of [[],[8,8]]){const {db,state,dispatcher}=await flowing();await err(()=>changeWorkflow(db,dispatcher,10,'dispatch',{version:3,vehicleId:7,driverIds},'44444444-4444-4444-8444-444444444444'),422);assert.equal(state.missions,0)}});
test('service dispatch rejects full daily capacity before operational insert',async()=>{const {db,state,dispatcher}=await flowing();state.missions=3;await err(()=>changeWorkflow(db,dispatcher,10,'dispatch',{version:3,vehicleId:7,driverIds:[8]},'44444444-4444-4444-8444-444444444444'),409);assert.equal(state.missions,3)});

test('owner-scoped dispatcher cannot access unassigned or other-owner intake before state validation',async()=>{
 const {db,state}=fixture();await createWorkflow(db,session,body(),key);
 state.user={...state.user,id:6,role_code:'dispatcher'};
 state.grants=[{user_id:6,unit_id:11,capability:'workflow.dispatch.org',include_descendants:0,active:1}];
 const s={id:6,auth_version:1},b={version:1,vehicleId:7,driverIds:[8]},k='66666666-6666-4666-8666-666666666666';
 await err(()=>changeWorkflow(db,s,10,'dispatch',b,k),403);
 state.record.ownership='contractor';await err(()=>changeWorkflow(db,s,10,'dispatch',b,k),403);
 state.record.ownership='org';await err(()=>changeWorkflow(db,s,10,'dispatch',b,k),409);
 assert.equal(state.missions,0);assert.equal(state.record.version,1);
});
