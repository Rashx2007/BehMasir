-- BehMasir: migration 002, PHASE 1 / TEST DATABASE ONLY.
-- Encoding fix: SQL source is ASCII; Persian labels use explicit UTF-8 hex.
-- On Windows also pass --default-character-set=utf8mb4 to mysql.exe.
-- Do NOT rerun on a database already migrated to version 2.
-- Target: MySQL 8.4, schema version 1.
-- Does not alter the live behmasir database or the application files.
-- MySQL DDL is NOT transactional. On failure, keep the original database untouched;
-- rebuild the test database from the backup before retrying.
-- Retain vehicles.body_type and its CHECK until the backend transition is complete.
-- Tree-cycle validation, permissions and UI support are later application changes.

USE behmasir_upgrade_test;

DELIMITER $$
DROP PROCEDURE IF EXISTS behmasir_migration_002_test$$
CREATE PROCEDURE behmasir_migration_002_test()
main: BEGIN
    DECLARE lock_taken INT DEFAULT 0;
    DECLARE n_users BIGINT;
    DECLARE n_centers BIGINT;
    DECLARE n_vehicles BIGINT;
    DECLARE n_requests BIGINT;
    DECLARE n_audit BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF lock_taken = 1 THEN
            DO RELEASE_LOCK('behmasir_upgrade_test.migration_002');
        END IF;
        RESIGNAL;
    END;

    IF DATABASE() <> 'behmasir_upgrade_test' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wrong database: TEST ONLY.';
    END IF;
    IF VERSION() NOT LIKE '8.4.%' OR VERSION() LIKE '%MariaDB%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This migration targets MySQL 8.4 only.';
    END IF;
    SELECT GET_LOCK('behmasir_upgrade_test.migration_002', 0) INTO lock_taken;
    IF COALESCE(lock_taken, 0) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Another migration is running.';
    END IF;
    IF (SELECT COUNT(*) FROM schema_migrations) <> 1
       OR (SELECT COUNT(*) FROM schema_migrations WHERE version = 1) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected schema version 1 only. Stop and inspect.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = 'vehicle_types')
       OR EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE()
                    AND ((table_name = 'units' AND column_name = 'parent_id')
                      OR (table_name = 'vehicles' AND column_name = 'vehicle_type_id'))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Partial or previous migration found. Do not retry blindly.';
    END IF;
    IF EXISTS (SELECT 1 FROM vehicles
               WHERE body_type IS NULL OR body_type NOT IN
                 ('sedan', 'pickup_single', 'pickup_double', 'van', 'minibus', 'truck')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An existing vehicle has an unmapped body_type.';
    END IF;

    SELECT COUNT(*) INTO n_users FROM users;
    SELECT COUNT(*) INTO n_centers FROM centers;
    SELECT COUNT(*) INTO n_vehicles FROM vehicles;
    SELECT COUNT(*) INTO n_requests FROM transport_requests;
    SELECT COUNT(*) INTO n_audit FROM audit_log;

    CREATE TABLE vehicle_types (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
        title VARCHAR(80) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        version INT UNSIGNED NOT NULL DEFAULT 1,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        edited_at DATETIME(3) NULL,
        deleted_at DATETIME(3) NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_vehicle_types_code (code),
        CONSTRAINT ck_vehicle_types_active CHECK (is_active IN (0, 1))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

    -- Reference classifications copied from the existing application, NOT demo vehicles.
    INSERT INTO vehicle_types (code, title) VALUES
        ('sedan', CONVERT(0xD8B3D988D8A7D8B1DB8C20D8B3D8AFD8A7D986 USING utf8mb4)),
        ('pickup_single', CONVERT(0xD988D8A7D986D8AA20D8AADAA9E2808CDAA9D8A7D8A8DB8CD986 USING utf8mb4)),
        ('pickup_double', CONVERT(0xD988D8A7D986D8AA20D8AFD988DAA9D8A7D8A8DB8CD986 USING utf8mb4)),
        ('van', CONVERT(0xD988D986 USING utf8mb4)),
        ('minibus', CONVERT(0xD985DB8CD986DB8CE2808CD8A8D988D8B3 USING utf8mb4)),
        ('truck', CONVERT(0xDAA9D8A7D985DB8CD988D986D8AA2FDAA9D8A7D985DB8CD988D986 USING utf8mb4));

    -- Verify every label's stored bytes, independently of terminal rendering.
    IF EXISTS (
        SELECT 1 FROM vehicle_types
        WHERE HEX(title) <> CASE code
                    WHEN 'sedan' THEN 'D8B3D988D8A7D8B1DB8C20D8B3D8AFD8A7D986'
                    WHEN 'pickup_single' THEN 'D988D8A7D986D8AA20D8AADAA9E2808CDAA9D8A7D8A8DB8CD986'
                    WHEN 'pickup_double' THEN 'D988D8A7D986D8AA20D8AFD988DAA9D8A7D8A8DB8CD986'
                    WHEN 'van' THEN 'D988D986'
                    WHEN 'minibus' THEN 'D985DB8CD986DB8CE2808CD8A8D988D8B3'
                    WHEN 'truck' THEN 'DAA9D8A7D985DB8CD988D986D8AA2FDAA9D8A7D985DB8CD988D986'
                    ELSE '' END
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'UTF-8 label validation failed.';
    END IF;

    ALTER TABLE vehicles
        ADD COLUMN vehicle_type_id INT UNSIGNED NULL AFTER body_type;

    -- Includes soft-deleted vehicles: their references must remain valid too.
    UPDATE vehicles AS v
    JOIN vehicle_types AS t ON t.code = v.body_type
    SET v.vehicle_type_id = t.id;

    IF EXISTS (SELECT 1 FROM vehicles WHERE vehicle_type_id IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle type backfill failed. Test database needs inspection.';
    END IF;
    ALTER TABLE vehicles
        MODIFY COLUMN vehicle_type_id INT UNSIGNED NOT NULL,
        ADD INDEX ix_vehicles_type (vehicle_type_id),
        ADD CONSTRAINT fk_vehicles_vehicle_type
            FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
            ON DELETE RESTRICT ON UPDATE RESTRICT;

    -- Existing unit hierarchy is not guessed: parent_id starts NULL for all units.
    ALTER TABLE units
        ADD COLUMN parent_id INT UNSIGNED NULL AFTER id,
        ADD INDEX ix_units_parent (parent_id),
        ADD CONSTRAINT fk_units_parent
            FOREIGN KEY (parent_id) REFERENCES units(id)
            ON DELETE RESTRICT ON UPDATE RESTRICT;

    IF (SELECT COUNT(*) FROM users) <> n_users
       OR (SELECT COUNT(*) FROM centers) <> n_centers
       OR (SELECT COUNT(*) FROM vehicles) <> n_vehicles
       OR (SELECT COUNT(*) FROM transport_requests) <> n_requests
       OR (SELECT COUNT(*) FROM audit_log) <> n_audit THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unexpected change in existing row counts.';
    END IF;

    -- Mark applied ONLY after every preceding operation and check succeeds.
    INSERT INTO schema_migrations (version) VALUES (2);
    DO RELEASE_LOCK('behmasir_upgrade_test.migration_002');
    SET lock_taken = 0;
END$$
CALL behmasir_migration_002_test()$$
DROP PROCEDURE IF EXISTS behmasir_migration_002_test$$
DELIMITER ;

SELECT DATABASE() AS target_database, version, applied_at
FROM schema_migrations ORDER BY version;

SELECT t.id, t.code, t.title, COUNT(v.id) AS linked_vehicles
FROM vehicle_types AS t
LEFT JOIN vehicles AS v ON v.vehicle_type_id = t.id
GROUP BY t.id, t.code, t.title ORDER BY t.id;

SELECT COUNT(*) AS units_count,
       SUM(parent_id IS NOT NULL) AS units_with_parent
FROM units;
