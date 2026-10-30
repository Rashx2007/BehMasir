import test from 'node:test';import assert from 'node:assert/strict';import net from 'node:net';import {fork} from 'node:child_process';
function message(c,type){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>done(Error('fixture timeout')),10000);const on=m=>{if(m.type===type)done()};const exit=()=>done(Error('fixture exited'));function done(e){clearTimeout(timer);c.off('message',on);c.off('exit',exit);e?reject(e):resolve()}c.on('message',on);c.once('exit',exit)})}
test('real HTTP workflow routing: auth, origin, CSRF, read isolation, independent config (mock DB/session)',{timeout:20000},async t=>{
 const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
 const c=fork(new URL('./workflow-live-http-worker.mjs',import.meta.url),[],{execArgv:[],env:{...process.env,PORT:String(port),APP_ORIGIN:'https://localhost:8444',SESSION_COOKIE_NAME:'__Host-workflow-fixture'},stdio:['ignore','pipe','pipe','ipc']});let out='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>out+=b);t.after(()=>c.kill());await message(c,'ready');
 const call=async(path,method='GET',headers={},body={})=>{const r=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method,headers:{cookie:'__Host-workflow-fixture='+'b'.repeat(64),...headers},...(method==='GET'?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json(),headers:r.headers}};
 const safe={'content-type':'application/json',origin:'https://localhost:8444','x-csrf-token':'a'.repeat(64)};
 let r=await call('health');assert.equal(r.status,200,out);assert.equal(r.data.workflowVersion,1);
 r=await call('workflow');assert.equal(r.status,200,out);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.data.settings.enabled,false);assert.deepEqual(r.data.items,[]);assert.equal(r.data.canGrants,false);assert(!JSON.stringify(r.data).includes('password_hash'));
 assert.equal((await call('workflow/settings','POST')).status,403);
 assert.equal((await call('workflow/settings','POST',{...safe,origin:'https://evil.invalid'})).status,403);
 assert.equal((await call('workflow/settings','POST',{...safe,'x-csrf-token':'bad'})).status,403);
 assert.equal((await call('workflow/settings','POST',safe,{version:1})).status,403);
 assert.equal((await call('workflow/requests','POST',safe,{beneficiaryId:20})).status,409);
 assert.equal((await call('workflow/requests/1/anything','POST',safe)).status,403);
 assert.equal((await call('workflow/grants/1','DELETE',safe)).status,403);
 let wait=message(c,'patched');c.send({type:'patch',admin:true});await wait;
 r=await call('workflow');assert.equal(r.status,200);assert(r.data.canGrants&&r.data.canSections);assert.deepEqual(r.data.permissions,[]);
 assert.equal((await call('workflow/unknown','POST',safe)).status,404);
 assert.equal((await call('workflow/grants','POST',safe,{userId:20,unitId:1,capability:'workflow.unit_approve',includeDescendants:false,active:true,relationship:'ordinary',reason:'آزمون خودتأییدی ممنوع'})).status,403);
 assert.equal((await call('workflow/settings','PUT',safe)).status,405);
 wait=message(c,'patched');c.send({type:'patch',expired:true});await wait;
 assert.equal((await call('workflow')).status,401);
});
