import {createHash} from 'node:crypto';
export const TARGET='behmasir_pilot';
export const APP_USER='behmasir_pilot_app';
export function validatePilotInput(x) {
 if(!x || typeof x.rootPassword!=='string' || !x.rootPassword || typeof x.adminPassword!=='string' ||
 x.adminPassword.length<16 || x.adminPassword.length>128 || /[\r\n\0]/.test(x.adminPassword) ||
 !/[A-Za-z]/.test(x.adminPassword) || !/[0-9]/.test(x.adminPassword) || x.rootPassword===x.adminPassword)
 throw Error('INVALID_OR_REUSED_ADMIN_PASSWORD');
 if(x.confirm!=='CREATE_BEHMASIR_PILOT') throw Error('EXPLICIT_CONFIRMATION_REQUIRED');
}
export function validateCleanPlan(plan,expectedHash,raw) {
 if(createHash('sha256').update(raw).digest('hex')!==expectedHash)throw Error('CLEAN_PLAN_HASH_MISMATCH');
 if(plan.format!==1 || plan.schema!==5 || plan.target!==TARGET || plan.baseline!=='2f064c0' || plan.tables.length!==23 ||
 new Set(plan.tables).size!==23 || plan.triggers.length!==71 || plan.foreignKeys!==32)
 throw Error('CLEAN_PLAN_SHAPE_MISMATCH');
 for(const sql of plan.statements)if(!/^(CREATE TABLE |CREATE TRIGGER |ALTER TABLE )/.test(sql) || /(?:^|\n)\s*(?:USE\b|DROP\s+DATABASE\b|CREATE\s+DATABASE\b|GRANT\b|REVOKE\b)/i.test(sql))throw Error('CLEAN_PLAN_STATEMENT_REJECTED');
}
export function requireFreshTarget(databases,accounts) {
 if(databases.some(x=>(x.name??x.SCHEMA_NAME)===TARGET))throw Error('TARGET_DATABASE_ALREADY_EXISTS');
 if(accounts.length)throw Error('TARGET_ACCOUNT_ALREADY_EXISTS');
}
