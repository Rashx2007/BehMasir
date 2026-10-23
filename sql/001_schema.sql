-- اجرای یک‌باره روی دیتابیس جدید؛ حذف یا جایگزینی دادهٔ موجود انجام نمی‌شود.
CREATE DATABASE IF NOT EXISTS behmasir CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE behmasir;
CREATE TABLE schema_migrations (version INT PRIMARY KEY, applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3));
CREATE TABLE roles (code VARCHAR(24) CHARACTER SET ascii PRIMARY KEY, title VARCHAR(80) NOT NULL);
INSERT INTO roles VALUES ('admin','مدیر سیستم'),('dispatcher','مسئول ناوگان'),('requester','درخواست‌کننده'),('driver','راننده');
CREATE TABLE app_meta (id TINYINT PRIMARY KEY, revision BIGINT UNSIGNED NOT NULL DEFAULT 0);
INSERT INTO app_meta VALUES (1,0);
CREATE TABLE units (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 used_ever BOOLEAN NOT NULL DEFAULT FALSE, deleted_at DATETIME(3) NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE centers (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 lat DECIMAL(9,6) NULL, lng DECIMAL(10,6) NULL, version INT UNSIGNED NOT NULL DEFAULT 1,
 deleted_at DATETIME(3) NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT ck_center_coordinates CHECK ((lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))
);
CREATE TABLE vehicles (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, plate VARCHAR(40) NOT NULL,
 plate_key VARCHAR(40) NOT NULL UNIQUE, body_type VARCHAR(24) NOT NULL,
 service_type VARCHAR(16) NOT NULL, passenger_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 cargo_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 0, has_fridge BOOLEAN NOT NULL DEFAULT FALSE,
 fridge_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 0, shift_start TIME NULL, shift_end TIME NULL,
 ownership VARCHAR(16) NOT NULL, contractor_name VARCHAR(150) NOT NULL DEFAULT '',
 status VARCHAR(20) NOT NULL DEFAULT 'ok', version INT UNSIGNED NOT NULL DEFAULT 1,
 deleted_at DATETIME(3) NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT ck_vehicle_body CHECK (body_type IN ('sedan','pickup_single','pickup_double','van','minibus','truck')),
 CONSTRAINT ck_vehicle_service CHECK (service_type IN ('passenger','cargo','both')),
 CONSTRAINT ck_vehicle_status CHECK (status IN ('ok','down','maintenance')),
 CONSTRAINT ck_vehicle_owner CHECK (ownership IN ('org','contractor')),
 CONSTRAINT ck_vehicle_shift CHECK ((shift_start IS NULL AND shift_end IS NULL) OR (shift_start IS NOT NULL AND shift_end IS NOT NULL AND shift_start<>shift_end)),
 CONSTRAINT ck_vehicle_fridge CHECK (fridge_capacity<=cargo_capacity AND (has_fridge=1 OR fridge_capacity=0))
);
CREATE TABLE users (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, username VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
 name VARCHAR(80) NOT NULL, role_code VARCHAR(24) CHARACTER SET ascii NOT NULL,
 password_hash VARCHAR(255) CHARACTER SET ascii NOT NULL, unit_id INT UNSIGNED NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, auth_version INT UNSIGNED NOT NULL DEFAULT 1,
 version INT UNSIGNED NOT NULL DEFAULT 1, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(role_code) REFERENCES roles(code), FOREIGN KEY(unit_id) REFERENCES units(id),
 INDEX ix_users_role_active(role_code,active)
);
CREATE TABLE user_vehicles (
 user_id INT UNSIGNED NOT NULL, vehicle_id INT UNSIGNED NOT NULL,
 PRIMARY KEY(user_id,vehicle_id), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
);
CREATE TABLE user_preferences (
 user_id INT UNSIGNED PRIMARY KEY, preferences JSON NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE sessions (
 token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY, user_id INT UNSIGNED NOT NULL,
 csrf_token CHAR(64) CHARACTER SET ascii NOT NULL, auth_version INT UNSIGNED NOT NULL,
 expires_at DATETIME(3) NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(user_id) REFERENCES users(id), INDEX ix_sessions_user(user_id), INDEX ix_sessions_expiry(expires_at)
);
CREATE TABLE login_limits (
 bucket CHAR(64) CHARACTER SET ascii PRIMARY KEY, failures INT UNSIGNED NOT NULL DEFAULT 0,
 window_start DATETIME(3) NOT NULL, INDEX ix_limits_expiry(window_start)
);
CREATE TABLE transport_requests (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, requester_user_id INT UNSIGNED NOT NULL,
 unit_id INT UNSIGNED NOT NULL, vehicle_id INT UNSIGNED NOT NULL,
 origin_id INT UNSIGNED NOT NULL, destination_id INT UNSIGNED NOT NULL,
 unit_name VARCHAR(100) NOT NULL, origin_name VARCHAR(100) NOT NULL, destination_name VARCHAR(100) NOT NULL,
 vehicle_name VARCHAR(100) NOT NULL, plate VARCHAR(40) NOT NULL,
 service_date DATE NOT NULL, service_time TIME NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'scheduled', version INT UNSIGNED NOT NULL DEFAULT 1,
 started_at DATETIME(3) NULL, delivered_at DATETIME(3) NULL, cancelled_at DATETIME(3) NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(requester_user_id) REFERENCES users(id), FOREIGN KEY(unit_id) REFERENCES units(id),
 FOREIGN KEY(vehicle_id) REFERENCES vehicles(id), FOREIGN KEY(origin_id) REFERENCES centers(id), FOREIGN KEY(destination_id) REFERENCES centers(id),
 CONSTRAINT ck_request_route CHECK (origin_id<>destination_id),
 CONSTRAINT ck_request_status CHECK (status IN ('scheduled','enroute','delivered','cancelled')),
 INDEX ix_request_vehicle_date(vehicle_id,service_date,status),
 INDEX ix_request_owner_date(requester_user_id,service_date,id), INDEX ix_request_status_date(status,service_date,id),
 INDEX ix_request_delivered(delivered_at,id)
);
CREATE TABLE request_drivers (
 request_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL, PRIMARY KEY(request_id,user_id),
 FOREIGN KEY(request_id) REFERENCES transport_requests(id), FOREIGN KEY(user_id) REFERENCES users(id), INDEX ix_driver_requests(user_id,request_id)
);
CREATE TABLE request_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, request_id INT UNSIGNED NOT NULL,
 actor_id INT UNSIGNED NOT NULL, event_type VARCHAR(32) NOT NULL, payload JSON NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(request_id) REFERENCES transport_requests(id), FOREIGN KEY(actor_id) REFERENCES users(id), INDEX ix_events_request(request_id,id)
);
CREATE TABLE audit_log (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, actor_id INT UNSIGNED NULL,
 action VARCHAR(64) NOT NULL, entity_type VARCHAR(32) NOT NULL, entity_id INT UNSIGNED NULL,
 payload JSON NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY(actor_id) REFERENCES users(id), INDEX ix_audit_created(created_at,id), INDEX ix_audit_entity(entity_type,entity_id,id)
);
CREATE TABLE idempotency_keys (
 user_id INT UNSIGNED NOT NULL, request_key CHAR(36) CHARACTER SET ascii NOT NULL,
 body_hash CHAR(64) CHARACTER SET ascii NOT NULL, response JSON NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(user_id,request_key), FOREIGN KEY(user_id) REFERENCES users(id), INDEX ix_idempotency_expiry(created_at)
);
INSERT INTO schema_migrations(version) VALUES (1);
