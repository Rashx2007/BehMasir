-- Workflow storage 005: TEST ONLY. No routes, accounts, grants or workflow activation.
-- DDL is not atomic; use guarded installer, never rerun after partial failure.

-- @statement
CREATE TABLE workflow_settings (
 id TINYINT NOT NULL PRIMARY KEY,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 org_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 contractor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 edited_at DATETIME(3) NULL,
 CONSTRAINT ck_ws_id CHECK(id=1),
 CONSTRAINT ck_ws_flags CHECK(enabled IN(0,1) AND org_enabled IN(0,1) AND contractor_enabled IN(0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


-- @statement
CREATE TABLE workflow_grants (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 unit_id INT UNSIGNED NOT NULL,
 capability VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 include_descendants BOOLEAN NOT NULL DEFAULT FALSE,
 relationship VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'ordinary',
 active BOOLEAN NOT NULL DEFAULT TRUE,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 edited_at DATETIME(3) NULL,
 CONSTRAINT fk_wg_user FOREIGN KEY(user_id) REFERENCES users(id),
 CONSTRAINT fk_wg_unit FOREIGN KEY(unit_id) REFERENCES units(id),
 UNIQUE KEY uq_wg_user_unit_cap (user_id,unit_id,capability),
 CONSTRAINT ck_wg_cap CHECK(capability IN ('workflow.create','workflow.create_for_others','workflow.configure_approvers','workflow.unit_approve','workflow.fleet_approve','workflow.dispatch.org','workflow.dispatch.contractor','workflow.configure_sections')),
 CONSTRAINT ck_wg_relationship CHECK(relationship IN('ordinary','superior','independent_peer')),
 CONSTRAINT ck_wg_flags CHECK(active IN(0,1) AND include_descendants IN(0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


-- @statement
CREATE TABLE workflow_requests (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 creator_id INT UNSIGNED NOT NULL,
 beneficiary_id INT UNSIGNED NOT NULL,
 unit_id INT UNSIGNED NOT NULL,
 origin_id INT UNSIGNED NOT NULL,
 destination_id INT UNSIGNED NOT NULL,
 service_date DATE NOT NULL,
 service_time TIME NOT NULL,
 needs VARCHAR(500) NOT NULL,
 state VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 content_version INT UNSIGNED NOT NULL DEFAULT 1,
 unit_approval JSON NULL,
 fleet_approval JSON NULL,
 ownership VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
 transport_request_id INT UNSIGNED NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 edited_at DATETIME(3) NULL,
 CONSTRAINT fk_wr_creator_id FOREIGN KEY(creator_id) REFERENCES users(id),
 CONSTRAINT fk_wr_beneficiary_id FOREIGN KEY(beneficiary_id) REFERENCES users(id),
 CONSTRAINT fk_wr_unit_id FOREIGN KEY(unit_id) REFERENCES units(id),
 CONSTRAINT fk_wr_origin_id FOREIGN KEY(origin_id) REFERENCES centers(id),
 CONSTRAINT fk_wr_destination_id FOREIGN KEY(destination_id) REFERENCES centers(id),
 CONSTRAINT fk_wr_transport_request_id FOREIGN KEY(transport_request_id) REFERENCES transport_requests(id),
 UNIQUE KEY uq_wr_transport (transport_request_id),
 KEY ix_wr_queue (unit_id,state,id),
 KEY ix_wr_creator (creator_id,id),
 KEY ix_wr_beneficiary (beneficiary_id,id),
 CONSTRAINT ck_wr_route CHECK(origin_id<>destination_id),
 CONSTRAINT ck_wr_state CHECK(state IN('awaiting_approver','awaiting_unit','awaiting_fleet','awaiting_dispatch','returned','rejected','cancelled','scheduled','enroute','delivered')),
 CONSTRAINT ck_wr_owner CHECK(ownership IS NULL OR ownership IN('org','contractor')),
 CONSTRAINT ck_wr_content_version CHECK(content_version>=1),
 CONSTRAINT ck_wr_operational CHECK ((state IN('scheduled','enroute','delivered') AND transport_request_id IS NOT NULL AND ownership IS NOT NULL AND unit_approval IS NOT NULL AND fleet_approval IS NOT NULL) OR (state NOT IN('scheduled','enroute','delivered') AND transport_request_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


-- @statement
CREATE TRIGGER `bh5_ws_bi` BEFORE INSERT ON `workflow_settings` FOR EACH ROW
BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END


-- @statement
CREATE TRIGGER `bh5_ws_bu` BEFORE UPDATE ON `workflow_settings` FOR EACH ROW
BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`enabled` <=> NEW.`enabled`) AND (OLD.`org_enabled` <=> NEW.`org_enabled`) AND (OLD.`contractor_enabled` <=> NEW.`contractor_enabled`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END


-- @statement
CREATE TRIGGER `bh5_ws_bd` BEFORE DELETE ON `workflow_settings` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END


-- @statement
CREATE TRIGGER `bh5_ws_ai` AFTER INSERT ON `workflow_settings` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.ws_create','workflow_settings',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'enabled',NEW.`enabled`,'org_enabled',NEW.`org_enabled`,'contractor_enabled',NEW.`contractor_enabled`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END


-- @statement
CREATE TRIGGER `bh5_ws_au` AFTER UPDATE ON `workflow_settings` FOR EACH ROW
BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.ws_update','workflow_settings',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'enabled',OLD.`enabled`,'org_enabled',OLD.`org_enabled`,'contractor_enabled',OLD.`contractor_enabled`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'enabled',NEW.`enabled`,'org_enabled',NEW.`org_enabled`,'contractor_enabled',NEW.`contractor_enabled`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END


-- @statement
CREATE TRIGGER `bh5_wg_bi` BEFORE INSERT ON `workflow_grants` FOR EACH ROW
BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END


-- @statement
CREATE TRIGGER `bh5_wg_bu` BEFORE UPDATE ON `workflow_grants` FOR EACH ROW
BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`) AND (OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`capability` <=> NEW.`capability`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`include_descendants` <=> NEW.`include_descendants`) AND (OLD.`relationship` <=> NEW.`relationship`) AND (OLD.`active` <=> NEW.`active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END


-- @statement
CREATE TRIGGER `bh5_wg_bd` BEFORE DELETE ON `workflow_grants` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END


-- @statement
CREATE TRIGGER `bh5_wg_ai` AFTER INSERT ON `workflow_grants` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wg_create','workflow_grants',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'unit_id',NEW.`unit_id`,'capability',NEW.`capability`,'include_descendants',NEW.`include_descendants`,'relationship',NEW.`relationship`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END


-- @statement
CREATE TRIGGER `bh5_wg_au` AFTER UPDATE ON `workflow_grants` FOR EACH ROW
BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wg_update','workflow_grants',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'user_id',OLD.`user_id`,'unit_id',OLD.`unit_id`,'capability',OLD.`capability`,'include_descendants',OLD.`include_descendants`,'relationship',OLD.`relationship`,'active',OLD.`active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'unit_id',NEW.`unit_id`,'capability',NEW.`capability`,'include_descendants',NEW.`include_descendants`,'relationship',NEW.`relationship`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END


-- @statement
CREATE TRIGGER `bh5_wr_bi` BEFORE INSERT ON `workflow_requests` FOR EACH ROW
BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END


-- @statement
CREATE TRIGGER `bh5_wr_bu` BEFORE UPDATE ON `workflow_requests` FOR EACH ROW
BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`) AND (OLD.`creator_id` <=> NEW.`creator_id`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`beneficiary_id` <=> NEW.`beneficiary_id`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`origin_id` <=> NEW.`origin_id`) AND (OLD.`destination_id` <=> NEW.`destination_id`) AND (OLD.`service_date` <=> NEW.`service_date`) AND (OLD.`service_time` <=> NEW.`service_time`) AND (OLD.`needs` <=> NEW.`needs`) AND (OLD.`state` <=> NEW.`state`) AND (OLD.`content_version` <=> NEW.`content_version`) AND (OLD.`unit_approval` <=> NEW.`unit_approval`) AND (OLD.`fleet_approval` <=> NEW.`fleet_approval`) AND (OLD.`ownership` <=> NEW.`ownership`) AND (OLD.`transport_request_id` <=> NEW.`transport_request_id`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END


-- @statement
CREATE TRIGGER `bh5_wr_bd` BEFORE DELETE ON `workflow_requests` FOR EACH ROW
BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END


-- @statement
CREATE TRIGGER `bh5_wr_ai` AFTER INSERT ON `workflow_requests` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wr_create','workflow_requests',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'creator_id',NEW.`creator_id`,'beneficiary_id',NEW.`beneficiary_id`,'unit_id',NEW.`unit_id`,'origin_id',NEW.`origin_id`,'destination_id',NEW.`destination_id`,'service_date',NEW.`service_date`,'service_time',NEW.`service_time`,'needs',NEW.`needs`,'state',NEW.`state`,'content_version',NEW.`content_version`,'unit_approval',NEW.`unit_approval`,'fleet_approval',NEW.`fleet_approval`,'ownership',NEW.`ownership`,'transport_request_id',NEW.`transport_request_id`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END


-- @statement
CREATE TRIGGER `bh5_wr_au` AFTER UPDATE ON `workflow_requests` FOR EACH ROW
BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wr_update','workflow_requests',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'creator_id',OLD.`creator_id`,'beneficiary_id',OLD.`beneficiary_id`,'unit_id',OLD.`unit_id`,'origin_id',OLD.`origin_id`,'destination_id',OLD.`destination_id`,'service_date',OLD.`service_date`,'service_time',OLD.`service_time`,'needs',OLD.`needs`,'state',OLD.`state`,'content_version',OLD.`content_version`,'unit_approval',OLD.`unit_approval`,'fleet_approval',OLD.`fleet_approval`,'ownership',OLD.`ownership`,'transport_request_id',OLD.`transport_request_id`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'creator_id',NEW.`creator_id`,'beneficiary_id',NEW.`beneficiary_id`,'unit_id',NEW.`unit_id`,'origin_id',NEW.`origin_id`,'destination_id',NEW.`destination_id`,'service_date',NEW.`service_date`,'service_time',NEW.`service_time`,'needs',NEW.`needs`,'state',NEW.`state`,'content_version',NEW.`content_version`,'unit_approval',NEW.`unit_approval`,'fleet_approval',NEW.`fleet_approval`,'ownership',NEW.`ownership`,'transport_request_id',NEW.`transport_request_id`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END
