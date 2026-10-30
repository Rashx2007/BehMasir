import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {workflowPredicate,workflowActions,workflowView,saveWorkflowSettings,saveWorkflowGrant,assertLegacyWorkflowGate,assertWorkflowUnitDeletion,assertWorkflowLegacyReassignment,workflowMutation} from '../backend/workflow-http.mjs';
import {assertScopedRoute} from '../backend/scoped-routes.mjs';
import {workflowHttpFixture} from './workflow-http-fixtures.mjs';
const denied=(f,status)=>assert.rejects(f,e=>e.status===status);
const cap=(f,c,unit=1,desc=0)=>f.state.grants.push({user_id:20,unit_id:unit,capability:c,include_descendants:desc,active:1});
const settings={version:1,enabled:true,org:true,contractor:false,reason:'آزمون تنظیم بخش'};
const grant={userId:21,unitId:1,capability:'workflow.unit_approve',includeDescendants:false,active:true,relationship:'ordinary',reason:'تعیین مسئول تأیید'};
test('workflow read defaults to own creator/beneficiary only, not role title',()=>{assert.deepEqual(workflowPredicate({actor:{id:20},grants:[]}),['(w.creator_id=? OR w.beneficiary_id=?)',[20,20]])});
test('dispatcher predicate is owner-bound; config does not grant record reads',()=>{const [sql,args]=workflowPredicate({actor:{id:20},grants:[{capability:'workflow.dispatch.org',unitIds:[1,3]},{capability:'workflow.configure_approvers',unitIds:[7]}]});assert(sql.includes('w.ownership=?'));assert.deepEqual(args,[20,20,1,3,'org']);assert(!args.includes(7))});
test('disabled read permits configuration and no actions',async()=>{const f=workflowHttpFixture();f.state.settings.enabled=0;f.state.user.role_code='admin';const d=await workflowView(f.db,f.session);assert(d.canGrants&&d.canSections);assert.deepEqual(d.items,[]);assert.deepEqual(workflowActions({}, {},false),[]);assert.equal(f.state.writes.length,0)});
test('nonadmin configurator list binds every unit placeholder and excludes global scope',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_approvers');const d=await workflowView(f.db,f.session);assert.deepEqual(d.configUnits,[1]);assert.deepEqual(d.units.map(u=>u.id),[1]);assert(d.canGrants);assert(!d.canSections);assert(f.state.queries.some(([s,a])=>s.includes('WHERE active=1 AND unit_id IN (?)')&&a[0]===1));assert(f.state.queries.some(([s,a])=>s.includes('WHERE g.unit_id IN (?)')&&a[0]===1))});
test('delegated beneficiary catalogue uses bound units and create grant does not configure',async()=>{const f=workflowHttpFixture();cap(f,'workflow.create');cap(f,'workflow.create_for_others');const d=await workflowView(f.db,f.session);assert.deepEqual(d.delegateUnits,[1]);assert.equal(d.centers.length,2);assert(!d.canGrants&&!d.canSections)});
for(const role of ['requester','dispatcher','unit_manager'])test('role '+role+' alone cannot configure settings or grants',async()=>{const f=workflowHttpFixture();f.state.user.role_code=role;await denied(()=>saveWorkflowSettings(f.db,f.session,settings),403);await denied(()=>saveWorkflowGrant(f.db,f.session,grant),403);assert.equal(f.state.writes.length,0)});
test('fresh auth invalidation prevents config read and writes',async()=>{const f=workflowHttpFixture();f.state.user.auth_version++;await denied(()=>workflowView(f.db,f.session),401);assert.equal(f.state.queries.length,1)});
test('admin config does not implicitly create approval/read grant',async()=>{const f=workflowHttpFixture();f.state.user.role_code='admin';const d=await workflowView(f.db,f.session);assert.deepEqual(d.permissions,[]);assert.deepEqual(d.createUnits,[]);const query=f.state.queries.find(([s])=>s.startsWith('SELECT w.*'));assert(query[0].includes('(w.creator_id=? OR w.beneficiary_id=?)'));assert.deepEqual(query[1],[20,20,4294967295])});
test('admin cannot assign own approval or configuration authority',async()=>{for(const capability of ['workflow.unit_approve','workflow.fleet_approve','workflow.configure_approvers','workflow.configure_sections']){const f=workflowHttpFixture();f.state.user.role_code='admin';await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,userId:20,capability}),403);assert.equal(f.state.writes.length,0)}});
test('configurator cannot grant other capabilities or widen beyond explicit scope',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_approvers');await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,capability:'workflow.fleet_approve'}),403);await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,unitId:11,includeDescendants:true}),403);await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,unitId:7}),403);assert.equal(f.state.writes.length,0)});
test('configurator cannot assign person outside authorized units',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_approvers');f.state.people[0].unit_id=7;await denied(()=>saveWorkflowGrant(f.db,f.session,grant),403)});
test('grant configuration records reason with bound SQL',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_approvers');const r=await saveWorkflowGrant(f.db,f.session,grant);assert.equal(r.id,55);assert(f.state.writes.some(([s,a])=>s.startsWith('INSERT INTO audit_log')&&a[4].includes(grant.reason)))});
test('inactive grant target may be revoked but not activated',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_approvers');f.state.people[0].active=0;f.state.oldGrant={id:55,user_id:21,unit_id:1,capability:grant.capability,version:1};await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,version:1},55),422);await saveWorkflowGrant(f.db,f.session,{...grant,version:1,active:false},55);assert(f.state.writes.some(([s])=>s.startsWith('UPDATE workflow_grants')))});
test('CAS and immutable grant identity are enforced',async()=>{const f=workflowHttpFixture();f.state.user.role_code='admin';f.state.oldGrant={user_id:21,unit_id:1,capability:grant.capability,version:2};await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,version:1},55),409);await denied(()=>saveWorkflowGrant(f.db,f.session,{...grant,userId:22,version:2},55),422);assert.equal(f.state.writes.length,0)});
test('settings version, required grants, section availability and open missions guarded',async()=>{const f=workflowHttpFixture();f.state.user.role_code='admin';await denied(()=>saveWorkflowSettings(f.db,f.session,{...settings,version:2}),409);await denied(()=>saveWorkflowSettings(f.db,f.session,{...settings,org:false}),422);f.state.required=false;await denied(()=>saveWorkflowSettings(f.db,f.session,settings),409);f.state.required=true;f.state.open=1;await denied(()=>saveWorkflowSettings(f.db,f.session,{...settings,org:false,contractor:true}),409);await denied(()=>saveWorkflowSettings(f.db,f.session,{...settings,enabled:false}),409);assert.equal(f.state.writes.length,0)});
test('explicit section config can update settings with reason; cannot configure grants',async()=>{const f=workflowHttpFixture();cap(f,'workflow.configure_sections');await saveWorkflowSettings(f.db,f.session,settings);assert(f.state.writes.some(([s])=>s.startsWith('UPDATE workflow_settings')));await denied(()=>saveWorkflowGrant(f.db,f.session,grant),403)});
test('enabled workflow blocks legacy direct create and protects units with history',async()=>{const f=workflowHttpFixture();await denied(()=>assertLegacyWorkflowGate(f.db),409);f.state.settings.enabled=0;await assertLegacyWorkflowGate(f.db);f.state.open=1;await denied(()=>assertWorkflowUnitDeletion(f.db,1),409)});
test('scoped role routes are exact and still deny legacy writes',()=>{const u={role_code:'unit_manager'};for(const [m,p] of [['GET','workflow'],['POST','workflow/requests'],['POST','workflow/requests/1/unit_approve']])assert.doesNotThrow(()=>assertScopedRoute(u,m,p));for(const [m,p] of [['POST','requests'],['POST','workflow/requests/1/anything'],['DELETE','workflow/grants/1'],['GET','workflow/secrets']])assert.throws(()=>assertScopedRoute(u,m,p),e=>e.status===403)});
test('unknown workflow mutation path fails closed',async()=>{const f=workflowHttpFixture();await denied(()=>workflowMutation(f.db,f.session,'workflow/unknown',{},'x'),404);assert.equal(f.state.queries.length,0)});
test('HTTP wiring is behind fresh session, CSRF and transaction boundaries',async()=>{const s=await readFile(new URL('../backend/server.mjs',import.meta.url),'utf8');assert(s.includes('csrf(req, s)'));assert(s.includes('workflowMutation(db'));assert(s.includes('readSnapshot(pool'));assert(s.includes('assertWorkflowSchema'));const ui=await readFile(new URL('../public/workflow.js',import.meta.url),'utf8');assert(!ui.includes('getValue()?.slice'));assert(ui.includes('String(t.h).padStart'));assert(!ui.includes('class="section-guide guide-banner"'));assert(ui.includes('esc(r.needs)'));assert(ui.includes('wfOperation.key'))});

test('approval-linked mission refuses legacy reassignment and redirects to audited crisis flow',async()=>{const f=workflowHttpFixture();f.state.open=1;await denied(()=>assertWorkflowLegacyReassignment(f.db,55),409);f.state.open=0;await assertWorkflowLegacyReassignment(f.db,55)});

// Verifiers are CLI entry points and cannot be imported (that would contact MySQL).
// Parse-check them explicitly so a syntax failure cannot evade service unit tests.
test('standalone workflow MySQL verifier parses without executing or connecting',async()=>{
 const {execFile}=await import('node:child_process');
 const {promisify}=await import('node:util');
 const {fileURLToPath}=await import('node:url');
 await promisify(execFile)(process.execPath,['--check',fileURLToPath(new URL('../backend/verify-workflow-http.mjs',import.meta.url))]);
});

test('workflow form keeps date/time interactive for shared picker click handlers',async()=>{
 const s=await readFile(new URL('../public/workflow.js',import.meta.url),'utf8');
 for(const id of ['wfDate','wfTime']){
  const tag=s.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>'))?.[0];
  assert(tag,'workflow picker input exists');
  assert(!/\b(?:readonly|disabled)\b/i.test(tag),'shared pickers refuse readonly or disabled inputs');
  assert(/inputmode="numeric"/.test(tag));
 }
 assert(s.includes("date:Pickers.createDatePicker({input:document.getElementById('wfDate')"));
 assert(s.includes("time:Pickers.createTimePicker({input:document.getElementById('wfTime')"));
});

test('select popup styling is progressive, preserves native semantics and modal Escape ordering',async()=>{
 const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
 assert(css.includes('@supports (appearance: base-select)'));
 assert(css.includes('select:not([multiple]):not([size])::picker(select)'));
 assert(css.includes('border-radius: 14px'));
 assert(css.includes('@media (forced-colors: active)'));
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const start=app.indexOf('const dialog = topDialog();');
 const select=app.indexOf('document.querySelector("select:open")',start);
 const escape=app.indexOf('if (event.key === "Escape")',start);
 assert(start>=0&&select>start&&select<escape);
});
