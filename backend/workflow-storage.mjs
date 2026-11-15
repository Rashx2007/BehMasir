// Transaction-scoped services. Caller MUST use transactionWithHistory, whose
// app_meta row lock serializes workflow, capacity, access and legacy mutations.
// HTTP callers must pass through the server transaction wrapper.
import {randomUUID} from 'node:crypto';
import {fail,integer,text,isoDate,hhmm,today,withinShift,hash} from './core.mjs';
import {listUnitRows,unitTree} from './unit-tree.mjs';
import {setHistoryActor} from './history-context.mjs';
import {newWorkflowRecord,transitionWorkflow} from './request-workflow-policy.mjs';
const rows=async(db,sql,args=[])=>(await db.execute(sql,args))[0];
const parse=v=>typeof v==='string'?JSON.parse(v):v;
export const WORKFLOW_CAPABILITIES=Object.freeze(['workflow.create','workflow.create_for_others','workflow.configure_approvers','workflow.unit_approve','workflow.fleet_approve','workflow.dispatch.org','workflow.dispatch.contractor','workflow.configure_sections']);
export async function workflowContext(db,session,beneficiaryId,{allowDisabled=false}={}){
 const [u]=await rows(db,'SELECT id,unit_id,role_code,active,auth_version FROM users WHERE id=?',[integer(session.id)]);
 if(!u||Number(u.active)!==1||u.auth_version!==session.auth_version)fail(401,'نشست معتبر نیست.');
 const [settings]=await rows(db,'SELECT * FROM workflow_settings WHERE id=1');
 if(!settings||(!allowDisabled&&Number(settings.enabled)!==1))fail(409,'گردش تأیید هنوز فعال نشده است.');
 const [b]=await rows(db,'SELECT id,unit_id,role_code,active FROM users WHERE id=?',[integer(beneficiaryId)]);
 if(!b)fail(422,'بهره‌بردار پیدا نشد.');
 const tree=unitTree(await listUnitRows(db));
 function scope(g){
  if(!tree.some(t=>t.id===g.unit_id))fail(409,'واحد محدوده حذف شده یا نامعتبر است.');
  if(![0,1].includes(Number(g.include_descendants)))fail(409,'محدوده نامعتبر است.');
  return tree.filter(t=>t.id===g.unit_id||(Number(g.include_descendants)===1&&t.ancestorIds.includes(g.unit_id))).map(t=>t.id);
 }
 const own=await rows(db,'SELECT * FROM workflow_grants WHERE user_id=? AND active=1 ORDER BY id LIMIT 1001',[u.id]);
 if(own.length>1000)fail(413,'تعداد مجوزها بیش از حد مجاز است.');
 const all=await rows(db,"SELECT g.*,u.active user_active FROM workflow_grants g JOIN users u ON u.id=g.user_id WHERE g.active=1 AND u.active=1 AND g.capability='workflow.unit_approve' ORDER BY g.id LIMIT 1001");
 if(all.length>1000)fail(413,'تعداد تأییدکنندگان بیش از حد مجاز است.');
 const ctx={actor:{id:u.id,active:true},grants:own.map(g=>({capability:g.capability,active:true,unitIds:scope(g)})),
 beneficiary:{id:b.id,unitId:b.unit_id,active:Number(b.active)===1,isManager:b.role_code==='unit_manager'},
 unitApprovers:all.map(g=>({id:g.user_id,active:true,unitIds:scope(g),relationship:g.relationship})),
 sections:{org:Number(settings.org_enabled)===1,contractor:Number(settings.contractor_enabled)===1}};
 return {ctx,user:u,tree,settings};
}
export function workflowRecord(r,beneficiaryIsManager){
 return {creatorId:r.creator_id,beneficiaryId:r.beneficiary_id,unitId:r.unit_id,
 beneficiaryIsManager,state:r.state,version:r.version,contentVersion:r.content_version,
 unitApproval:parse(r.unit_approval),fleetApproval:parse(r.fleet_approval),ownership:r.ownership,
 transportRequestId:r.transport_request_id,vehicleId:null,driverIds:[]};
}
async function material(db,b){
 const date=isoDate(b.date),time=hhmm(b.time);
 if(date<today())fail(422,'تاریخ گذشته مجاز نیست.');
 const originId=integer(b.originId),destinationId=integer(b.destinationId),needs=text(b.needs,500);
 if(originId===destinationId)fail(422,'مبدأ و مقصد باید متفاوت باشند.');
 const centers=await rows(db,'SELECT id,name FROM centers WHERE id IN (?,?) AND deleted_at IS NULL',[originId,destinationId]);
 if(centers.length!==2)fail(422,'مبدأ یا مقصد حذف شده یا معتبر نیست.');
 return {date,time,originId,destinationId,needs,centers};
}
async function previous(db,user,key,scope,body){
 if(typeof key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key))fail(422,'شناسه یکتای عملیات لازم است.');
 const bodyHash=hash(JSON.stringify({scope,body}));
 const [old]=await rows(db,'SELECT body_hash,response FROM idempotency_keys WHERE user_id=? AND request_key=?',[user,key]);
 if(old&&old.body_hash!==bodyHash)fail(409,'شناسه عملیات برای محتوای دیگری استفاده شده است.');
 return {bodyHash,result:old?parse(old.response):null};
}
async function remember(db,user,key,bodyHash,result){await rows(db,'INSERT INTO idempotency_keys(user_id,request_key,body_hash,response) VALUES (?,?,?,?)',[user,key,bodyHash,JSON.stringify(result)])}
async function workflowAudit(db,id,actor,payload){await rows(db,"INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (?,'workflow.transition','workflow_requests',?,?)",[actor,String(id),JSON.stringify({...payload,change_id:await changeId(db)})])}
async function changeId(db){const [r]=await rows(db,'SELECT @behmasir_change_id change_id');if(!r?.change_id)throw Error('WORKFLOW_HISTORY_TRANSACTION_REQUIRED');return r.change_id}
export async function createWorkflow(db,session,b,key){
 const {ctx,tree}=await workflowContext(db,session,integer(b.beneficiaryId));
 // Fresh grants are revalidated even for an idempotent replay.
 const unitId=integer(b.unitId);if(!tree.some(t=>t.id===unitId))fail(422,'واحد فعال لازم است.');
 const rec=newWorkflowRecord({unitId,beneficiaryId:integer(b.beneficiaryId)},ctx);
 const old=await previous(db,ctx.actor.id,key,'workflow.create',b);if(old.result)return old.result;
 const m=await material(db,b);await setHistoryActor(db,ctx.actor.id);await changeId(db);
 const result=await rows(db,'INSERT INTO workflow_requests(creator_id,beneficiary_id,unit_id,origin_id,destination_id,service_date,service_time,needs,state) VALUES (?,?,?,?,?,?,?,?,?)',[rec.creatorId,rec.beneficiaryId,rec.unitId,m.originId,m.destinationId,m.date,m.time,m.needs,rec.state]);
 const response={ok:true,id:result.insertId,state:rec.state,version:1};
 await rows(db,'UPDATE units SET used_ever=1 WHERE id=?',[unitId]);
 await workflowAudit(db,result.insertId,ctx.actor.id,{action:'submitted',from:null,to:rec.state,version:1,contentVersion:1});
 await remember(db,ctx.actor.id,key,old.bodyHash,response);return response;
}
export async function changeWorkflow(db,session,id,action,b,key){
 id=integer(id);
 const [r]=await rows(db,'SELECT * FROM workflow_requests WHERE id=? FOR UPDATE',[id]);if(!r)fail(404,'درخواست پیدا نشد.');
 const {ctx}=await workflowContext(db,session,r.beneficiary_id);
 // A revoked actor cannot use an old response to retrieve a now-forbidden request.
 const canSee=r.creator_id===ctx.actor.id||r.beneficiary_id===ctx.actor.id||ctx.grants.some(g=>g.unitIds.includes(r.unit_id)&&(['workflow.unit_approve','workflow.fleet_approve'].includes(g.capability)||g.capability==='workflow.dispatch.'+r.ownership));
 if(!canSee)fail(403,'درخواست در محدوده مجاز نیست.');
 const old=await previous(db,ctx.actor.id,key,'workflow.'+id+'.'+action,b);if(old.result)return old.result;
 let rec=workflowRecord(r,ctx.beneficiary.isManager);
 const decision=transitionWorkflow(rec,action,b,ctx);rec=decision.record;
 let m={originId:r.origin_id,destinationId:r.destination_id,date:r.service_date,time:r.service_time.slice(0,5),needs:r.needs};
 if(['edit','resubmit'].includes(action)){
  // Check both original scope (policy above) and proposed new scope/beneficiary.
  const next=await workflowContext(db,session,integer(b.beneficiaryId));
  const fresh=newWorkflowRecord({unitId:integer(b.unitId),beneficiaryId:integer(b.beneficiaryId)},next.ctx);
  m=await material(db,b);rec={...fresh,version:rec.version,contentVersion:rec.contentVersion};
  decision.event.to=rec.state;decision.event.contentVersion=rec.contentVersion;
 }
 await setHistoryActor(db,ctx.actor.id);await changeId(db);
 if(action==='dispatch'){
  if(r.service_date<today())fail(409,'تاریخ درخواست گذشته است؛ ابتدا برای اصلاح برگردانید.');
  const [v]=await rows(db,'SELECT * FROM vehicles WHERE id=? AND deleted_at IS NULL FOR UPDATE',[integer(b.vehicleId)]);
  if(!v||v.status!=='ok'||v.ownership!==rec.ownership||v.cargo_capacity<1||!withinShift(v,m.time))fail(409,'خودرو از نظر مالکیت، وضعیت، شیفت یا ظرفیت مناسب نیست.');
  const [count]=await rows(db,"SELECT COUNT(*) n FROM transport_requests WHERE vehicle_id=? AND service_date=? AND status<>'cancelled'",[v.id,m.date]);
  if(Number(count.n)>=v.cargo_capacity)fail(409,'ظرفیت روزانه تکمیل است.');
  if(!Array.isArray(b.driverIds)||!b.driverIds.length||b.driverIds.length>10)fail(422,'راننده مجاز انتخاب کنید.');
  const drivers=b.driverIds.map(x=>integer(x));if(new Set(drivers).size!==drivers.length)fail(422,'راننده تکراری است.');
  const ps=drivers.map(()=>'?').join(',');
  const allowed=await rows(db,`SELECT u.id FROM users u JOIN user_vehicles uv ON uv.user_id=u.id WHERE uv.vehicle_id=? AND u.role_code='driver' AND u.active=1 AND u.id IN (${ps})`,[v.id,...drivers]);
  if(allowed.length!==drivers.length)fail(409,'راننده فعال و مرتبط با خودرو لازم است.');
  const busy=await rows(db,`SELECT r.id FROM request_drivers rd JOIN transport_requests r ON r.id=rd.request_id WHERE rd.user_id IN (${ps}) AND r.status IN ('scheduled','enroute') AND (r.service_date=? OR r.status='enroute') LIMIT 1`,[...drivers,m.date]);
  if(busy.length)fail(409,'راننده در مأموریت باز دیگری است؛ بررسی دستی لازم است.');
  const centers=await rows(db,'SELECT id,name FROM centers WHERE id IN (?,?) AND deleted_at IS NULL',[r.origin_id,r.destination_id]);
  const [un]=await rows(db,'SELECT name FROM units WHERE id=? AND deleted_at IS NULL',[r.unit_id]);
  if(centers.length!==2||!un)fail(409,'واحد، مبدأ یا مقصد نیازمند بررسی است.');
  const request=await rows(db,'INSERT INTO transport_requests(requester_user_id,unit_id,vehicle_id,origin_id,destination_id,unit_name,origin_name,destination_name,vehicle_name,plate,service_date,service_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[r.beneficiary_id,r.unit_id,v.id,r.origin_id,r.destination_id,un.name,centers.find(c=>c.id===r.origin_id).name,centers.find(c=>c.id===r.destination_id).name,v.name,v.plate,m.date,m.time]);
  rec.transportRequestId=request.insertId;
  for(const driver of drivers)await rows(db,'INSERT INTO request_drivers(request_id,user_id) VALUES (?,?)',[request.insertId,driver]);
  await rows(db,"INSERT INTO request_events(request_id,actor_id,event_type,payload) VALUES (?,?,'workflow_dispatched',?)",[request.insertId,ctx.actor.id,JSON.stringify({workflowId:id,unitApproval:rec.unitApproval,fleetApproval:rec.fleetApproval,driverIds:drivers})]);
 }
 await rows(db,'UPDATE workflow_requests SET beneficiary_id=?,unit_id=?,origin_id=?,destination_id=?,service_date=?,service_time=?,needs=?,state=?,content_version=?,unit_approval=?,fleet_approval=?,ownership=?,transport_request_id=?,version=? WHERE id=?',[rec.beneficiaryId,rec.unitId,m.originId,m.destinationId,m.date,m.time,m.needs,rec.state,rec.contentVersion,rec.unitApproval?JSON.stringify(rec.unitApproval):null,rec.fleetApproval?JSON.stringify(rec.fleetApproval):null,rec.ownership,rec.transportRequestId,rec.version,id]);
 const [stored]=await rows(db,'SELECT version FROM workflow_requests WHERE id=?',[id]);if(stored.version!==rec.version)throw Error('WORKFLOW_VERSION_STORAGE_MISMATCH');
 await workflowAudit(db,id,ctx.actor.id,decision.event);
 const response={ok:true,id,state:rec.state,version:rec.version,transportRequestId:rec.transportRequestId};
 await remember(db,ctx.actor.id,key,old.bodyHash,response);return response;
}
