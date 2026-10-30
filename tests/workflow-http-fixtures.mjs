// Strict SQL fixture: all placeholder counts checked, unrecognized SQL rejected.
export function workflowHttpFixture(){
 const state={user:{id:20,unit_id:1,role_code:'unit_manager',active:1,auth_version:3},settings:{enabled:1,org_enabled:1,contractor_enabled:0,version:1},grants:[],approvers:[],people:[{id:21,unit_id:1,active:1}],oldGrant:null,open:0,required:true,writes:[],queries:[]};
 const db={async execute(sql,a=[]){
  if((sql.match(/\?/g)||[]).length!==a.length)throw Error('BOUND_PARAMETER_MISMATCH '+sql);
  state.queries.push([sql,a]);
  if(sql.includes('SELECT id,unit_id,role_code,active,auth_version'))return [[state.user].filter(Boolean)];
  if(sql.includes('SELECT id,unit_id,role_code,active FROM users'))return [[state.user].filter(Boolean)];
  if(sql.startsWith('SELECT * FROM workflow_settings'))return [[state.settings]];
  if(sql.includes('SELECT id,name,parent_id,version,used_ever FROM units'))return [[{id:11,name:'والد',parent_id:null,version:1},{id:1,name:'واحد',parent_id:11,version:1},{id:7,name:'خارج محدوده',parent_id:null,version:1}]];
  if(sql.startsWith('SELECT * FROM workflow_grants WHERE user_id'))return [state.grants];
  if(sql.includes("g.capability='workflow.unit_approve' ORDER BY"))return [state.approvers];
  if(sql.startsWith('SELECT w.*'))return [[]];
  if(sql.startsWith('SELECT id,name,username,role_code role'))return [state.people.map(u=>({...u,unitId:u.unit_id}))];
  if(sql.startsWith('SELECT g.*,u.name userName'))return [[]];
  if(sql.startsWith('SELECT id,name FROM centers'))return [[{id:1,name:'مبدأ'},{id:2,name:'مقصد'}]];
  if(sql.startsWith('SELECT id,name,plate,ownership,status FROM vehicles'))return [[]];
  if(sql.startsWith('SELECT COUNT(*) n'))return [[{n:state.open}]];
  if(sql.startsWith('SELECT g.id FROM workflow_grants'))return [state.required?[{id:1}]:[]];
  if(sql.startsWith('SELECT id,unit_id,active FROM users'))return [state.people.filter(u=>u.id===a[0])];
  if(sql.startsWith('SELECT * FROM workflow_grants WHERE id'))return [state.oldGrant?[state.oldGrant]:[]];
  if(sql.startsWith('SELECT id FROM workflow_grants WHERE user_id'))return [[]];
  if(sql.startsWith('SELECT MAX(version)'))return [[{version:5}]];
  if(sql.startsWith('SELECT enabled FROM workflow_settings'))return [[state.settings]];
  if(sql.startsWith('SELECT id FROM workflow_grants WHERE unit_id')||sql.startsWith('SELECT id FROM workflow_requests WHERE unit_id')||sql.startsWith('SELECT id FROM workflow_requests WHERE transport_request_id'))return [state.open?[{id:1}]:[]];
  if(sql.startsWith('SET @behmasir_actor_id'))return [{}];
  if(/^(UPDATE|INSERT)/.test(sql)){state.writes.push([sql,a]);return [{insertId:55,affectedRows:1}]}
  throw Error('UNEXPECTED_SQL '+sql);
 }};return {state,db,session:{id:20,auth_version:3}};
}
