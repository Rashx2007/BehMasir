-- BehMasir access foundation 004. TEST ONLY; use the guarded installer.
-- No HTTP enforcement or persistent user assignments are enabled here.
-- MySQL 8.4; DDL is not atomic. NEVER rerun after a partial failure.

-- @statement
CREATE TABLE access_permissions (
 code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
 title VARCHAR(100) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), edited_at DATETIME(3) NULL,
 CONSTRAINT ck_ap_active CHECK (is_active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- @statement
CREATE TABLE access_role_permissions (
 role_code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
 permission_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(role_code,permission_code),
 CONSTRAINT fk_arp_role FOREIGN KEY(role_code) REFERENCES roles(code),
 CONSTRAINT fk_arp_permission FOREIGN KEY(permission_code) REFERENCES access_permissions(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- @statement
CREATE TABLE unit_role_assignments (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 role_code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
 unit_id INT UNSIGNED NOT NULL, include_descendants BOOLEAN NOT NULL DEFAULT TRUE,
 active BOOLEAN NOT NULL DEFAULT TRUE, version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), edited_at DATETIME(3) NULL,
 UNIQUE KEY uq_ura_user_role_unit(user_id,role_code,unit_id),
 KEY ix_ura_unit_active(unit_id,active),
 CONSTRAINT fk_ura_user FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT fk_ura_role FOREIGN KEY(role_code) REFERENCES roles(code),
 CONSTRAINT fk_ura_unit FOREIGN KEY(unit_id) REFERENCES units(id),
 CONSTRAINT ck_ura_flags CHECK (active IN (0,1) AND include_descendants IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci

-- @statement
CREATE TRIGGER `bh4_ap_bi` BEFORE INSERT ON `access_permissions` FOR EACH ROW
BEGIN
SET NEW.version=1;
SET NEW.edited_at=NULL;
END

-- @statement
CREATE TRIGGER `bh4_ap_bu` BEFORE UPDATE ON `access_permissions` FOR EACH ROW
BEGIN
IF NOT ((OLD.`code` <=> NEW.`code`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Access identity and creation time are immutable.';
END IF;
IF (OLD.`title` <=> NEW.`title`) AND (OLD.`is_active` <=> NEW.`is_active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at;
ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END

-- @statement
CREATE TRIGGER `bh4_ap_bd` BEFORE DELETE ON `access_permissions` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Physical delete blocked; deactivate access records instead.';
END

-- @statement
CREATE TRIGGER `bh4_ap_ai` AFTER INSERT ON `access_permissions` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.permission_create','access_permissions',NEW.code,
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('code',NEW.`code`,'title',NEW.`title`,'is_active',NEW.`is_active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END

-- @statement
CREATE TRIGGER `bh4_ap_au` AFTER UPDATE ON `access_permissions` FOR EACH ROW
BEGIN
IF NEW.version<>OLD.version THEN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.permission_update','access_permissions',NEW.code,
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',JSON_OBJECT('code',OLD.`code`,'title',OLD.`title`,'is_active',OLD.`is_active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('code',NEW.`code`,'title',NEW.`title`,'is_active',NEW.`is_active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END IF;
END

-- @statement
CREATE TRIGGER `bh4_ura_bi` BEFORE INSERT ON `unit_role_assignments` FOR EACH ROW
BEGIN
SET NEW.version=1;
SET NEW.edited_at=NULL;
END

-- @statement
CREATE TRIGGER `bh4_ura_bu` BEFORE UPDATE ON `unit_role_assignments` FOR EACH ROW
BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`role_code` <=> NEW.`role_code`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Access identity and creation time are immutable.';
END IF;
IF (OLD.`include_descendants` <=> NEW.`include_descendants`) AND (OLD.`active` <=> NEW.`active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at;
ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END

-- @statement
CREATE TRIGGER `bh4_ura_bd` BEFORE DELETE ON `unit_role_assignments` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Physical delete blocked; deactivate access records instead.';
END

-- @statement
CREATE TRIGGER `bh4_ura_ai` AFTER INSERT ON `unit_role_assignments` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.assignment_create','unit_role_assignments',CAST(NEW.id AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'role_code',NEW.`role_code`,'unit_id',NEW.`unit_id`,'include_descendants',NEW.`include_descendants`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END

-- @statement
CREATE TRIGGER `bh4_ura_au` AFTER UPDATE ON `unit_role_assignments` FOR EACH ROW
BEGIN
IF NEW.version<>OLD.version THEN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.assignment_update','unit_role_assignments',CAST(NEW.id AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'user_id',OLD.`user_id`,'role_code',OLD.`role_code`,'unit_id',OLD.`unit_id`,'include_descendants',OLD.`include_descendants`,'active',OLD.`active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'role_code',NEW.`role_code`,'unit_id',NEW.`unit_id`,'include_descendants',NEW.`include_descendants`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END IF;
END

-- @statement
CREATE TRIGGER `bh4_arp_bu` BEFORE UPDATE ON `access_role_permissions` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Role membership is immutable; remove and add with audit.';
END

-- @statement
CREATE TRIGGER `bh4_arp_ai` AFTER INSERT ON `access_role_permissions` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.role_grant','access_role_permissions',CONCAT(NEW.role_code,':',NEW.permission_code),
 JSON_OBJECT('access_format',1,'record_version',NULL,'before',NULL,'after',JSON_OBJECT('role_code',NEW.`role_code`,'permission_code',NEW.`permission_code`,'created_at',NEW.`created_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END

-- @statement
CREATE TRIGGER `bh4_arp_ad` AFTER DELETE ON `access_role_permissions` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.role_unlink','access_role_permissions',CONCAT(OLD.role_code,':',OLD.permission_code),
 JSON_OBJECT('access_format',1,'record_version',NULL,'before',JSON_OBJECT('role_code',OLD.`role_code`,'permission_code',OLD.`permission_code`,'created_at',OLD.`created_at`),'after',NULL,'db_account',USER(),'change_id',@behmasir_change_id));
END
