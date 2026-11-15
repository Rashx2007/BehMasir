import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const plan=JSON.parse(readFileSync(resolve(root,'pilot/clean-plan.json'),'utf8'));
const base=new Set(['schema_migrations','roles','app_meta','units','centers','vehicles','users','user_vehicles','user_preferences','sessions','login_limits','transport_requests','request_drivers','request_events','audit_log','idempotency_keys']);
const out=[];
out.push('USE `behmasir`;');
out.push("SET time_zone='+00:00';");
out.push("SET @behmasir_actor_id=NULL;");
let n=0;
for(const s of plan.statements){
 if(!/^(CREATE TABLE|CREATE TRIGGER|ALTER TABLE)/.test(s))continue;
 if(s.startsWith('CREATE TABLE')){
  const m=s.match(/CREATE TABLE\s+`?(\w+)`?\s*\(/i);
  const t=m?m[1]:null;
  if(t && !base.has(t)){out.push(s+';');n++}
  continue
 }
 const m=s.match(/ALTER TABLE `(\w+)`/);
 if(m && base.has(m[1])){out.push(s+';');n++}
}
out.push("INSERT INTO schema_migrations(version) VALUES (2),(3),(4),(5) ON DUPLICATE KEY UPDATE version=version;");
out.push("INSERT INTO app_meta(id,revision) VALUES (1,revision+1) ON DUPLICATE KEY UPDATE revision=revision+1;");
out.push("INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'upgrade.pilot_baseline','app',NULL,JSON_OBJECT('schema_version',5,'baseline','2f064c0','from_version',1));");
out.push("SELECT VERSION() version, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='behmasir') tables, (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='behmasir') triggers, (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='behmasir' AND CONSTRAINT_TYPE='FOREIGN KEY') fks;");
writeFileSync('C:/Users/rashx/AppData/Local/Temp/kilo/upgrade-behmasir.sql', out.join('\n\n'));
console.log('statements',n);