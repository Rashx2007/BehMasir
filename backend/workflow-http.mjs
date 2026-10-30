// Route services are invoked only in a fresh readSnapshot or transactionWithHistory.
import {fail,integer,bool,text} from './core.mjs';
import {setHistoryActor} from './history-context.mjs';
import {workflowContext,workflowRecord,WORKFLOW_CAPABILITIES,createWorkflow,changeWorkflow} from './workflow-storage.mjs';
import {transitionWorkflow,assertFleetSectionChange} from './request-workflow-policy.mjs';
const q=async(db,sql,args=[])=>(await db.execute(sql,args))[0];
const uniq=ids=>[...new Set(ids)].sort((a,b)=>a-b);
const capUnits=(ctx,cap)=>uniq(ctx.grants.filter(g=>g.capability===cap).flatMap(g=>g.unitIds));
const has=(ctx,cap,id)=>capUnits(ctx,cap).includes(id);
const placeholders=a=>a.map(()=>'?').join(',');
const readJSON=v=>typeof v==='string'?JSON.parse(v):v;
async function context(db,s){return workflowContext(db,s,s.id,{allowDisabled:true})}
function settingsDTO(r){return {enabled:Number(r.enabled)===1,org:Number(r.org_enabled)===1,contractor:Number(r.contractor_enabled)===1,version:r.version}}
function grantConfig(ctx,user){return user.role_code==='admin'||capUnits(ctx,'workflow.configure_approvers').length>0}
function sectionConfig(ctx,user){return user.role_code==='admin'||capUnits(ctx,'workflow.configure_sections').length>0}
export function workflowPredicate(ctx){
 const parts=['w.creator_id=?','w.beneficiary_id=?'],args=[ctx.actor.id,ctx.actor.id];
 const broad=uniq(['workflow.unit_approve','workflow.fleet_approve'].flatMap(c=>capUnits(ctx,c)));
 if(broad.length){parts.push(`w.unit_id IN (${placeholders(broad)})`);args.push(...broad)}
 for(const [cap,owner] of [['workflow.dispatch.org','org'],['workflow.dispatch.contractor','contractor']]){
  const ids=capUnits(ctx,cap);if(ids.length){parts.push(`(w.unit_id IN (${placeholders(ids)}) AND w.ownership=?)`);args.push(...ids,owner)}
 }
 return ['('+parts.join(' OR ')+')',args];
}
export function workflowActions(r,ctx,enabled){
 if(!enabled)return [];
 const result=[];
 for(const action of ['unit_approve','fleet_approve','return','reject','dispatch_return','dispatch','edit','resubmit','cancel']){
  if(action==='edit'&&r.state==='returned')continue;
  try{transitionWorkflow(workflowRecord(r,r.beneficiary_role==='unit_manager'),action,{version:r.version,ownership:ctx.sections.org?'org':'contractor',reason:'بررسی مجوز عملیات'},ctx);result.push(action)}catch(e){if(!e.status)throw e}
 }
 return result;
}
function dto(r,ctx,enabled){return {id:r.id,creatorId:r.creator_id,creator:r.creator_name,beneficiaryId:r.beneficiary_id,beneficiary:r.beneficiary_name,unitId:r.unit_id,unit:r.unit_name,originId:r.origin_id,destinationId:r.destination_id,origin:r.origin_name,destination:r.destination_name,date:r.service_date,time:r.service_time.slice(0,5),needs:r.needs,state:r.state,version:r.version,contentVersion:r.content_version,unitApproval:readJSON(r.unit_approval),fleetApproval:readJSON(r.fleet_approval),ownership:r.ownership,transportRequestId:r.transport_request_id,progress:r.operational_status||null,actions:workflowActions(r,ctx,enabled)}}
export async function workflowView(db,s,beforeValue){
 const {ctx,user,tree,settings}=await context(db,s),flags=settingsDTO(settings),canGrants=grantConfig(ctx,user),canSections=sectionConfig(ctx,user);
 const [predicate,args]=workflowPredicate(ctx),before=beforeValue?integer(beforeValue):4294967295;
 const list=await q(db,`SELECT w.*,cu.name creator_name,bu.name beneficiary_name,bu.role_code beneficiary_role,un.name unit_name,o.name origin_name,d.name destination_name,tr.status operational_status FROM workflow_requests w JOIN users cu ON cu.id=w.creator_id JOIN users bu ON bu.id=w.beneficiary_id JOIN units un ON un.id=w.unit_id JOIN centers o ON o.id=w.origin_id JOIN centers d ON d.id=w.destination_id LEFT JOIN transport_requests tr ON tr.id=w.transport_request_id WHERE ${predicate} AND w.id<? ORDER BY w.id DESC LIMIT 101`,[...args,before]);
 const configUnits=user.role_code==='admin'?tree.map(t=>t.id):capUnits(ctx,'workflow.configure_approvers');
 const createUnits=capUnits(ctx,'workflow.create'),delegateUnits=capUnits(ctx,'workflow.create_for_others');
 const visibleUnits=uniq([...createUnits,...configUnits,...ctx.grants.flatMap(g=>g.unitIds)]);
 let users=[];
 if(canGrants||delegateUnits.length){
  const scope=user.role_code==='admin'&&canGrants?'1=1':`unit_id IN (${placeholders(uniq([...configUnits,...delegateUnits]))||'NULL'})`;
  users=await q(db,`SELECT id,name,username,role_code role,unit_id unitId FROM users WHERE active=1 AND ${scope} ORDER BY name,id LIMIT 2001`,user.role_code==='admin'&&canGrants?[]:uniq([...configUnits,...delegateUnits]));
  if(users.length>2000)fail(413,'تعداد کاربران بیش از ظرفیت این فرم است؛ فیلتر لازم است.');
 }
 if(!users.some(u=>u.id===user.id))users.push({id:user.id,name:s.name||'حساب من',username:s.username,role:user.role_code,unitId:user.unit_id});
 let grants=[];
 if(canGrants){
  const scope=user.role_code==='admin'?'1=1':`g.unit_id IN (${placeholders(configUnits)}) AND g.capability='workflow.unit_approve'`;
  grants=await q(db,`SELECT g.*,u.name userName,un.name unitName FROM workflow_grants g JOIN users u ON u.id=g.user_id JOIN units un ON un.id=g.unit_id WHERE ${scope} ORDER BY g.id DESC LIMIT 1001`,user.role_code==='admin'?[]:configUnits);
  if(grants.length>1000)fail(413,'فهرست مجوزها به صفحه‌بندی نیاز دارد.');
  grants=grants.map(g=>({id:g.id,userId:g.user_id,unitId:g.unit_id,capability:g.capability,includeDescendants:!!g.include_descendants,relationship:g.relationship,active:!!g.active,version:g.version,userName:g.userName,unitName:g.unitName}));
 }
 const centers=flags.enabled&&createUnits.length?await q(db,'SELECT id,name FROM centers WHERE deleted_at IS NULL ORDER BY name,id LIMIT 2001'):[];
 if(centers.length>2000)fail(413,'فهرست مراکز به فیلتر نیاز دارد.');
 const owners=[];if(capUnits(ctx,'workflow.dispatch.org').length&&flags.org)owners.push('org');if(capUnits(ctx,'workflow.dispatch.contractor').length&&flags.contractor)owners.push('contractor');
 const vehicles=flags.enabled&&owners.length?await q(db,`SELECT id,name,plate,ownership,status FROM vehicles WHERE deleted_at IS NULL AND ownership IN (${placeholders(owners)}) ORDER BY id LIMIT 2001`,owners):[];
 if(vehicles.length>2000)fail(413,'فهرست خودروها به فیلتر نیاز دارد.');
 const drivers=vehicles.length?await q(db,`SELECT u.id,u.name,uv.vehicle_id vehicleId FROM user_vehicles uv JOIN users u ON u.id=uv.user_id WHERE u.active=1 AND u.role_code='driver' AND uv.vehicle_id IN (${placeholders(vehicles.map(v=>v.id))}) ORDER BY uv.vehicle_id,u.id LIMIT 10001`,vehicles.map(v=>v.id)):[];
 if(drivers.length>10000)fail(413,'فهرست رانندگان به فیلتر نیاز دارد.');
 return {version:1,currentUserId:user.id,settings:flags,permissions:ctx.grants,createUnits,delegateUnits,configUnits,canGrants,canSections,isSystemAdmin:user.role_code==='admin',units:tree.filter(t=>visibleUnits.includes(t.id)).map(t=>({id:t.id,name:t.name,path:t.path,parentId:t.parentId})),users,centers,vehicles,drivers,grants,capabilities:WORKFLOW_CAPABILITIES,items:list.slice(0,100).map(r=>dto(r,ctx,flags.enabled)),cursor:list.length>100?list[99].id:null};
}
async function summary(db,u,action,entity,id,payload){await q(db,'INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (?,?,?,?,?)',[u.id,action,entity,String(id),JSON.stringify(payload)])}
export async function saveWorkflowSettings(db,s,b){
 const {ctx,user,settings}=await context(db,s);if(!sectionConfig(ctx,user))fail(403,'مجوز مستقل تنظیم بخش‌ها لازم است.');
 if(integer(b.version)!==settings.version)fail(409,'تنظیمات تغییر کرده است؛ تازه‌سازی کنید.');
 const next={enabled:bool(b.enabled),org:bool(b.org),contractor:bool(b.contractor)},reason=text(b.reason,500);if([...reason].length<5)fail(422,'دلیل حداقل پنج نویسه لازم است.');
 if(next.enabled&&!next.org&&!next.contractor)fail(422,'حداقل یک بخش ناوگان را فعال کنید.');
 const counts={org:0,contractor:0};
 for(const owner of Object.keys(counts)){
  counts[owner]=Number((await q(db,"SELECT COUNT(*) n FROM transport_requests r JOIN vehicles v ON v.id=r.vehicle_id WHERE r.status IN ('scheduled','enroute') AND v.ownership=?",[owner]))[0].n)+Number((await q(db,"SELECT COUNT(*) n FROM workflow_requests WHERE state='awaiting_dispatch' AND ownership=?",[owner]))[0].n);
  if(next.enabled&&!next[owner]&&counts[owner])fail(409,'این بخش مأموریت باز یا درخواست منتظر تخصیص دارد؛ ابتدا تعیین تکلیف کنید.');
 }
 assertFleetSectionChange(settingsDTO(settings),next,{...ctx,canConfigureFleetSections:true,reason,openAssignments:counts});
 if(!next.enabled&&Number(settings.enabled)===1&&Number((await q(db,"SELECT COUNT(*) n FROM workflow_requests WHERE state IN ('awaiting_approver','awaiting_unit','awaiting_fleet','awaiting_dispatch','returned')"))[0].n)>0)fail(409,'پروندهٔ باز وجود دارد؛ خاموش‌کردن گردش فعلاً مجاز نیست.');
 if(next.enabled){
  const required=['workflow.create','workflow.unit_approve','workflow.fleet_approve',...(next.org?['workflow.dispatch.org']:[]),...(next.contractor?['workflow.dispatch.contractor']:[])];
  for(const cap of required){const [found]=await q(db,'SELECT g.id FROM workflow_grants g JOIN users u ON u.id=g.user_id JOIN units un ON un.id=g.unit_id WHERE g.active=1 AND u.active=1 AND un.deleted_at IS NULL AND g.capability=? LIMIT 1',[cap]);if(!found)fail(409,'پیش از فعال‌سازی، مجوزهای ثبت، تأیید واحد، تأیید ناوگان و تخصیص بخش‌های انتخابی را تعیین کنید.');}
 }
 await setHistoryActor(db,user.id);await q(db,'UPDATE workflow_settings SET enabled=?,org_enabled=?,contractor_enabled=? WHERE id=1',[+next.enabled,+next.org,+next.contractor]);
 await summary(db,user,'workflow.settings_changed','workflow_settings',1,{reason,before:settingsDTO(settings),after:next});return {ok:true};
}
export async function saveWorkflowGrant(db,s,b,grantId=null){
 const {ctx,user,tree}=await context(db,s),system=user.role_code==='admin';if(!grantConfig(ctx,user))fail(403,'مجوز مدیریت تأییدکنندگان لازم است.');
 const target=integer(b.userId),unit=integer(b.unitId),cap=text(b.capability,40),include=bool(b.includeDescendants),active=bool(b.active),reason=text(b.reason,500);
 if([...reason].length<5||!WORKFLOW_CAPABILITIES.includes(cap)||!['ordinary','superior','independent_peer'].includes(b.relationship))fail(422,'مجوز، رابطه یا دلیل معتبر نیست.');
 if(!tree.some(t=>t.id===unit))fail(422,'واحد فعال انتخاب کنید.');
 if(!system){
  if(cap!=='workflow.unit_approve'||!has(ctx,'workflow.configure_approvers',unit))fail(403,'فقط تعیین تأییدکنندهٔ واحد در محدوده مجاز است.');
  const affected=tree.filter(t=>t.id===unit||(include&&t.ancestorIds.includes(unit))).map(t=>t.id);
  if(affected.some(id=>!has(ctx,'workflow.configure_approvers',id)))fail(403,'زیرواحد خارج از محدوده است.');
 }
 if(active&&target===user.id&&['workflow.unit_approve','workflow.fleet_approve','workflow.configure_approvers','workflow.configure_sections'].includes(cap))fail(403,'نمی‌توانید برای خودتان اختیار تأیید یا مدیریت تأییدکننده تعیین کنید.');
 const [person]=await q(db,'SELECT id,unit_id,active FROM users WHERE id=?',[target]);if(!person||(+person.active!==1&&active))fail(422,'کاربر فعال انتخاب کنید.');
 if(!system&&active&&!capUnits(ctx,'workflow.configure_approvers').includes(person.unit_id))fail(403,'تعیین فرد خارج از واحدهای مجاز نیازمند مدیر سیستم است.');
 let old=null;if(grantId){[old]=await q(db,'SELECT * FROM workflow_grants WHERE id=? FOR UPDATE',[integer(grantId)]);if(!old||old.user_id!==target||old.unit_id!==unit||old.capability!==cap)fail(409,'هویت مجوز قابل تغییر نیست.');if(integer(b.version)!==old.version)fail(409,'مجوز تغییر کرده است؛ تازه‌سازی کنید.');}
 else{const [exists]=await q(db,'SELECT id FROM workflow_grants WHERE user_id=? AND unit_id=? AND capability=?',[target,unit,cap]);if(exists)fail(409,'این مجوز قبلاً تعریف شده؛ همان ردیف را ویرایش کنید.');}
 await setHistoryActor(db,user.id);
 let id=grantId;
 if(old)await q(db,'UPDATE workflow_grants SET include_descendants=?,relationship=?,active=? WHERE id=?',[+include,b.relationship,+active,integer(id)]);
 else{id=(await q(db,'INSERT INTO workflow_grants(user_id,unit_id,capability,include_descendants,relationship,active) VALUES (?,?,?,?,?,?)',[target,unit,cap,+include,b.relationship,+active])).insertId;}
 await summary(db,user,'workflow.grant_changed','workflow_grants',id,{reason,targetUserId:target,unitId:unit,capability:cap,active,includeDescendants:include,relationship:b.relationship});return {ok:true,id};
}
export async function workflowMutation(db,s,path,b,key){
 if(path==='workflow/settings')return saveWorkflowSettings(db,s,b);
 if(path==='workflow/grants')return saveWorkflowGrant(db,s,b);
 let m=/^workflow\/grants\/(\d+)$/.exec(path);if(m)return saveWorkflowGrant(db,s,b,m[1]);
 if(path==='workflow/requests')return createWorkflow(db,s,b,key);
 m=/^workflow\/requests\/(\d+)\/(unit_approve|fleet_approve|return|reject|dispatch_return|dispatch|edit|resubmit|cancel)$/.exec(path);
 if(m)return changeWorkflow(db,s,m[1],m[2],b,key);
 fail(404,'مسیر گردش درخواست پیدا نشد.');
}
export async function assertLegacyWorkflowGate(db){
 const [v]=await q(db,'SELECT MAX(version) version FROM schema_migrations');
 if(Number(v.version)>=5){const [s]=await q(db,'SELECT enabled FROM workflow_settings WHERE id=1');if(!s)fail(503,'تنظیم گردش درخواست ناقص است.');if(Number(s.enabled)===1)fail(409,'ثبت مستقیم متوقف است؛ از بخش «گردش درخواست» استفاده کنید.');}
}
export async function assertWorkflowUnitDeletion(db,id){
 const [v]=await q(db,'SELECT MAX(version) version FROM schema_migrations');if(Number(v.version)<5)return;
 if((await q(db,'SELECT id FROM workflow_grants WHERE unit_id=? AND active=1 LIMIT 1',[integer(id)])).length||(await q(db,'SELECT id FROM workflow_requests WHERE unit_id=? LIMIT 1',[integer(id)])).length)fail(409,'واحد دارای مجوز گردش فعال یا سابقهٔ درخواست است.');
}
// Linked missions keep their approval-bound route/date. Vehicle changes must use
// the existing crisis workflow (preview + reason + concurrency + atomic history),
// not the legacy one-click reassignment route.
export async function assertWorkflowLegacyReassignment(db,id){
 const [v]=await q(db,'SELECT MAX(version) version FROM schema_migrations');
 if(Number(v.version)<5)return;
 const [linked]=await q(db,'SELECT id FROM workflow_requests WHERE transport_request_id=? LIMIT 1',[integer(id)]);
 if(linked)fail(409,'این مأموریت به گردش تأیید متصل است؛ برای تغییر خودرو از مدیریت بحران با پیش‌نمایش و ثبت دلیل استفاده کنید.');
}
