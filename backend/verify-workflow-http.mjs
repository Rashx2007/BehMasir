// REAL MySQL acceptance. Everything is enclosed in ONE transaction, rolled back.
import mysql from 'mysql2/promise';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {assertWorkflowSchema} from './workflow-install-plan.mjs';
import {setHistoryActor} from './history-context.mjs';
import {createWorkflow,changeWorkflow,workflowContext} from './workflow-storage.mjs';
import {today} from './core.mjs';
import {workflowView,saveWorkflowSettings,saveWorkflowGrant,assertLegacyWorkflowGate,assertWorkflowUnitDeletion,assertWorkflowLegacyReassignment} from './workflow-http.mjs';
const target='behmasir_upgrade_verify';let db,tx=false,checks=0;
const q=async(sql,args=[])=>(await db.execute(sql,args))[0];
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
let probe=0,probeDiagnostic=null;
async function deny(status,work){const sp='wf_probe_'+(++probe);await db.query('SAVEPOINT '+sp);let err;try{await work()}catch(e){err=e}finally{await db.query('ROLLBACK TO SAVEPOINT '+sp);await db.query('RELEASE SAVEPOINT '+sp)}probeDiagnostic={expectedStatus:status,actualStatus:Number.isInteger(err?.status)?err.status:null,errorCode:/^[A-Z0-9_]+$/.test(err?.code||'')?err.code:null};assert(err&&err.status===status,'Expected permission/conflict failure');checks++;probeDiagnostic=null}
const protectedTables=['workflow_settings','workflow_grants','workflow_requests','users','units','centers','vehicles','transport_requests','request_drivers','request_events','idempotency_keys','audit_log'];
async function counts(){const result={};for(const t of protectedTables)result[t]=Number((await q('SELECT COUNT(*) n FROM `'+t+'`'))[0].n);return result}
try{
 if(basename(fileURLToPath(new URL('../',import.meta.url)).replace(/[\\/]$/,'' )).toLowerCase()!=='db-upgrade'||process.env.DB_NAME!==target||process.env.PORT!=='3002'||process.env.APP_ORIGIN!=='https://localhost:8444'||!['127.0.0.1','localhost','::1'].includes(process.env.DB_HOST||'127.0.0.1')||Number(process.env.DB_PORT||3306)!==3306||!process.env.DB_USER||process.env.DB_USER.toLowerCase()==='root')throw Error('LIMITED_TEST_ENV_REQUIRED');
 db=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:target,charset:'utf8mb4',timezone:'Z',dateStrings:true,multipleStatements:false});
 await db.query("SET time_zone='+00:00'");
 const [server]=await q('SELECT VERSION() v,DATABASE() db,CURRENT_USER() account');
 if(!/^8\.4\./.test(server.v)||/MariaDB/i.test(server.v)||server.db!==target||/^root@/i.test(server.account))throw Error('MYSQL84_LIMITED_TEST_ONLY');
 await assertWorkflowSchema(db);const before=await counts();
 await db.query('SET @behmasir_actor_id=NULL');await db.execute('SET @behmasir_change_id=?',[randomUUID()]);
 await db.beginTransaction();tx=true;await q('SELECT revision FROM app_meta WHERE id=1 FOR UPDATE');
 const suffix=randomBytes(5).toString('hex');
 const un=await q('INSERT INTO units(name) VALUES (?)',['آزمون گردش تأیید '+suffix]);const unit=un.insertId;
 const child=(await q('INSERT INTO units(name,parent_id) VALUES (?,?)',['زیرواحد آزمون '+suffix,unit])).insertId;
 const center1=(await q('INSERT INTO centers(name) VALUES (?)',['مبدأ آزمون '+suffix])).insertId;
 const center2=(await q('INSERT INTO centers(name) VALUES (?)',['مقصد آزمون '+suffix])).insertId;
 const users={};
 for(const [name,role] of [['creator','requester'],['manager','unit_manager'],['fleet','dispatcher'],['dispatch','dispatcher'],['driver','driver'],['admin','admin']]){
  const hash='scrypt$'+randomBytes(16).toString('hex')+'$'+randomBytes(64).toString('hex');
  users[name]=(await q('INSERT INTO users(username,name,role_code,password_hash,unit_id) VALUES (?,?,?,?,?)',['wf_'+name+'_'+suffix,'آزمون '+name,role,hash,unit])).insertId;
 }
 const session=name=>({id:users[name],auth_version:1});
 const grant=async(name,cap,desc=false,relationship='ordinary')=>q('INSERT INTO workflow_grants(user_id,unit_id,capability,include_descendants,relationship) VALUES (?,?,?,?,?)',[users[name],unit,cap,desc?1:0,relationship]);
 await grant('creator','workflow.create');await grant('creator','workflow.create_for_others');
 await grant('manager','workflow.unit_approve',false,'independent_peer');
 await grant('fleet','workflow.fleet_approve');await grant('dispatch','workflow.dispatch.org');
 const body={unitId:unit,beneficiaryId:users.creator,originId:center1,destinationId:center2,date:today(),time:'10:00',needs:'انتقال نمونهٔ آزمایشی غیرواقعی'};
 const [settings]=await q('SELECT enabled,org_enabled,contractor_enabled FROM workflow_settings WHERE id=1');eq(Number(settings.enabled),0);eq(Number(settings.org_enabled),0);eq(Number(settings.contractor_enabled),0);
 await deny(409,()=>createWorkflow(db,session('creator'),body,randomUUID()));
 await q('UPDATE workflow_settings SET enabled=1,org_enabled=1,contractor_enabled=1 WHERE id=1');
 const key=randomUUID(),a=await createWorkflow(db,session('creator'),body,key);eq(a.state,'awaiting_unit');eq(a.version,1);
 eq(await createWorkflow(db,session('creator'),body,key),a);
 await deny(409,()=>createWorkflow(db,session('creator'),{...body,needs:'داده متفاوت است'},key));
 const [noAssignment]=await q('SELECT transport_request_id FROM workflow_requests WHERE id=?',[a.id]);eq(noAssignment.transport_request_id,null);
 eq(Number((await q('SELECT COUNT(*) n FROM transport_requests'))[0].n),before.transport_requests);
 const childContext=await workflowContext(db,session('creator'),users.creator);eq(childContext.ctx.grants.some(g=>g.unitIds.includes(child)),false);
 await q("UPDATE workflow_grants SET include_descendants=1 WHERE user_id=? AND capability='workflow.create'",[users.creator]);
 const wide=await workflowContext(db,session('creator'),users.creator);eq(wide.ctx.grants.some(g=>g.capability==='workflow.create'&&g.unitIds.includes(child)),true);
 const change=(name,action,version,extra={},id=a.id)=>changeWorkflow(db,session(name),id,action,{version,...extra},randomUUID());
 await deny(403,()=>change('creator','unit_approve',1));
 await deny(409,()=>change('fleet','fleet_approve',1,{ownership:'org'}));
 // Ownership is unassigned: owner-scoped dispatcher must be denied visibility first.
 await deny(403,()=>change('dispatch','dispatch',1,{vehicleId:1,driverIds:[users.driver]}));
 const u=await change('manager','unit_approve',1);eq(u.state,'awaiting_fleet');eq(u.version,2);
 await deny(409,()=>change('manager','unit_approve',1));
 const f=await change('fleet','fleet_approve',2,{ownership:'org'});eq(f.state,'awaiting_dispatch');eq(f.version,3);
 await deny(403,()=>change('manager','dispatch',3,{vehicleId:1,driverIds:[users.driver]}));
 const [type]=await q("SELECT id FROM vehicle_types WHERE code='sedan' AND is_active=1 AND deleted_at IS NULL");if(!type)throw Error('ACTIVE_SEDAN_REFERENCE_REQUIRED');
 const vehicle=(await q("INSERT INTO vehicles(name,plate,plate_key,body_type,vehicle_type_id,service_type,cargo_capacity,ownership) VALUES (?,?,?,'sedan',?,'cargo',3,'org')",['خودروی آزمون گردش',suffix,suffix,type.id])).insertId;
 await q('INSERT INTO user_vehicles(user_id,vehicle_id) VALUES (?,?)',[users.driver,vehicle]);
 await deny(409,()=>change('dispatch','dispatch',3,{vehicleId:vehicle,driverIds:[users.creator]}));
 await q('UPDATE workflow_settings SET org_enabled=0 WHERE id=1');
 await deny(409,()=>change('dispatch','dispatch',3,{vehicleId:vehicle,driverIds:[users.driver]}));
 await q('UPDATE workflow_settings SET org_enabled=1 WHERE id=1');
 const dk=randomUUID(),dBody={version:3,vehicleId:vehicle,driverIds:[users.driver]};
 const done=await changeWorkflow(db,session('dispatch'),a.id,'dispatch',dBody,dk);eq(done.state,'scheduled');assert(Number.isSafeInteger(done.transportRequestId));checks++;
 eq(await changeWorkflow(db,session('dispatch'),a.id,'dispatch',dBody,dk),done);
 const [linked]=await q('SELECT state,transport_request_id,version FROM workflow_requests WHERE id=?',[a.id]);eq(linked.version,4);eq(linked.transport_request_id,done.transportRequestId);
 const [driver]=await q('SELECT user_id FROM request_drivers WHERE request_id=?',[done.transportRequestId]);eq(driver.user_id,users.driver);
 const [event]=await q('SELECT actor_id,event_type FROM request_events WHERE request_id=?',[done.transportRequestId]);eq(event.event_type,'workflow_dispatched');eq(event.actor_id,users.dispatch);
 const [audit]=await q("SELECT actor_id,JSON_UNQUOTE(JSON_EXTRACT(payload,'$.before.state')) old_state,JSON_UNQUOTE(JSON_EXTRACT(payload,'$.after.state')) new_state FROM audit_log WHERE entity_type='workflow_requests' AND entity_id=? AND action='workflow.wr_update' ORDER BY id DESC LIMIT 1",[String(a.id)]);eq(audit.actor_id,users.dispatch);eq(audit.old_state,'awaiting_dispatch');eq(audit.new_state,'scheduled');
 await deny(409,()=>change('creator','edit',4,{...body,reason:'اصلاح درخواست اجرایی'}));
 const r=await createWorkflow(db,session('creator'),body,randomUUID());
 const ret=await change('manager','return',1,{reason:'تاریخ و ساعت بررسی شوند'},r.id);eq(ret.state,'returned');
 const res=await change('creator','resubmit',2,{...body,reason:'اطلاعات بررسی و اصلاح شد'},r.id);eq(res.state,'awaiting_unit');
 const [resRow]=await q('SELECT content_version,unit_approval,fleet_approval FROM workflow_requests WHERE id=?',[r.id]);eq(resRow.content_version,2);eq(resRow.unit_approval,null);eq(resRow.fleet_approval,null);
 const rej=await change('manager','reject',3,{reason:'درخواست مورد تأیید نیست'},r.id);eq(rej.state,'rejected');
 await deny(409,()=>change('creator','resubmit',4,{...body,reason:'ارسال دوباره درخواست'},r.id));
 const ownManager=await createWorkflow(db,session('creator'),{...body,beneficiaryId:users.manager},randomUUID());eq(ownManager.state,'awaiting_approver');
 await deny(403,()=>change('manager','unit_approve',1,{},ownManager.id));
 await deny(401,()=>changeWorkflow(db,{id:users.manager,auth_version:2},ownManager.id,'unit_approve',{version:1},randomUUID()));
 // SQL-layer protection, including no-op version preservation.
 const [settingVersion]=await q('SELECT version,edited_at FROM workflow_settings WHERE id=1');await q('UPDATE workflow_settings SET enabled=enabled WHERE id=1');eq((await q('SELECT version,edited_at FROM workflow_settings WHERE id=1'))[0],settingVersion);
 for(const [table,id] of [['workflow_requests',a.id],['workflow_settings',1]]){let blocked=false;try{await q('DELETE FROM '+table+' WHERE id=?',[id])}catch(e){blocked=e.code==='ER_SIGNAL_EXCEPTION'}eq(blocked,true)}
 const [grantRow]=await q('SELECT id FROM workflow_grants WHERE user_id=? LIMIT 1',[users.creator]);let blocked=false;try{await q('UPDATE workflow_grants SET user_id=? WHERE id=?',[users.manager,grantRow.id])}catch(e){blocked=e.code==='ER_SIGNAL_EXCEPTION'}eq(blocked,true);

 // Route services against REAL MySQL, but not live HTTP/login/browser acceptance.
 let view=await workflowView(db,session('creator'));eq(view.currentUserId,users.creator);
 eq(view.canGrants,false);eq(view.canSections,false);
 eq(view.items.some(x=>x.id===a.id),true);eq(view.items.some(x=>x.transportRequestId===done.transportRequestId),true);
 eq(view.items.find(x=>x.id===r.id).actions.length,0);
 eq(view.centers.some(x=>x.id===center1),true);
 view=await workflowView(db,session('admin'));eq(view.canGrants,true);eq(view.canSections,true);eq(view.createUnits.length,0);eq(view.items.length,0);
 eq(view.grants.some(x=>x.userId===users.creator),true);
 const cg={userId:users.fleet,unitId:unit,capability:'workflow.configure_approvers',includeDescendants:false,relationship:'ordinary',active:true,reason:'آزمون تعیین مدیر تأییدکنندگان'};
 await deny(403,()=>saveWorkflowGrant(db,session('creator'),cg));
 await deny(403,()=>saveWorkflowGrant(db,session('admin'),{...cg,userId:users.admin}));
 const configured=await saveWorkflowGrant(db,session('admin'),cg);eq(Number.isSafeInteger(configured.id),true);
 view=await workflowView(db,session('fleet'));eq(view.canGrants,true);eq(view.configUnits.includes(unit),true);eq(view.users.some(x=>x.id===users.manager),true);
 const configuredGrantRow=(await q('SELECT * FROM workflow_grants WHERE id=?',[configured.id]))[0];
 await deny(409,()=>saveWorkflowGrant(db,session('admin'),{...cg,version:configuredGrantRow.version+1,active:false},configured.id));
 await saveWorkflowGrant(db,session('admin'),{...cg,version:configuredGrantRow.version,active:false},configured.id);
 eq(Number((await q('SELECT active FROM workflow_grants WHERE id=?',[configured.id]))[0].active),0);
 view=await workflowView(db,session('fleet'));eq(view.canGrants,false);
 await deny(409,()=>assertWorkflowLegacyReassignment(db,done.transportRequestId));await deny(409,()=>assertLegacyWorkflowGate(db));await deny(409,()=>assertWorkflowUnitDeletion(db,unit));
 const sv=(await q('SELECT version FROM workflow_settings WHERE id=1'))[0].version;
 await deny(403,()=>saveWorkflowSettings(db,session('creator'),{version:sv,enabled:true,org:true,contractor:true,reason:'آزمون تنظیم بخش‌ها'}));
 await deny(409,()=>saveWorkflowSettings(db,session('admin'),{version:sv+1,enabled:true,org:true,contractor:true,reason:'آزمون تنظیم بخش‌ها'}));
 await deny(409,()=>saveWorkflowSettings(db,session('admin'),{version:sv,enabled:false,org:true,contractor:true,reason:'آزمون توقف پرونده باز'}));
 await grant('dispatch','workflow.dispatch.contractor');
 await saveWorkflowSettings(db,session('admin'),{version:sv,enabled:true,org:true,contractor:true,reason:'آزمون تنظیمات بدون تغییر عملیاتی'});
 eq(Number((await q('SELECT enabled FROM workflow_settings WHERE id=1'))[0].enabled),1);

 await db.rollback();tx=false;eq(await counts(),before);
 console.log(`Workflow route services acceptance OK: ${checks} checks; all fixtures, settings, grants, approvals, missions, keys and logs rolled back.`);
 console.log('Database route services tested, not live HTTP/login/UI. No business data committed; auto-increment gaps are normal.');
}catch(e){
 let rollbackStatus=tx?'ROLLBACK_NOT_CONFIRMED':'NO_ACTIVE_TEST_TRANSACTION';
 if(tx&&db)try{await db.rollback();tx=false;rollbackStatus='ROLLBACK_OK'}catch{}
 const locations=[...String(e.stack||'').matchAll(/verify-workflow-http\.mjs:(\d+):(\d+)/g)].slice(0,4).map(m=>({line:Number(m[1]),column:Number(m[2])}));
 const code=/^[A-Z0-9_]+$/.test(e.code||'')?e.code:(/^[A-Z0-9_]+$/.test(e.message||'')?e.message:'WORKFLOW_ACCEPTANCE_FAILED');
 console.error('STOP:',code);
 console.error(JSON.stringify({diagnosticVersion:1,checksCompleted:checks,nextCheck:checks+1,locations,probe:probeDiagnostic,rollback:rollbackStatus}));
 // Deliberately omit actual/expected values, SQL text/parameters and full error messages.
 process.exitCode=1;
}
finally{if(db){try{await db.query('SET @behmasir_actor_id=NULL,@behmasir_change_id=NULL')}catch{}await db.end()}}
