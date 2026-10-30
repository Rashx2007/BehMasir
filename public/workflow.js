// Same-origin API only. No permissions, identities or workflow context are trusted
// from the browser. All labels/values originating in data pass through esc().
let workflowData=null,wfLoading=false,wfSequence=0,wfBusy=false,wfPickers=null,wfOperation=null;
const WF_STATE={awaiting_approver:'در انتظار تعیین تأییدکننده',awaiting_unit:'در انتظار تأیید واحد',awaiting_fleet:'در انتظار تأیید ناوگان',awaiting_dispatch:'در انتظار تخصیص',returned:'بازگردانده‌شده برای اصلاح',rejected:'رد نهایی',cancelled:'لغوشده',scheduled:'تخصیص انجام شده',enroute:'در حال اجرا',delivered:'تحویل‌شده'};
const WF_ACTION={unit_approve:'تأیید واحد',fleet_approve:'تأیید ناوگان',return:'بازگرداندن برای اصلاح',reject:'رد نهایی',dispatch_return:'بازگرداندن به مدیر ناوگان',dispatch:'تخصیص خودرو و راننده',edit:'اصلاح و ارسال از ابتدا',resubmit:'اصلاح و ارسال مجدد',cancel:'لغو درخواست'};
const WF_CAP={'workflow.create':'ثبت درخواست برای خود','workflow.create_for_others':'ثبت برای دیگران','workflow.configure_approvers':'تعیین تأییدکنندهٔ واحد','workflow.unit_approve':'تأیید اولیهٔ واحد','workflow.fleet_approve':'تأیید مدیر ناوگان','workflow.dispatch.org':'تخصیص بخش دولتی','workflow.dispatch.contractor':'تخصیص بخش پیمان‌کار','workflow.configure_sections':'تنظیم بخش‌های ناوگان'};
function destroyWorkflowPickers(){if(wfPickers){for(const p of Object.values(wfPickers))p?.destroy?.();wfPickers=null}}
function clearWorkflowView(){wfSequence++;workflowData=null;wfOperation=null;document.getElementById('workflowPanel')?.replaceChildren();destroyWorkflowPickers()}
function wfSignature(d){return JSON.stringify([d.currentUserId,d.permissions,d.createUnits,d.delegateUnits,d.configUnits,d.canGrants,d.canSections,d.isSystemAdmin,d.settings])}
async function renderWorkflowPanel(force=false,append=false){
 if(!currentUser||serverWorkflowVersion!==1){clearWorkflowView();return}
 if(currentTab!=='workflow'||wfLoading||wfBusy)return;
 wfLoading=true;const userId=currentUser.id,seq=++wfSequence,root=document.getElementById('workflowPanel');
 if(!workflowData)root.textContent='در حال دریافت گردش درخواست…';
 try{
  const d=await apiRequest('workflow'+(append&&workflowData?.cursor?'?before='+workflowData.cursor:''));
  if(seq!==wfSequence||currentUser?.id!==userId)return;
  if(d.version!==1||d.currentUserId!==userId||!Array.isArray(d.items))throw Error('نسخهٔ رابط و گردش درخواست هماهنگ نیست.');
  const same=workflowData&&wfSignature(workflowData)===wfSignature(d);
  if(workflowData&&!same){closeModal();wfOperation=null;}
  if(append&&same)d.items=[...new Map([...workflowData.items,...d.items].map(r=>[r.id,r])).values()];
  workflowData=d;wfRender();
 }catch(e){if(seq!==wfSequence)return;workflowData=null;root.replaceChildren();root.textContent=e.message;if(e.status===401)lockServerView();else closeModal();showToast('error',e.message)}
 finally{wfLoading=false}
}
function wfRender(){
 const d=workflowData,root=document.getElementById('workflowPanel');if(!d||!currentUser){root.replaceChildren();return}
 const rows=d.items.map(r=>`<article class="management-card wf-request"><div class="wf-row"><h3>پروندهٔ ${faNum(r.id)} — ${esc(WF_STATE[r.state]||r.state)}</h3><span class="badge">نسخهٔ اطلاعات ${faNum(r.contentVersion)}</span></div><p><strong>${esc(r.origin)} ← ${esc(r.destination)}</strong><br>${esc(r.unit)} · ${esc(formatRouteDate(r.date))} · <span dir="ltr">${esc(r.time)}</span></p><p>ثبت‌کننده: ${esc(r.creator)} · بهره‌بردار: ${esc(r.beneficiary)}</p><p class="wf-text">${esc(r.needs)}</p>${r.transportRequestId?`<p>شمارهٔ مأموریت: <strong>${faNum(r.transportRequestId)}</strong> · ${esc(({scheduled:'زمان‌بندی‌شده',enroute:'در حال اجرا',delivered:'تحویل‌شده',cancelled:'لغوشده'})[r.progress]||'در انتظار اجرا')}</p>`:''}<div class="wf-actions">${r.actions.filter(a=>Object.hasOwn(WF_ACTION,a)).map(a=>`<button class="quiet-button" onclick="wfOpenAction(${r.id},'${a}')">${esc(WF_ACTION[a])}</button>`).join('')}</div></article>`).join('');
 root.innerHTML=`<div class="management-card wf-intro"><h2>گردش درخواست و تأییدها</h2><p>ثبت ← تأیید واحد ← تأیید ناوگان ← تخصیص ← اجرا و تحویل<br>ثبت‌کننده و بهره‌بردار نمی‌توانند همان درخواست را تأیید کنند. درخواستِ منتظر تأیید، خودرو یا ظرفیت رزرو نمی‌کند.</p></div><div class="wf-actions">${d.settings.enabled&&d.createUnits.length?'<button class="btn-primary" onclick="wfOpenRequest()">ثبت درخواست جدید</button>':''}${d.canSections?'<button class="quiet-button" onclick="wfOpenSettings()">فعال‌سازی و بخش‌های ناوگان</button>':''}${d.canGrants?'<button class="quiet-button" onclick="wfOpenGrant()">تعریف مجوز / تأییدکننده</button>':''}<button class="quiet-button" onclick="renderWorkflowPanel(true)">تازه‌سازی</button></div>${!d.settings.enabled?'<div class="management-card"><strong>گردش جدید هنوز غیرفعال است.</strong><p>مدیر سیستم ابتدا کاربران، مجوزهای ثبت، تأیید واحد، تأیید ناوگان و تخصیص را تعریف کند؛ سپس بخش‌های موردنیاز و گردش را فعال کند. نقش‌ها به‌تنهایی مجوز تأیید ایجاد نمی‌کنند.</p></div>':''}${wfOperation?'<div class="management-card"><p>نتیجهٔ یک ارسال قبلی نیاز به بررسی دارد. فهرست را بررسی کنید؛ ارسال را کورکورانه تکرار نکنید.</p><button class="quiet-button" onclick="wfAcknowledgeOperation()">نتیجه را بررسی کردم</button></div>':''}<div class="wf-list">${rows||'<div class="management-card">پرونده‌ای در محدودهٔ مجاز شما وجود ندارد.</div>'}</div>${d.cursor?'<button class="quiet-button" onclick="renderWorkflowPanel(true,true)">پرونده‌های قدیمی‌تر</button>':''}${d.canGrants?`<div class="management-card"><h3>مجوزهای گردش درخواست</h3><p>عضویت در واحد، به‌تنهایی مجوز تأیید یا مشاهدهٔ زیرواحدها نیست. تعیین نقش حساب در بخش کاربران، و تعیین مجوز گردش در این قسمت انجام می‌شود.</p>${d.grants.map(g=>`<article class="wf-grant"><p><strong>${esc(g.userName)}</strong> — ${esc(WF_CAP[g.capability]||g.capability)}<br>${esc(g.unitName)}${g.includeDescendants?' و زیرواحدهای آن':''} · ${g.active?'فعال':'غیرفعال'}</p><button class="quiet-button" onclick="wfOpenGrant(${g.id})">ویرایش مجوز</button></article>`).join('')||'<p>مجوزی تعریف نشده است.</p>'}</div>`:''}`;
}
function wfModal(title,body,submit,label='ثبت'){
 closeModal();document.getElementById('modalRoot').innerHTML=`<div class="modal-overlay"><section class="modal-box wf-dialog"><div class="modal-head"><h2 class="modal-title">${esc(title)}</h2><button class="modal-close" aria-label="بستن" onclick="closeModal()">×</button></div><form onsubmit="event.preventDefault();${submit}"><div class="modal-body form-grid">${body}</div><div class="modal-foot"><button type="button" class="btn-secondary" onclick="closeModal()">انصراف</button><button type="submit" class="btn-primary">${esc(label)}</button></div></form></section></div>`;
}
const wfOptions=(items,selected,label=x=>x.name)=>items.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(label(x))}</option>`).join('');
const wfReason=()=>'<div class="form-group full"><label for="wfReason">دلیل روشن (۵ تا ۵۰۰ نویسه)</label><textarea id="wfReason" required minlength="5" maxlength="500" rows="3"></textarea></div>';
function wfOpenRequest(id=null,action='edit'){
 const d=workflowData;if(!d?.settings.enabled)return;
 const r=id?d.items.find(x=>x.id===id):null;if(id&&!r?.actions.includes(action))return;
 const unit=r?.unitId||d.users.find(u=>u.id===currentUser.id)?.unitId;
 wfModal(r?WF_ACTION[action]+' — پروندهٔ '+faNum(id):'ثبت درخواست جدید',`<p class="full">خودرو و راننده پس از تأییدها تعیین می‌شوند. تغییر اطلاعات اصلی، تأییدهای قبلی را از اعتبار خارج می‌کند.</p><div class="form-group"><label for="wfUnit">واحد</label><select id="wfUnit" required onchange="wfBeneficiaries()">${wfOptions(d.units.filter(u=>d.createUnits.includes(u.id)),unit,x=>x.path||x.name)}</select></div><div class="form-group"><label for="wfBeneficiary">درخواست برای چه کسی است؟</label><select id="wfBeneficiary" required></select></div><div class="form-group"><label for="wfOrigin">مبدأ</label><select id="wfOrigin" required>${wfOptions(d.centers,r?.originId)}</select></div><div class="form-group"><label for="wfDestination">مقصد</label><select id="wfDestination" required>${wfOptions(d.centers,r?.destinationId)}</select></div><div class="form-group"><label for="wfDate">تاریخ (شمسی)</label><input id="wfDate" type="text" inputmode="numeric" autocomplete="off" placeholder="سال/ماه/روز" required></div><div class="form-group"><label for="wfTime">ساعت</label><input id="wfTime" type="text" inputmode="numeric" autocomplete="off" placeholder="ساعت:دقیقه" required></div><div class="form-group full"><label for="wfNeeds">شرح نیاز حمل (بدون اطلاعات محرمانه)</label><textarea id="wfNeeds" required maxlength="500" rows="3">${esc(r?.needs||'')}</textarea></div>${r?wfReason():''}`,`wfSaveRequest(${id||'null'},'${action}')`,r?'اصلاح و ارسال از ابتدا':'ثبت و ارسال برای تأیید');
 wfBeneficiaries(r?.beneficiaryId);
 wfPickers={date:Pickers.createDatePicker({input:document.getElementById('wfDate'),calendar:jalaliCalendar,locale:persianLocale}),time:Pickers.createTimePicker({input:document.getElementById('wfTime'),locale:persianLocale})};
 wfPickers.date.setValue(r?.date||todayStr());const [h,m]=(r?.time||'08:00').split(':').map(Number);wfPickers.time.setValue(h,m);
}
function wfBeneficiaries(selected=null){
 const unit=Number(document.getElementById('wfUnit').value),d=workflowData;
 const list=d.users.filter(u=>u.unitId===unit&&(u.id===currentUser.id||d.delegateUnits.includes(unit)));
 document.getElementById('wfBeneficiary').innerHTML=wfOptions(list,selected||currentUser.id,x=>x.name+(x.id===currentUser.id?' (خودم)':''));
}
async function wfSaveRequest(id,action){
 const t=wfPickers?.time.getValue();
 const b={unitId:Number(document.getElementById('wfUnit').value),beneficiaryId:Number(document.getElementById('wfBeneficiary').value),originId:Number(document.getElementById('wfOrigin').value),destinationId:Number(document.getElementById('wfDestination').value),date:wfPickers?.date.getValue(),time:t?`${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`:'',needs:document.getElementById('wfNeeds').value.trim()};
 if(id){b.version=workflowData.items.find(r=>r.id===id)?.version;b.reason=document.getElementById('wfReason').value.trim()}
 await wfPost(id?'workflow/requests/'+id+'/'+action:'workflow/requests',b);
}
function wfOpenAction(id,action){
 const r=workflowData?.items.find(r=>r.id===id);if(!r||!r.actions.includes(action)||!Object.hasOwn(WF_ACTION,action))return;
 if(['edit','resubmit'].includes(action)){wfOpenRequest(id,action);return}
 let body=`<p class="full"><strong>پروندهٔ ${faNum(id)}</strong> — ${esc(r.origin)} ← ${esc(r.destination)}<br>بهره‌بردار: ${esc(r.beneficiary)} · ${esc(formatRouteDate(r.date))} ${esc(r.time)}</p>`;
 if(action==='unit_approve'||action==='fleet_approve')body+='<p class="full">این تأیید مربوط به نسخهٔ فعلی اطلاعات است؛ تغییر اطلاعات اصلی به بررسی دوباره نیاز دارد.</p>';
 if(action==='fleet_approve')body+=`<div class="form-group full"><label for="wfOwnership">مسیر تخصیص</label><select id="wfOwnership">${workflowData.settings.org?'<option value="org">دولتی</option>':''}${workflowData.settings.contractor?'<option value="contractor">پیمان‌کار</option>':''}</select></div>`;
 if(action==='dispatch')body+=`<div class="form-group full"><label for="wfVehicle">خودرو (${r.ownership==='org'?'دولتی':'پیمان‌کار'})</label><select id="wfVehicle" required onchange="wfDrivers()">${wfOptions(workflowData.vehicles.filter(v=>v.ownership===r.ownership&&v.status==='ok'),null,v=>v.name+' — '+v.plate)}</select></div><div class="form-group full"><label for="wfDriver">رانندهٔ فعال مرتبط با خودرو</label><select id="wfDriver" required></select></div><p class="full">ظرفیت و شیفت خودرو و نبود مأموریت متعارض راننده هنگام ثبت دوباره بررسی می‌شوند.</p>`;
 if(['return','reject','dispatch_return','cancel'].includes(action))body+=wfReason();
 if(action==='reject')body+='<p class="full">رد نهایی پرونده را می‌بندد؛ برای اقدام دوباره باید درخواست جدیدی ثبت شود.</p>';
 wfModal(WF_ACTION[action],body,`wfSaveAction(${id},'${action}')`,WF_ACTION[action]);if(action==='dispatch')wfDrivers();
}
function wfDrivers(){const id=Number(document.getElementById('wfVehicle').value);document.getElementById('wfDriver').innerHTML=wfOptions(workflowData.drivers.filter(d=>d.vehicleId===id),null)}
async function wfSaveAction(id,action){
 const r=workflowData?.items.find(r=>r.id===id);if(!r)return;const b={version:r.version};
 if(action==='fleet_approve')b.ownership=document.getElementById('wfOwnership').value;
 if(action==='dispatch'){b.vehicleId=Number(document.getElementById('wfVehicle').value);b.driverIds=[Number(document.getElementById('wfDriver').value)]}
 if(document.getElementById('wfReason'))b.reason=document.getElementById('wfReason').value.trim();
 await wfPost('workflow/requests/'+id+'/'+action,b);
}
function wfOpenSettings(){
 const d=workflowData;if(!d?.canSections)return;
 wfModal('فعال‌سازی گردش و بخش‌های ناوگان',`<p class="full">ابتدا مجوزهای ثبت، تأیید واحد، تأیید ناوگان و تخصیص را تعریف کنید. پس از فعال‌سازی، ثبت مستقیمِ بدون تأیید در بخش قدیمی بسته می‌شود. تاریخچهٔ قبلی حفظ می‌شود.</p><label class="checkbox-row full"><input id="wfEnabled" type="checkbox" ${d.settings.enabled?'checked':''}>گردش تأیید فعال باشد</label><label class="checkbox-row full"><input id="wfOrg" type="checkbox" ${d.settings.org?'checked':''}>بخش خودروهای دولتی فعال باشد</label><label class="checkbox-row full"><input id="wfContractor" type="checkbox" ${d.settings.contractor?'checked':''}>بخش پیمان‌کار فعال باشد</label><p class="full">بخش دارای مأموریت باز یا پروندهٔ منتظر تخصیص غیرفعال نمی‌شود. فعال‌سازی مجدد با مجوز و ثبت دلیل امکان‌پذیر است.</p>${wfReason()}`,'wfSaveSettings()','ذخیرهٔ تنظیمات');
}
async function wfSaveSettings(){await wfPost('workflow/settings',{version:workflowData.settings.version,enabled:document.getElementById('wfEnabled').checked,org:document.getElementById('wfOrg').checked,contractor:document.getElementById('wfContractor').checked,reason:document.getElementById('wfReason').value.trim()})}
function wfOpenGrant(id=null){
 const d=workflowData;if(!d?.canGrants)return;const g=id?d.grants.find(x=>x.id===id):null;if(id&&!g)return;
 const caps=d.isSystemAdmin?Object.keys(WF_CAP):['workflow.unit_approve'];
 const people=g&&!d.users.some(u=>u.id===g.userId)?[...d.users,{id:g.userId,name:g.userName,username:'حساب غیرفعال'}]:d.users;
 wfModal(g?'ویرایش مجوز گردش':'تعریف مجوز گردش',`<p class="full">این فرم مجوز ایجاد می‌کند؛ عنوان شغلی به‌تنهایی کافی نیست. برای تأیید درخواست مدیر، فردِ بالادست یا هم‌ردهٔ مستقل را با مسئولیت خود تعیین کنید؛ زیردست او انتخاب نشود.</p><div class="form-group full"><label for="wfGrantUser">شخص</label><select id="wfGrantUser" ${g?'disabled':''}>${wfOptions(people,g?.userId,u=>u.name+' — '+u.username)}</select></div><div class="form-group full"><label for="wfGrantCap">مجوز</label><select id="wfGrantCap" ${g?'disabled':''}>${caps.map(c=>`<option value="${c}" ${g?.capability===c?'selected':''}>${esc(WF_CAP[c])}</option>`).join('')}</select></div><div class="form-group full"><label for="wfGrantUnit">واحدِ محدوده</label><select id="wfGrantUnit" ${g?'disabled':''}>${wfOptions(d.units.filter(u=>d.configUnits.includes(u.id)),g?.unitId,u=>u.path||u.name)}</select></div><label class="checkbox-row full"><input id="wfGrantDesc" type="checkbox" ${g?.includeDescendants?'checked':''}>زیرواحدها نیز در محدوده باشند (مجوز گسترده‌تر)</label><div class="form-group full"><label for="wfGrantRelation">صلاحیت تأیید درخواست مدیر در این محدوده</label><select id="wfGrantRelation"><option value="ordinary">فقط درخواست‌های عادی؛ نه درخواست مدیر</option><option value="superior" ${g?.relationship==='superior'?'selected':''}>بالادستِ مجاز</option><option value="independent_peer" ${g?.relationship==='independent_peer'?'selected':''}>هم‌ردهٔ مستقلِ مجاز</option></select></div><label class="checkbox-row full"><input id="wfGrantActive" type="checkbox" ${!g||g.active?'checked':''}>مجوز فعال باشد</label>${wfReason()}` ,`wfSaveGrant(${id||'null'})`,'ذخیرهٔ مجوز');
}
async function wfSaveGrant(id){
 const b={userId:Number(document.getElementById('wfGrantUser').value),unitId:Number(document.getElementById('wfGrantUnit').value),capability:document.getElementById('wfGrantCap').value,includeDescendants:document.getElementById('wfGrantDesc').checked,relationship:document.getElementById('wfGrantRelation').value,active:document.getElementById('wfGrantActive').checked,reason:document.getElementById('wfReason').value.trim()};
 if(id)b.version=workflowData.grants.find(g=>g.id===id)?.version;
 await wfPost('workflow/grants'+(id?'/'+id:''),b);
}
async function wfPost(path,b){
 if(wfBusy||serverBusy)return;const stamp=JSON.stringify([path,b]);
 if(wfOperation&&wfOperation.stamp!==stamp){showToast('warning','ابتدا نتیجهٔ ارسال قبلی را از فهرست بررسی کنید.');return}
 wfBusy=true;serverBusy=true;let committed=false;
 if(!wfOperation)wfOperation={stamp,key:crypto.randomUUID()};
 try{
  const result=await apiRequest(path,'POST',b,wfOperation.key);committed=true;wfOperation=null;closeModal();
  await refreshServerState();render();showToast('success',result.id?'ثبت شد؛ شمارهٔ پرونده / رکورد: '+faNum(result.id):'تنظیمات ثبت شد.');
 }catch(e){
  if(e.status){wfOperation=null;if(e.status===401)lockServerView();if(e.status===409)closeModal()}
  showToast(committed?'warning':'error',committed?'عملیات ثبت شد؛ نتیجه را با تازه‌سازی بررسی کنید.':e.message);
 }finally{wfBusy=false;serverBusy=false;await renderWorkflowPanel(true)}
}
function wfAcknowledgeOperation(){openLocalConfirm('بررسی نتیجهٔ ارسال','آیا فهرست و نتیجهٔ ارسال قبلی را بررسی کرده‌اید؟ این دکمه عملیاتی را روی سرور تکرار نمی‌کند.',()=>{wfOperation=null;closeModal();wfRender()})}
setInterval(()=>{if(!document.hidden&&currentTab==='workflow'&&currentUser&&!wfBusy)renderWorkflowPanel(true)},30000);
