import {createHash} from 'node:crypto';
export const WORKFLOW_TABLES = Object.freeze(['workflow_settings','workflow_grants','workflow_requests']);
export const WORKFLOW_TRIGGERS = Object.freeze(['ws','wg','wr'].flatMap(p=>['bi','bu','bd','ai','au'].map(s=>'bh5_'+p+'_'+s)));
export function workflowStatements(sql,spec) {
  // Normalize Windows line endings before validating the published SQL fingerprint.
  const normalized=sql.replace(/\r\n/g,'\n');
  if (spec.schema_version!==5 || createHash('sha256').update(normalized).digest('hex')!==spec.sql_sha256) throw Error('WORKFLOW_SQL_HASH_MISMATCH');
  const list=normalized.split(/\n-- @statement\n/).slice(1).map(x=>x.trim());
  if(list.length!==18||spec.statement_count!==18||WORKFLOW_TABLES.some((t,i)=>!list[i].startsWith('CREATE TABLE '+t+' ('))||JSON.stringify(list.slice(3).map(s=>s.match(/^CREATE TRIGGER `([^`]+)`/)?.[1]).sort())!==JSON.stringify([...WORKFLOW_TRIGGERS].sort())||JSON.stringify([...spec.triggers].sort())!==JSON.stringify([...WORKFLOW_TRIGGERS].sort()))throw Error('WORKFLOW_PLAN_MISMATCH');
  if(JSON.stringify(Object.keys(spec.tables).sort())!==JSON.stringify([...WORKFLOW_TABLES].sort()))throw Error('WORKFLOW_TABLE_SPEC_MISMATCH');
  return list;
}
export function requireFreshWorkflowState(versions,tables,triggers){
  if(versions.map(Number).join(',')!=='1,2,3,4')throw Error('EXPECTED_SCHEMA_1_2_3_4_ONLY');
  if(tables.length||triggers.length)throw Error('PREVIOUS_OR_PARTIAL_WORKFLOW_INSTALLATION');
}
export async function assertWorkflowSchema(db){
  const [vs]=await db.execute('SELECT MAX(version) version FROM schema_migrations');
  if(Number(vs[0]?.version)!==5)throw Error('WORKFLOW_SCHEMA_5_REQUIRED');
  await db.execute('SELECT id,enabled,org_enabled,contractor_enabled,version,created_at,edited_at FROM workflow_settings LIMIT 0');
  await db.execute('SELECT id,user_id,unit_id,capability,include_descendants,relationship,active,version,created_at,edited_at FROM workflow_grants LIMIT 0');
  await db.execute('SELECT id,creator_id,beneficiary_id,unit_id,origin_id,destination_id,service_date,service_time,needs,state,content_version,unit_approval,fleet_approval,ownership,transport_request_id,version,created_at,edited_at FROM workflow_requests LIMIT 0');
}
