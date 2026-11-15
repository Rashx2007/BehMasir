import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const plan=JSON.parse(readFileSync(resolve(root,'clean-plan.json'),'utf8'));
const out=[];
out.push('USE `behmasir`;');
out.push('SET NAMES utf8mb4;');
out.push("SET time_zone='+00:00';");
out.push("SET @behmasir_actor_id=NULL;");
let n=0;
// All missing columns are already present; audit_log.entity_id is already VARCHAR(128), roles.created_at already has CURRENT_TIMESTAMP(3).

out.push("INSERT IGNORE INTO vehicle_types (code,title) VALUES ('sedan','سواری سدان'),('pickup_single','وانت تک‌کابین'),('pickup_double','وانت دوکابین'),('van','ون'),('minibus','مینی‌بوس'),('truck','کامیونت/کامیون');");
out.push("UPDATE vehicles AS v JOIN vehicle_types AS t ON t.code=v.body_type SET v.vehicle_type_id=t.id WHERE v.vehicle_type_id IS NULL;");
n+=2;
out.push("INSERT IGNORE INTO roles(code,title) VALUES ('unit_manager','مدیر واحد');");
out.push("INSERT IGNORE INTO access_permissions(code,title) VALUES ('requests.read','مشاهده درخواست‌های محدودهٔ مجاز');");
out.push("INSERT IGNORE INTO access_permissions(code,title) VALUES ('reports.read','مشاهده گزارش‌های محدودهٔ مجاز');");
out.push("INSERT IGNORE INTO access_role_permissions(role_code,permission_code) VALUES ('unit_manager','requests.read'),('unit_manager','reports.read');");
out.push("INSERT IGNORE INTO workflow_settings(id,enabled,org_enabled,contractor_enabled) VALUES (1,0,0,0);");
// Fix mojibake titles left by earlier mis-encoded applies (safe: these triggers only forbid PK/created_at changes).
out.push("UPDATE vehicle_types SET title=CASE code WHEN 'sedan' THEN 'سواری سدان' WHEN 'pickup_single' THEN 'وانت تک‌کابین' WHEN 'pickup_double' THEN 'وانت دوکابین' WHEN 'van' THEN 'ون' WHEN 'minibus' THEN 'مینی‌بوس' WHEN 'truck' THEN 'کامیونت/کامیون' ELSE title END;");
out.push("UPDATE roles SET title='مدیر واحد' WHERE code='unit_manager';");
out.push("UPDATE access_permissions SET title='مشاهده درخواست‌های محدودهٔ مجاز' WHERE code='requests.read';");
out.push("UPDATE access_permissions SET title='مشاهده گزارش‌های محدودهٔ مجاز' WHERE code='reports.read';");
n+=9;
for(const s of plan.statements){
 if(s.startsWith('CREATE TRIGGER')){
  const tm=s.match(/CREATE TRIGGER\s+`([^`]+)`/);
  const name=tm?tm[1]:null;
  if(!name){continue}
  out.push(`DROP TRIGGER IF EXISTS \`${name}\`;`);
  out.push('DELIMITER $$');out.push(s+'$$');out.push('DELIMITER ;');
  n++;
 }
}
out.push("INSERT INTO schema_migrations(version) VALUES (2),(3),(4),(5) ON DUPLICATE KEY UPDATE version=version;");
out.push("INSERT INTO app_meta(id,revision) VALUES (1,revision+1) ON DUPLICATE KEY UPDATE revision=revision+1;");
out.push("INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (NULL,'upgrade.pilot_baseline','app',NULL,JSON_OBJECT('schema_version',5,'baseline','2f064c0','from_version',1)) ON DUPLICATE KEY UPDATE actor_id=actor_id;");
out.push("SELECT VERSION() version, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='behmasir') tables, (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='behmasir') triggers, (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA='behmasir' AND CONSTRAINT_TYPE='FOREIGN KEY') fks;");
writeFileSync('C:/Users/rashx/AppData/Local/Temp/kilo/upgrade-behmasir.sql', out.join('\n\n'));
console.log('statements',n);