-- TEST ONLY: behmasir_upgrade_verify, MySQL 8.4, schema 2 -> 3.
-- Execute ONLY with backend/install-history.mjs via windows/install-history.ps1.
-- Each @statement block is sent separately; do NOT source this file with mysql/DBeaver.
-- DDL is not atomic. A partial failure requires inspection/rebuilding the TEST copy.
-- Unknown historical role creation dates stay NULL; no historical times are invented.
-- Future role inserts default created_at to the current session UTC time.
-- No restore endpoint, RBAC redesign, new soft-delete fields or auth-event logging yet.

-- @statement
ALTER TABLE roles ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1, ADD COLUMN created_at DATETIME(3) NULL DEFAULT NULL, ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE roles MODIFY COLUMN created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
-- @statement
ALTER TABLE units ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1, ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE users ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE centers ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE vehicles ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE transport_requests ADD COLUMN edited_at DATETIME(3) NULL
-- @statement
ALTER TABLE audit_log MODIFY COLUMN entity_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL
-- @statement
CREATE TRIGGER `bh3_users_bi` BEFORE INSERT ON `users` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_users_bu` BEFORE UPDATE ON `users` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`username` <=> NEW.`username`) AND (OLD.`name` <=> NEW.`name`) AND (OLD.`role_code` <=> NEW.`role_code`) AND (OLD.`password_hash` <=> NEW.`password_hash`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`active` <=> NEW.`active`) AND (OLD.`auth_version` <=> NEW.`auth_version`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_users_bd` BEFORE DELETE ON `users` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_users_ai` AFTER INSERT ON `users` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'users', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'username', NEW.`username`, 'name', NEW.`name`, 'role_code', NEW.`role_code`, 'unit_id', NEW.`unit_id`, 'active', NEW.`active`, 'auth_version', NEW.`auth_version`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_users_au` AFTER UPDATE ON `users` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'users', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'username', OLD.`username`, 'name', OLD.`name`, 'role_code', OLD.`role_code`, 'unit_id', OLD.`unit_id`, 'active', OLD.`active`, 'auth_version', OLD.`auth_version`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'username', NEW.`username`, 'name', NEW.`name`, 'role_code', NEW.`role_code`, 'unit_id', NEW.`unit_id`, 'active', NEW.`active`, 'auth_version', NEW.`auth_version`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', NOT (OLD.password_hash <=> NEW.password_hash),
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_units_bi` BEFORE INSERT ON `units` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_units_bu` BEFORE UPDATE ON `units` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`name` <=> NEW.`name`) AND (OLD.`used_ever` <=> NEW.`used_ever`) AND (OLD.`deleted_at` <=> NEW.`deleted_at`) AND (OLD.`parent_id` <=> NEW.`parent_id`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_units_bd` BEFORE DELETE ON `units` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_units_ai` AFTER INSERT ON `units` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'units', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'used_ever', NEW.`used_ever`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'parent_id', NEW.`parent_id`, 'version', NEW.`version`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_units_au` AFTER UPDATE ON `units` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'units', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'used_ever', OLD.`used_ever`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'parent_id', OLD.`parent_id`, 'version', OLD.`version`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'used_ever', NEW.`used_ever`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'parent_id', NEW.`parent_id`, 'version', NEW.`version`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_centers_bi` BEFORE INSERT ON `centers` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_centers_bu` BEFORE UPDATE ON `centers` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`name` <=> NEW.`name`) AND (OLD.`lat` <=> NEW.`lat`) AND (OLD.`lng` <=> NEW.`lng`) AND (OLD.`deleted_at` <=> NEW.`deleted_at`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_centers_bd` BEFORE DELETE ON `centers` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_centers_ai` AFTER INSERT ON `centers` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'centers', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'lat', NEW.`lat`, 'lng', NEW.`lng`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_centers_au` AFTER UPDATE ON `centers` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'centers', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'lat', OLD.`lat`, 'lng', OLD.`lng`, 'version', OLD.`version`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'lat', NEW.`lat`, 'lng', NEW.`lng`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_vehicles_bi` BEFORE INSERT ON `vehicles` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_vehicles_bu` BEFORE UPDATE ON `vehicles` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`name` <=> NEW.`name`) AND (OLD.`plate` <=> NEW.`plate`) AND (OLD.`plate_key` <=> NEW.`plate_key`) AND (OLD.`body_type` <=> NEW.`body_type`) AND (OLD.`service_type` <=> NEW.`service_type`) AND (OLD.`passenger_capacity` <=> NEW.`passenger_capacity`) AND (OLD.`cargo_capacity` <=> NEW.`cargo_capacity`) AND (OLD.`has_fridge` <=> NEW.`has_fridge`) AND (OLD.`fridge_capacity` <=> NEW.`fridge_capacity`) AND (OLD.`shift_start` <=> NEW.`shift_start`) AND (OLD.`shift_end` <=> NEW.`shift_end`) AND (OLD.`ownership` <=> NEW.`ownership`) AND (OLD.`contractor_name` <=> NEW.`contractor_name`) AND (OLD.`status` <=> NEW.`status`) AND (OLD.`deleted_at` <=> NEW.`deleted_at`) AND (OLD.`vehicle_type_id` <=> NEW.`vehicle_type_id`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_vehicles_bd` BEFORE DELETE ON `vehicles` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_vehicles_ai` AFTER INSERT ON `vehicles` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'vehicles', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'plate', NEW.`plate`, 'plate_key', NEW.`plate_key`, 'body_type', NEW.`body_type`, 'service_type', NEW.`service_type`, 'passenger_capacity', NEW.`passenger_capacity`, 'cargo_capacity', NEW.`cargo_capacity`, 'has_fridge', NEW.`has_fridge`, 'fridge_capacity', NEW.`fridge_capacity`, 'shift_start', NEW.`shift_start`, 'shift_end', NEW.`shift_end`, 'ownership', NEW.`ownership`, 'contractor_name', NEW.`contractor_name`, 'status', NEW.`status`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'vehicle_type_id', NEW.`vehicle_type_id`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_vehicles_au` AFTER UPDATE ON `vehicles` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'vehicles', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'plate', OLD.`plate`, 'plate_key', OLD.`plate_key`, 'body_type', OLD.`body_type`, 'service_type', OLD.`service_type`, 'passenger_capacity', OLD.`passenger_capacity`, 'cargo_capacity', OLD.`cargo_capacity`, 'has_fridge', OLD.`has_fridge`, 'fridge_capacity', OLD.`fridge_capacity`, 'shift_start', OLD.`shift_start`, 'shift_end', OLD.`shift_end`, 'ownership', OLD.`ownership`, 'contractor_name', OLD.`contractor_name`, 'status', OLD.`status`, 'version', OLD.`version`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'vehicle_type_id', OLD.`vehicle_type_id`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'plate', NEW.`plate`, 'plate_key', NEW.`plate_key`, 'body_type', NEW.`body_type`, 'service_type', NEW.`service_type`, 'passenger_capacity', NEW.`passenger_capacity`, 'cargo_capacity', NEW.`cargo_capacity`, 'has_fridge', NEW.`has_fridge`, 'fridge_capacity', NEW.`fridge_capacity`, 'shift_start', NEW.`shift_start`, 'shift_end', NEW.`shift_end`, 'ownership', NEW.`ownership`, 'contractor_name', NEW.`contractor_name`, 'status', NEW.`status`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'vehicle_type_id', NEW.`vehicle_type_id`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_vehicle_types_bi` BEFORE INSERT ON `vehicle_types` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_vehicle_types_bu` BEFORE UPDATE ON `vehicle_types` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`code` <=> NEW.`code`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`code` <=> NEW.`code`) AND (OLD.`title` <=> NEW.`title`) AND (OLD.`is_active` <=> NEW.`is_active`) AND (OLD.`deleted_at` <=> NEW.`deleted_at`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_vehicle_types_bd` BEFORE DELETE ON `vehicle_types` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_vehicle_types_ai` AFTER INSERT ON `vehicle_types` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'vehicle_types', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'title', NEW.`title`, 'is_active', NEW.`is_active`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`, 'deleted_at', NEW.`deleted_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_vehicle_types_au` AFTER UPDATE ON `vehicle_types` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'vehicle_types', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'code', OLD.`code`, 'title', OLD.`title`, 'is_active', OLD.`is_active`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`, 'deleted_at', OLD.`deleted_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'title', NEW.`title`, 'is_active', NEW.`is_active`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`, 'deleted_at', NEW.`deleted_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_roles_bi` BEFORE INSERT ON `roles` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_roles_bu` BEFORE UPDATE ON `roles` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`code` <=> NEW.`code`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`code` <=> NEW.`code`) AND (OLD.`title` <=> NEW.`title`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_roles_bd` BEFORE DELETE ON `roles` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_roles_ai` AFTER INSERT ON `roles` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'roles', CAST(NEW.`code` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('code', NEW.`code`, 'title', NEW.`title`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_roles_au` AFTER UPDATE ON `roles` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'roles', CAST(NEW.`code` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('code', OLD.`code`, 'title', OLD.`title`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('code', NEW.`code`, 'title', NEW.`title`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_transport_requests_bi` BEFORE INSERT ON `transport_requests` FOR EACH ROW
BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END
-- @statement
CREATE TRIGGER `bh3_transport_requests_bu` BEFORE UPDATE ON `transport_requests` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Primary keys, bridge type codes and creation times are immutable.';
  END IF;
  IF (OLD.`id` <=> NEW.`id`) AND (OLD.`requester_user_id` <=> NEW.`requester_user_id`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`vehicle_id` <=> NEW.`vehicle_id`) AND (OLD.`origin_id` <=> NEW.`origin_id`) AND (OLD.`destination_id` <=> NEW.`destination_id`) AND (OLD.`unit_name` <=> NEW.`unit_name`) AND (OLD.`origin_name` <=> NEW.`origin_name`) AND (OLD.`destination_name` <=> NEW.`destination_name`) AND (OLD.`vehicle_name` <=> NEW.`vehicle_name`) AND (OLD.`plate` <=> NEW.`plate`) AND (OLD.`service_date` <=> NEW.`service_date`) AND (OLD.`service_time` <=> NEW.`service_time`) AND (OLD.`status` <=> NEW.`status`) AND (OLD.`started_at` <=> NEW.`started_at`) AND (OLD.`delivered_at` <=> NEW.`delivered_at`) AND (OLD.`cancelled_at` <=> NEW.`cancelled_at`) THEN
    SET NEW.version = OLD.version;
    SET NEW.edited_at = OLD.edited_at;
  ELSE
    SET NEW.version = OLD.version + 1;
    SET NEW.edited_at = UTC_TIMESTAMP(3);
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_transport_requests_bd` BEFORE DELETE ON `transport_requests` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END
-- @statement
CREATE TRIGGER `bh3_transport_requests_ai` AFTER INSERT ON `transport_requests` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'transport_requests', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'requester_user_id', NEW.`requester_user_id`, 'unit_id', NEW.`unit_id`, 'vehicle_id', NEW.`vehicle_id`, 'origin_id', NEW.`origin_id`, 'destination_id', NEW.`destination_id`, 'unit_name', NEW.`unit_name`, 'origin_name', NEW.`origin_name`, 'destination_name', NEW.`destination_name`, 'vehicle_name', NEW.`vehicle_name`, 'plate', NEW.`plate`, 'service_date', NEW.`service_date`, 'service_time', NEW.`service_time`, 'status', NEW.`status`, 'version', NEW.`version`, 'started_at', NEW.`started_at`, 'delivered_at', NEW.`delivered_at`, 'cancelled_at', NEW.`cancelled_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_transport_requests_au` AFTER UPDATE ON `transport_requests` FOR EACH ROW
BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'transport_requests', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'requester_user_id', OLD.`requester_user_id`, 'unit_id', OLD.`unit_id`, 'vehicle_id', OLD.`vehicle_id`, 'origin_id', OLD.`origin_id`, 'destination_id', OLD.`destination_id`, 'unit_name', OLD.`unit_name`, 'origin_name', OLD.`origin_name`, 'destination_name', OLD.`destination_name`, 'vehicle_name', OLD.`vehicle_name`, 'plate', OLD.`plate`, 'service_date', OLD.`service_date`, 'service_time', OLD.`service_time`, 'status', OLD.`status`, 'version', OLD.`version`, 'started_at', OLD.`started_at`, 'delivered_at', OLD.`delivered_at`, 'cancelled_at', OLD.`cancelled_at`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'requester_user_id', NEW.`requester_user_id`, 'unit_id', NEW.`unit_id`, 'vehicle_id', NEW.`vehicle_id`, 'origin_id', NEW.`origin_id`, 'destination_id', NEW.`destination_id`, 'unit_name', NEW.`unit_name`, 'origin_name', NEW.`origin_name`, 'destination_name', NEW.`destination_name`, 'vehicle_name', NEW.`vehicle_name`, 'plate', NEW.`plate`, 'service_date', NEW.`service_date`, 'service_time', NEW.`service_time`, 'status', NEW.`status`, 'version', NEW.`version`, 'started_at', NEW.`started_at`, 'delivered_at', NEW.`delivered_at`, 'cancelled_at', NEW.`cancelled_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_user_vehicles_bu` BEFORE UPDATE ON `user_vehicles` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`vehicle_id` <=> NEW.`vehicle_id`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Relationship keys are immutable; use delete and insert.';
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_user_vehicles_ai` AFTER INSERT ON `user_vehicles` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'user_vehicles', CONCAT(NEW.`user_id`, ':', NEW.`vehicle_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', NULL, 'after', JSON_OBJECT('user_id', NEW.`user_id`, 'vehicle_id', NEW.`vehicle_id`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_user_vehicles_ad` AFTER DELETE ON `user_vehicles` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.unlink', 'user_vehicles', CONCAT(OLD.`user_id`, ':', OLD.`vehicle_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', JSON_OBJECT('user_id', OLD.`user_id`, 'vehicle_id', OLD.`vehicle_id`), 'after', NULL, 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_request_drivers_bu` BEFORE UPDATE ON `request_drivers` FOR EACH ROW
BEGIN
  IF NOT ((OLD.`request_id` <=> NEW.`request_id`) AND (OLD.`user_id` <=> NEW.`user_id`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Relationship keys are immutable; use delete and insert.';
  END IF;
END
-- @statement
CREATE TRIGGER `bh3_request_drivers_ai` AFTER INSERT ON `request_drivers` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'request_drivers', CONCAT(NEW.`request_id`, ':', NEW.`user_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', NULL, 'after', JSON_OBJECT('request_id', NEW.`request_id`, 'user_id', NEW.`user_id`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_request_drivers_ad` AFTER DELETE ON `request_drivers` FOR EACH ROW
BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.unlink', 'request_drivers', CONCAT(OLD.`request_id`, ':', OLD.`user_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', JSON_OBJECT('request_id', OLD.`request_id`, 'user_id', OLD.`user_id`), 'after', NULL, 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END
-- @statement
CREATE TRIGGER `bh3_audit_log_bu` BEFORE UPDATE ON `audit_log` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is append-only.';
END
-- @statement
CREATE TRIGGER `bh3_audit_log_bd` BEFORE DELETE ON `audit_log` FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is append-only.';
END
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'users', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'username', b.`username`, 'name', b.`name`, 'role_code', b.`role_code`, 'unit_id', b.`unit_id`, 'active', b.`active`, 'auth_version', b.`auth_version`, 'version', b.`version`, 'created_at', b.`created_at`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `users` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'units', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'name', b.`name`, 'used_ever', b.`used_ever`, 'deleted_at', b.`deleted_at`, 'created_at', b.`created_at`, 'parent_id', b.`parent_id`, 'version', b.`version`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `units` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'centers', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'name', b.`name`, 'lat', b.`lat`, 'lng', b.`lng`, 'version', b.`version`, 'deleted_at', b.`deleted_at`, 'created_at', b.`created_at`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `centers` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'vehicles', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'name', b.`name`, 'plate', b.`plate`, 'plate_key', b.`plate_key`, 'body_type', b.`body_type`, 'service_type', b.`service_type`, 'passenger_capacity', b.`passenger_capacity`, 'cargo_capacity', b.`cargo_capacity`, 'has_fridge', b.`has_fridge`, 'fridge_capacity', b.`fridge_capacity`, 'shift_start', b.`shift_start`, 'shift_end', b.`shift_end`, 'ownership', b.`ownership`, 'contractor_name', b.`contractor_name`, 'status', b.`status`, 'version', b.`version`, 'deleted_at', b.`deleted_at`, 'created_at', b.`created_at`, 'vehicle_type_id', b.`vehicle_type_id`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `vehicles` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'vehicle_types', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'code', b.`code`, 'title', b.`title`, 'is_active', b.`is_active`, 'version', b.`version`, 'created_at', b.`created_at`, 'edited_at', b.`edited_at`, 'deleted_at', b.`deleted_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `vehicle_types` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'roles', CAST(b.`code` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('code', b.`code`, 'title', b.`title`, 'version', b.`version`, 'created_at', b.`created_at`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `roles` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'transport_requests', CAST(b.`id` AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('history_format', 1, 'record_version', b.version,
 'before', NULL, 'after', JSON_OBJECT('id', b.`id`, 'requester_user_id', b.`requester_user_id`, 'unit_id', b.`unit_id`, 'vehicle_id', b.`vehicle_id`, 'origin_id', b.`origin_id`, 'destination_id', b.`destination_id`, 'unit_name', b.`unit_name`, 'origin_name', b.`origin_name`, 'destination_name', b.`destination_name`, 'vehicle_name', b.`vehicle_name`, 'plate', b.`plate`, 'service_date', b.`service_date`, 'service_time', b.`service_time`, 'status', b.`status`, 'version', b.`version`, 'started_at', b.`started_at`, 'delivered_at', b.`delivered_at`, 'cancelled_at', b.`cancelled_at`, 'created_at', b.`created_at`, 'edited_at', b.`edited_at`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `transport_requests` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'user_vehicles', CONCAT(b.`user_id`, ':', b.`vehicle_id`),
 JSON_OBJECT('history_format', 1, 'record_version', NULL,
 'before', NULL, 'after', JSON_OBJECT('user_id', b.`user_id`, 'vehicle_id', b.`vehicle_id`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `user_vehicles` b
-- @statement
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
SELECT NULL, 'history.baseline', 'request_drivers', CONCAT(b.`request_id`, ':', b.`user_id`),
 JSON_OBJECT('history_format', 1, 'record_version', NULL,
 'before', NULL, 'after', JSON_OBJECT('request_id', b.`request_id`, 'user_id', b.`user_id`), 'password_changed', FALSE,
 'db_account', USER(), 'change_id', @behmasir_change_id)
FROM `request_drivers` b
