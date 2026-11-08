-- MySQL dump 10.13  Distrib 8.4.11, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: behmasir_pilot
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `access_permissions`
--

DROP TABLE IF EXISTS `access_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `access_permissions` (
  `code` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`code`),
  CONSTRAINT `ck_ap_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ap_bi` BEFORE INSERT ON `access_permissions` FOR EACH ROW BEGIN
SET NEW.version=1;
SET NEW.edited_at=NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ap_ai` AFTER INSERT ON `access_permissions` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.permission_create','access_permissions',NEW.code,
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('code',NEW.`code`,'title',NEW.`title`,'is_active',NEW.`is_active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ap_bu` BEFORE UPDATE ON `access_permissions` FOR EACH ROW BEGIN
IF NOT ((OLD.`code` <=> NEW.`code`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Access identity and creation time are immutable.';
END IF;
IF (OLD.`title` <=> NEW.`title`) AND (OLD.`is_active` <=> NEW.`is_active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at;
ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ap_au` AFTER UPDATE ON `access_permissions` FOR EACH ROW BEGIN
IF NEW.version<>OLD.version THEN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.permission_update','access_permissions',NEW.code,
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',JSON_OBJECT('code',OLD.`code`,'title',OLD.`title`,'is_active',OLD.`is_active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('code',NEW.`code`,'title',NEW.`title`,'is_active',NEW.`is_active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ap_bd` BEFORE DELETE ON `access_permissions` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Physical delete blocked; deactivate access records instead.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `access_role_permissions`
--

DROP TABLE IF EXISTS `access_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `access_role_permissions` (
  `role_code` varchar(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `permission_code` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`role_code`,`permission_code`),
  KEY `fk_arp_permission` (`permission_code`),
  CONSTRAINT `fk_arp_permission` FOREIGN KEY (`permission_code`) REFERENCES `access_permissions` (`code`),
  CONSTRAINT `fk_arp_role` FOREIGN KEY (`role_code`) REFERENCES `roles` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_arp_ai` AFTER INSERT ON `access_role_permissions` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.role_grant','access_role_permissions',CONCAT(NEW.role_code,':',NEW.permission_code),
 JSON_OBJECT('access_format',1,'record_version',NULL,'before',NULL,'after',JSON_OBJECT('role_code',NEW.`role_code`,'permission_code',NEW.`permission_code`,'created_at',NEW.`created_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_arp_bu` BEFORE UPDATE ON `access_role_permissions` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Role membership is immutable; remove and add with audit.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_arp_ad` AFTER DELETE ON `access_role_permissions` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.role_unlink','access_role_permissions',CONCAT(OLD.role_code,':',OLD.permission_code),
 JSON_OBJECT('access_format',1,'record_version',NULL,'before',JSON_OBJECT('role_code',OLD.`role_code`,'permission_code',OLD.`permission_code`,'created_at',OLD.`created_at`),'after',NULL,'db_account',USER(),'change_id',@behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `app_meta`
--

DROP TABLE IF EXISTS `app_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_meta` (
  `id` tinyint NOT NULL,
  `revision` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_id` int unsigned DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `entity_type` varchar(32) NOT NULL,
  `entity_id` varchar(128) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `payload` json NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `actor_id` (`actor_id`),
  KEY `ix_audit_created` (`created_at`,`id`),
  KEY `ix_audit_entity` (`entity_type`,`entity_id`,`id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_audit_log_bu` BEFORE UPDATE ON `audit_log` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is append-only.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_audit_log_bd` BEFORE DELETE ON `audit_log` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log is append-only.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `centers`
--

DROP TABLE IF EXISTS `centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `centers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lng` decimal(10,6) DEFAULT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  CONSTRAINT `ck_center_coordinates` CHECK ((((`lat` is null) and (`lng` is null)) or ((`lat` is not null) and (`lng` is not null) and (`lat` between -(90) and 90) and (`lng` between -(180) and 180))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_centers_bi` BEFORE INSERT ON `centers` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_centers_ai` AFTER INSERT ON `centers` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'centers', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'lat', NEW.`lat`, 'lng', NEW.`lng`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_centers_bu` BEFORE UPDATE ON `centers` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_centers_au` AFTER UPDATE ON `centers` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'centers', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'lat', OLD.`lat`, 'lng', OLD.`lng`, 'version', OLD.`version`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'lat', NEW.`lat`, 'lng', NEW.`lng`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_centers_bd` BEFORE DELETE ON `centers` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `idempotency_keys`
--

DROP TABLE IF EXISTS `idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `idempotency_keys` (
  `user_id` int unsigned NOT NULL,
  `request_key` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `body_hash` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `response` json NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`,`request_key`),
  KEY `ix_idempotency_expiry` (`created_at`),
  CONSTRAINT `idempotency_keys_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `login_limits`
--

DROP TABLE IF EXISTS `login_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_limits` (
  `bucket` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `failures` int unsigned NOT NULL DEFAULT '0',
  `window_start` datetime(3) NOT NULL,
  PRIMARY KEY (`bucket`),
  KEY `ix_limits_expiry` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `request_drivers`
--

DROP TABLE IF EXISTS `request_drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_drivers` (
  `request_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  PRIMARY KEY (`request_id`,`user_id`),
  KEY `ix_driver_requests` (`user_id`,`request_id`),
  CONSTRAINT `request_drivers_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `transport_requests` (`id`),
  CONSTRAINT `request_drivers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_request_drivers_ai` AFTER INSERT ON `request_drivers` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'request_drivers', CONCAT(NEW.`request_id`, ':', NEW.`user_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', NULL, 'after', JSON_OBJECT('request_id', NEW.`request_id`, 'user_id', NEW.`user_id`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_request_drivers_bu` BEFORE UPDATE ON `request_drivers` FOR EACH ROW BEGIN
  IF NOT ((OLD.`request_id` <=> NEW.`request_id`) AND (OLD.`user_id` <=> NEW.`user_id`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Relationship keys are immutable; use delete and insert.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_request_drivers_ad` AFTER DELETE ON `request_drivers` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.unlink', 'request_drivers', CONCAT(OLD.`request_id`, ':', OLD.`user_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', JSON_OBJECT('request_id', OLD.`request_id`, 'user_id', OLD.`user_id`), 'after', NULL, 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `request_events`
--

DROP TABLE IF EXISTS `request_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_id` int unsigned NOT NULL,
  `actor_id` int unsigned NOT NULL,
  `event_type` varchar(32) NOT NULL,
  `payload` json NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `actor_id` (`actor_id`),
  KEY `ix_events_request` (`request_id`,`id`),
  CONSTRAINT `request_events_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `transport_requests` (`id`),
  CONSTRAINT `request_events_ibfk_2` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `code` varchar(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `title` varchar(80) NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_roles_bi` BEFORE INSERT ON `roles` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_roles_ai` AFTER INSERT ON `roles` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'roles', CAST(NEW.`code` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('code', NEW.`code`, 'title', NEW.`title`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_roles_bu` BEFORE UPDATE ON `roles` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_roles_au` AFTER UPDATE ON `roles` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'roles', CAST(NEW.`code` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('code', OLD.`code`, 'title', OLD.`title`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('code', NEW.`code`, 'title', NEW.`title`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_roles_bd` BEFORE DELETE ON `roles` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `version` int NOT NULL,
  `applied_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` int unsigned NOT NULL,
  `csrf_token` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `auth_version` int unsigned NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`token_hash`),
  KEY `ix_sessions_user` (`user_id`),
  KEY `ix_sessions_expiry` (`expires_at`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transport_requests`
--

DROP TABLE IF EXISTS `transport_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transport_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `requester_user_id` int unsigned NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `vehicle_id` int unsigned NOT NULL,
  `origin_id` int unsigned NOT NULL,
  `destination_id` int unsigned NOT NULL,
  `unit_name` varchar(100) NOT NULL,
  `origin_name` varchar(100) NOT NULL,
  `destination_name` varchar(100) NOT NULL,
  `vehicle_name` varchar(100) NOT NULL,
  `plate` varchar(40) NOT NULL,
  `service_date` date NOT NULL,
  `service_time` time NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `version` int unsigned NOT NULL DEFAULT '1',
  `started_at` datetime(3) DEFAULT NULL,
  `delivered_at` datetime(3) DEFAULT NULL,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unit_id` (`unit_id`),
  KEY `origin_id` (`origin_id`),
  KEY `destination_id` (`destination_id`),
  KEY `ix_request_vehicle_date` (`vehicle_id`,`service_date`,`status`),
  KEY `ix_request_owner_date` (`requester_user_id`,`service_date`,`id`),
  KEY `ix_request_status_date` (`status`,`service_date`,`id`),
  KEY `ix_request_delivered` (`delivered_at`,`id`),
  CONSTRAINT `transport_requests_ibfk_1` FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `transport_requests_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `transport_requests_ibfk_3` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `transport_requests_ibfk_4` FOREIGN KEY (`origin_id`) REFERENCES `centers` (`id`),
  CONSTRAINT `transport_requests_ibfk_5` FOREIGN KEY (`destination_id`) REFERENCES `centers` (`id`),
  CONSTRAINT `ck_request_route` CHECK ((`origin_id` <> `destination_id`)),
  CONSTRAINT `ck_request_status` CHECK ((`status` in (_utf8mb4'scheduled',_utf8mb4'enroute',_utf8mb4'delivered',_utf8mb4'cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_transport_requests_bi` BEFORE INSERT ON `transport_requests` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_transport_requests_ai` AFTER INSERT ON `transport_requests` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'transport_requests', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'requester_user_id', NEW.`requester_user_id`, 'unit_id', NEW.`unit_id`, 'vehicle_id', NEW.`vehicle_id`, 'origin_id', NEW.`origin_id`, 'destination_id', NEW.`destination_id`, 'unit_name', NEW.`unit_name`, 'origin_name', NEW.`origin_name`, 'destination_name', NEW.`destination_name`, 'vehicle_name', NEW.`vehicle_name`, 'plate', NEW.`plate`, 'service_date', NEW.`service_date`, 'service_time', NEW.`service_time`, 'status', NEW.`status`, 'version', NEW.`version`, 'started_at', NEW.`started_at`, 'delivered_at', NEW.`delivered_at`, 'cancelled_at', NEW.`cancelled_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_transport_requests_bu` BEFORE UPDATE ON `transport_requests` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_transport_requests_au` AFTER UPDATE ON `transport_requests` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'transport_requests', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'requester_user_id', OLD.`requester_user_id`, 'unit_id', OLD.`unit_id`, 'vehicle_id', OLD.`vehicle_id`, 'origin_id', OLD.`origin_id`, 'destination_id', OLD.`destination_id`, 'unit_name', OLD.`unit_name`, 'origin_name', OLD.`origin_name`, 'destination_name', OLD.`destination_name`, 'vehicle_name', OLD.`vehicle_name`, 'plate', OLD.`plate`, 'service_date', OLD.`service_date`, 'service_time', OLD.`service_time`, 'status', OLD.`status`, 'version', OLD.`version`, 'started_at', OLD.`started_at`, 'delivered_at', OLD.`delivered_at`, 'cancelled_at', OLD.`cancelled_at`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'requester_user_id', NEW.`requester_user_id`, 'unit_id', NEW.`unit_id`, 'vehicle_id', NEW.`vehicle_id`, 'origin_id', NEW.`origin_id`, 'destination_id', NEW.`destination_id`, 'unit_name', NEW.`unit_name`, 'origin_name', NEW.`origin_name`, 'destination_name', NEW.`destination_name`, 'vehicle_name', NEW.`vehicle_name`, 'plate', NEW.`plate`, 'service_date', NEW.`service_date`, 'service_time', NEW.`service_time`, 'status', NEW.`status`, 'version', NEW.`version`, 'started_at', NEW.`started_at`, 'delivered_at', NEW.`delivered_at`, 'cancelled_at', NEW.`cancelled_at`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_transport_requests_bd` BEFORE DELETE ON `transport_requests` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `unit_role_assignments`
--

DROP TABLE IF EXISTS `unit_role_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unit_role_assignments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `role_code` varchar(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `include_descendants` tinyint(1) NOT NULL DEFAULT '1',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ura_user_role_unit` (`user_id`,`role_code`,`unit_id`),
  KEY `ix_ura_unit_active` (`unit_id`,`active`),
  KEY `fk_ura_role` (`role_code`),
  CONSTRAINT `fk_ura_role` FOREIGN KEY (`role_code`) REFERENCES `roles` (`code`),
  CONSTRAINT `fk_ura_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `fk_ura_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_ura_flags` CHECK (((`active` in (0,1)) and (`include_descendants` in (0,1))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ura_bi` BEFORE INSERT ON `unit_role_assignments` FOR EACH ROW BEGIN
SET NEW.version=1;
SET NEW.edited_at=NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ura_ai` AFTER INSERT ON `unit_role_assignments` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.assignment_create','unit_role_assignments',CAST(NEW.id AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'role_code',NEW.`role_code`,'unit_id',NEW.`unit_id`,'include_descendants',NEW.`include_descendants`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ura_bu` BEFORE UPDATE ON `unit_role_assignments` FOR EACH ROW BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`role_code` <=> NEW.`role_code`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Access identity and creation time are immutable.';
END IF;
IF (OLD.`include_descendants` <=> NEW.`include_descendants`) AND (OLD.`active` <=> NEW.`active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at;
ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ura_au` AFTER UPDATE ON `unit_role_assignments` FOR EACH ROW BEGIN
IF NEW.version<>OLD.version THEN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload)
 VALUES (@behmasir_actor_id,'access.assignment_update','unit_role_assignments',CAST(NEW.id AS CHAR CHARACTER SET ascii),
 JSON_OBJECT('access_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'user_id',OLD.`user_id`,'role_code',OLD.`role_code`,'unit_id',OLD.`unit_id`,'include_descendants',OLD.`include_descendants`,'active',OLD.`active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'role_code',NEW.`role_code`,'unit_id',NEW.`unit_id`,'include_descendants',NEW.`include_descendants`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'db_account',USER(),'change_id',@behmasir_change_id));
END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh4_ura_bd` BEFORE DELETE ON `unit_role_assignments` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Physical delete blocked; deactivate access records instead.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `units`
--

DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int unsigned DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `used_ever` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `version` int unsigned NOT NULL DEFAULT '1',
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `ix_units_parent` (`parent_id`),
  CONSTRAINT `fk_units_parent` FOREIGN KEY (`parent_id`) REFERENCES `units` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_units_bi` BEFORE INSERT ON `units` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_units_ai` AFTER INSERT ON `units` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'units', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'used_ever', NEW.`used_ever`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'parent_id', NEW.`parent_id`, 'version', NEW.`version`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_units_bu` BEFORE UPDATE ON `units` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_units_au` AFTER UPDATE ON `units` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'units', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'used_ever', OLD.`used_ever`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'parent_id', OLD.`parent_id`, 'version', OLD.`version`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'used_ever', NEW.`used_ever`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'parent_id', NEW.`parent_id`, 'version', NEW.`version`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_units_bd` BEFORE DELETE ON `units` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_preferences` (
  `user_id` int unsigned NOT NULL,
  `preferences` json NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_vehicles`
--

DROP TABLE IF EXISTS `user_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_vehicles` (
  `user_id` int unsigned NOT NULL,
  `vehicle_id` int unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`vehicle_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `user_vehicles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_vehicles_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_user_vehicles_ai` AFTER INSERT ON `user_vehicles` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'user_vehicles', CONCAT(NEW.`user_id`, ':', NEW.`vehicle_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', NULL, 'after', JSON_OBJECT('user_id', NEW.`user_id`, 'vehicle_id', NEW.`vehicle_id`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_user_vehicles_bu` BEFORE UPDATE ON `user_vehicles` FOR EACH ROW BEGIN
  IF NOT ((OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`vehicle_id` <=> NEW.`vehicle_id`)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Relationship keys are immutable; use delete and insert.';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_user_vehicles_ad` AFTER DELETE ON `user_vehicles` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.unlink', 'user_vehicles', CONCAT(OLD.`user_id`, ':', OLD.`vehicle_id`),
      JSON_OBJECT('history_format', 1, 'record_version', NULL,
        'before', JSON_OBJECT('user_id', OLD.`user_id`, 'vehicle_id', OLD.`vehicle_id`), 'after', NULL, 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `name` varchar(80) NOT NULL,
  `role_code` varchar(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `unit_id` int unsigned DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `auth_version` int unsigned NOT NULL DEFAULT '1',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `unit_id` (`unit_id`),
  KEY `ix_users_role_active` (`role_code`,`active`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_code`) REFERENCES `roles` (`code`),
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_users_bi` BEFORE INSERT ON `users` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_users_ai` AFTER INSERT ON `users` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'users', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'username', NEW.`username`, 'name', NEW.`name`, 'role_code', NEW.`role_code`, 'unit_id', NEW.`unit_id`, 'active', NEW.`active`, 'auth_version', NEW.`auth_version`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_users_bu` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_users_au` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.update', 'users', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'username', OLD.`username`, 'name', OLD.`name`, 'role_code', OLD.`role_code`, 'unit_id', OLD.`unit_id`, 'active', OLD.`active`, 'auth_version', OLD.`auth_version`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'username', NEW.`username`, 'name', NEW.`name`, 'role_code', NEW.`role_code`, 'unit_id', NEW.`unit_id`, 'active', NEW.`active`, 'auth_version', NEW.`auth_version`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`), 'password_changed', NOT (OLD.password_hash <=> NEW.password_hash),
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_users_bd` BEFORE DELETE ON `users` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `vehicle_types`
--

DROP TABLE IF EXISTS `vehicle_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_types` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(24) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `title` varchar(80) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicle_types_code` (`code`),
  CONSTRAINT `ck_vehicle_types_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicle_types_bi` BEFORE INSERT ON `vehicle_types` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicle_types_ai` AFTER INSERT ON `vehicle_types` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'vehicle_types', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'title', NEW.`title`, 'is_active', NEW.`is_active`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`, 'deleted_at', NEW.`deleted_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicle_types_bu` BEFORE UPDATE ON `vehicle_types` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicle_types_au` AFTER UPDATE ON `vehicle_types` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'vehicle_types', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'code', OLD.`code`, 'title', OLD.`title`, 'is_active', OLD.`is_active`, 'version', OLD.`version`, 'created_at', OLD.`created_at`, 'edited_at', OLD.`edited_at`, 'deleted_at', OLD.`deleted_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'code', NEW.`code`, 'title', NEW.`title`, 'is_active', NEW.`is_active`, 'version', NEW.`version`, 'created_at', NEW.`created_at`, 'edited_at', NEW.`edited_at`, 'deleted_at', NEW.`deleted_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicle_types_bd` BEFORE DELETE ON `vehicle_types` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `plate` varchar(40) NOT NULL,
  `plate_key` varchar(40) NOT NULL,
  `body_type` varchar(24) NOT NULL,
  `vehicle_type_id` int unsigned NOT NULL,
  `service_type` varchar(16) NOT NULL,
  `passenger_capacity` smallint unsigned NOT NULL DEFAULT '0',
  `cargo_capacity` smallint unsigned NOT NULL DEFAULT '0',
  `has_fridge` tinyint(1) NOT NULL DEFAULT '0',
  `fridge_capacity` smallint unsigned NOT NULL DEFAULT '0',
  `shift_start` time DEFAULT NULL,
  `shift_end` time DEFAULT NULL,
  `ownership` varchar(16) NOT NULL,
  `contractor_name` varchar(150) NOT NULL DEFAULT '',
  `status` varchar(20) NOT NULL DEFAULT 'ok',
  `version` int unsigned NOT NULL DEFAULT '1',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate_key` (`plate_key`),
  KEY `ix_vehicles_type` (`vehicle_type_id`),
  CONSTRAINT `fk_vehicles_vehicle_type` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_vehicle_body` CHECK ((`body_type` in (_utf8mb4'sedan',_utf8mb4'pickup_single',_utf8mb4'pickup_double',_utf8mb4'van',_utf8mb4'minibus',_utf8mb4'truck'))),
  CONSTRAINT `ck_vehicle_fridge` CHECK (((`fridge_capacity` <= `cargo_capacity`) and ((`has_fridge` = 1) or (`fridge_capacity` = 0)))),
  CONSTRAINT `ck_vehicle_owner` CHECK ((`ownership` in (_utf8mb4'org',_utf8mb4'contractor'))),
  CONSTRAINT `ck_vehicle_service` CHECK ((`service_type` in (_utf8mb4'passenger',_utf8mb4'cargo',_utf8mb4'both'))),
  CONSTRAINT `ck_vehicle_shift` CHECK ((((`shift_start` is null) and (`shift_end` is null)) or ((`shift_start` is not null) and (`shift_end` is not null) and (`shift_start` <> `shift_end`)))),
  CONSTRAINT `ck_vehicle_status` CHECK ((`status` in (_utf8mb4'ok',_utf8mb4'down',_utf8mb4'maintenance')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicles_bi` BEFORE INSERT ON `vehicles` FOR EACH ROW BEGIN
  SET NEW.version = 1;
  SET NEW.edited_at = NULL;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicles_ai` AFTER INSERT ON `vehicles` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, 'history.create', 'vehicles', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', NULL, 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'plate', NEW.`plate`, 'plate_key', NEW.`plate_key`, 'body_type', NEW.`body_type`, 'service_type', NEW.`service_type`, 'passenger_capacity', NEW.`passenger_capacity`, 'cargo_capacity', NEW.`cargo_capacity`, 'has_fridge', NEW.`has_fridge`, 'fridge_capacity', NEW.`fridge_capacity`, 'shift_start', NEW.`shift_start`, 'shift_end', NEW.`shift_end`, 'ownership', NEW.`ownership`, 'contractor_name', NEW.`contractor_name`, 'status', NEW.`status`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'vehicle_type_id', NEW.`vehicle_type_id`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicles_bu` BEFORE UPDATE ON `vehicles` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicles_au` AFTER UPDATE ON `vehicles` FOR EACH ROW BEGIN
  IF NEW.version <> OLD.version THEN
INSERT INTO audit_log(actor_id, action, entity_type, entity_id, payload)
    VALUES (@behmasir_actor_id, CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'history.soft_delete' WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'history.restore' ELSE 'history.update' END, 'vehicles', CAST(NEW.`id` AS CHAR CHARACTER SET ascii),
      JSON_OBJECT('history_format', 1, 'record_version', NEW.version,
        'before', JSON_OBJECT('id', OLD.`id`, 'name', OLD.`name`, 'plate', OLD.`plate`, 'plate_key', OLD.`plate_key`, 'body_type', OLD.`body_type`, 'service_type', OLD.`service_type`, 'passenger_capacity', OLD.`passenger_capacity`, 'cargo_capacity', OLD.`cargo_capacity`, 'has_fridge', OLD.`has_fridge`, 'fridge_capacity', OLD.`fridge_capacity`, 'shift_start', OLD.`shift_start`, 'shift_end', OLD.`shift_end`, 'ownership', OLD.`ownership`, 'contractor_name', OLD.`contractor_name`, 'status', OLD.`status`, 'version', OLD.`version`, 'deleted_at', OLD.`deleted_at`, 'created_at', OLD.`created_at`, 'vehicle_type_id', OLD.`vehicle_type_id`, 'edited_at', OLD.`edited_at`), 'after', JSON_OBJECT('id', NEW.`id`, 'name', NEW.`name`, 'plate', NEW.`plate`, 'plate_key', NEW.`plate_key`, 'body_type', NEW.`body_type`, 'service_type', NEW.`service_type`, 'passenger_capacity', NEW.`passenger_capacity`, 'cargo_capacity', NEW.`cargo_capacity`, 'has_fridge', NEW.`has_fridge`, 'fridge_capacity', NEW.`fridge_capacity`, 'shift_start', NEW.`shift_start`, 'shift_end', NEW.`shift_end`, 'ownership', NEW.`ownership`, 'contractor_name', NEW.`contractor_name`, 'status', NEW.`status`, 'version', NEW.`version`, 'deleted_at', NEW.`deleted_at`, 'created_at', NEW.`created_at`, 'vehicle_type_id', NEW.`vehicle_type_id`, 'edited_at', NEW.`edited_at`), 'password_changed', FALSE,
        'db_account', USER(), 'change_id', @behmasir_change_id));
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh3_vehicles_bd` BEFORE DELETE ON `vehicles` FOR EACH ROW BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Physical delete is blocked for history-protected records.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `workflow_grants`
--

DROP TABLE IF EXISTS `workflow_grants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_grants` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `capability` varchar(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `include_descendants` tinyint(1) NOT NULL DEFAULT '0',
  `relationship` varchar(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'ordinary',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wg_user_unit_cap` (`user_id`,`unit_id`,`capability`),
  KEY `fk_wg_unit` (`unit_id`),
  CONSTRAINT `fk_wg_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `fk_wg_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_wg_cap` CHECK ((`capability` in (_utf8mb4'workflow.create',_utf8mb4'workflow.create_for_others',_utf8mb4'workflow.configure_approvers',_utf8mb4'workflow.unit_approve',_utf8mb4'workflow.fleet_approve',_utf8mb4'workflow.dispatch.org',_utf8mb4'workflow.dispatch.contractor',_utf8mb4'workflow.configure_sections'))),
  CONSTRAINT `ck_wg_flags` CHECK (((`active` in (0,1)) and (`include_descendants` in (0,1)))),
  CONSTRAINT `ck_wg_relationship` CHECK ((`relationship` in (_utf8mb4'ordinary',_utf8mb4'superior',_utf8mb4'independent_peer')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wg_bi` BEFORE INSERT ON `workflow_grants` FOR EACH ROW BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wg_ai` AFTER INSERT ON `workflow_grants` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wg_create','workflow_grants',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'unit_id',NEW.`unit_id`,'capability',NEW.`capability`,'include_descendants',NEW.`include_descendants`,'relationship',NEW.`relationship`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wg_bu` BEFORE UPDATE ON `workflow_grants` FOR EACH ROW BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`) AND (OLD.`user_id` <=> NEW.`user_id`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`capability` <=> NEW.`capability`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`include_descendants` <=> NEW.`include_descendants`) AND (OLD.`relationship` <=> NEW.`relationship`) AND (OLD.`active` <=> NEW.`active`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wg_au` AFTER UPDATE ON `workflow_grants` FOR EACH ROW BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wg_update','workflow_grants',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'user_id',OLD.`user_id`,'unit_id',OLD.`unit_id`,'capability',OLD.`capability`,'include_descendants',OLD.`include_descendants`,'relationship',OLD.`relationship`,'active',OLD.`active`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'user_id',NEW.`user_id`,'unit_id',NEW.`unit_id`,'capability',NEW.`capability`,'include_descendants',NEW.`include_descendants`,'relationship',NEW.`relationship`,'active',NEW.`active`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wg_bd` BEFORE DELETE ON `workflow_grants` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `workflow_requests`
--

DROP TABLE IF EXISTS `workflow_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `creator_id` int unsigned NOT NULL,
  `beneficiary_id` int unsigned NOT NULL,
  `unit_id` int unsigned NOT NULL,
  `origin_id` int unsigned NOT NULL,
  `destination_id` int unsigned NOT NULL,
  `service_date` date NOT NULL,
  `service_time` time NOT NULL,
  `needs` varchar(500) NOT NULL,
  `state` varchar(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `content_version` int unsigned NOT NULL DEFAULT '1',
  `unit_approval` json DEFAULT NULL,
  `fleet_approval` json DEFAULT NULL,
  `ownership` varchar(16) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `transport_request_id` int unsigned DEFAULT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wr_transport` (`transport_request_id`),
  KEY `fk_wr_origin_id` (`origin_id`),
  KEY `fk_wr_destination_id` (`destination_id`),
  KEY `ix_wr_queue` (`unit_id`,`state`,`id`),
  KEY `ix_wr_creator` (`creator_id`,`id`),
  KEY `ix_wr_beneficiary` (`beneficiary_id`,`id`),
  CONSTRAINT `fk_wr_beneficiary_id` FOREIGN KEY (`beneficiary_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_wr_creator_id` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_wr_destination_id` FOREIGN KEY (`destination_id`) REFERENCES `centers` (`id`),
  CONSTRAINT `fk_wr_origin_id` FOREIGN KEY (`origin_id`) REFERENCES `centers` (`id`),
  CONSTRAINT `fk_wr_transport_request_id` FOREIGN KEY (`transport_request_id`) REFERENCES `transport_requests` (`id`),
  CONSTRAINT `fk_wr_unit_id` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  CONSTRAINT `ck_wr_content_version` CHECK ((`content_version` >= 1)),
  CONSTRAINT `ck_wr_operational` CHECK ((((`state` in (_utf8mb4'scheduled',_utf8mb4'enroute',_utf8mb4'delivered')) and (`transport_request_id` is not null) and (`ownership` is not null) and (`unit_approval` is not null) and (`fleet_approval` is not null)) or ((`state` not in (_utf8mb4'scheduled',_utf8mb4'enroute',_utf8mb4'delivered')) and (`transport_request_id` is null)))),
  CONSTRAINT `ck_wr_owner` CHECK (((`ownership` is null) or (`ownership` in (_utf8mb4'org',_utf8mb4'contractor')))),
  CONSTRAINT `ck_wr_route` CHECK ((`origin_id` <> `destination_id`)),
  CONSTRAINT `ck_wr_state` CHECK ((`state` in (_utf8mb4'awaiting_approver',_utf8mb4'awaiting_unit',_utf8mb4'awaiting_fleet',_utf8mb4'awaiting_dispatch',_utf8mb4'returned',_utf8mb4'rejected',_utf8mb4'cancelled',_utf8mb4'scheduled',_utf8mb4'enroute',_utf8mb4'delivered')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wr_bi` BEFORE INSERT ON `workflow_requests` FOR EACH ROW BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wr_ai` AFTER INSERT ON `workflow_requests` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wr_create','workflow_requests',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'creator_id',NEW.`creator_id`,'beneficiary_id',NEW.`beneficiary_id`,'unit_id',NEW.`unit_id`,'origin_id',NEW.`origin_id`,'destination_id',NEW.`destination_id`,'service_date',NEW.`service_date`,'service_time',NEW.`service_time`,'needs',NEW.`needs`,'state',NEW.`state`,'content_version',NEW.`content_version`,'unit_approval',NEW.`unit_approval`,'fleet_approval',NEW.`fleet_approval`,'ownership',NEW.`ownership`,'transport_request_id',NEW.`transport_request_id`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wr_bu` BEFORE UPDATE ON `workflow_requests` FOR EACH ROW BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`) AND (OLD.`creator_id` <=> NEW.`creator_id`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`beneficiary_id` <=> NEW.`beneficiary_id`) AND (OLD.`unit_id` <=> NEW.`unit_id`) AND (OLD.`origin_id` <=> NEW.`origin_id`) AND (OLD.`destination_id` <=> NEW.`destination_id`) AND (OLD.`service_date` <=> NEW.`service_date`) AND (OLD.`service_time` <=> NEW.`service_time`) AND (OLD.`needs` <=> NEW.`needs`) AND (OLD.`state` <=> NEW.`state`) AND (OLD.`content_version` <=> NEW.`content_version`) AND (OLD.`unit_approval` <=> NEW.`unit_approval`) AND (OLD.`fleet_approval` <=> NEW.`fleet_approval`) AND (OLD.`ownership` <=> NEW.`ownership`) AND (OLD.`transport_request_id` <=> NEW.`transport_request_id`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wr_au` AFTER UPDATE ON `workflow_requests` FOR EACH ROW BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.wr_update','workflow_requests',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'creator_id',OLD.`creator_id`,'beneficiary_id',OLD.`beneficiary_id`,'unit_id',OLD.`unit_id`,'origin_id',OLD.`origin_id`,'destination_id',OLD.`destination_id`,'service_date',OLD.`service_date`,'service_time',OLD.`service_time`,'needs',OLD.`needs`,'state',OLD.`state`,'content_version',OLD.`content_version`,'unit_approval',OLD.`unit_approval`,'fleet_approval',OLD.`fleet_approval`,'ownership',OLD.`ownership`,'transport_request_id',OLD.`transport_request_id`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'creator_id',NEW.`creator_id`,'beneficiary_id',NEW.`beneficiary_id`,'unit_id',NEW.`unit_id`,'origin_id',NEW.`origin_id`,'destination_id',NEW.`destination_id`,'service_date',NEW.`service_date`,'service_time',NEW.`service_time`,'needs',NEW.`needs`,'state',NEW.`state`,'content_version',NEW.`content_version`,'unit_approval',NEW.`unit_approval`,'fleet_approval',NEW.`fleet_approval`,'ownership',NEW.`ownership`,'transport_request_id',NEW.`transport_request_id`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_wr_bd` BEFORE DELETE ON `workflow_requests` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `workflow_settings`
--

DROP TABLE IF EXISTS `workflow_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_settings` (
  `id` tinyint NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `org_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `contractor_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `version` int unsigned NOT NULL DEFAULT '1',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `edited_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_ws_flags` CHECK (((`enabled` in (0,1)) and (`org_enabled` in (0,1)) and (`contractor_enabled` in (0,1)))),
  CONSTRAINT `ck_ws_id` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_ws_bi` BEFORE INSERT ON `workflow_settings` FOR EACH ROW BEGIN
SET NEW.version=1; SET NEW.edited_at=NULL; SET NEW.created_at=UTC_TIMESTAMP(3);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_ws_ai` AFTER INSERT ON `workflow_settings` FOR EACH ROW BEGIN
INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.ws_create','workflow_settings',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',NULL,'after',JSON_OBJECT('id',NEW.`id`,'enabled',NEW.`enabled`,'org_enabled',NEW.`org_enabled`,'contractor_enabled',NEW.`contractor_enabled`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER()));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_ws_bu` BEFORE UPDATE ON `workflow_settings` FOR EACH ROW BEGIN
IF NOT ((OLD.`id` <=> NEW.`id`) AND (OLD.`created_at` <=> NEW.`created_at`)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow identity and creation time are immutable.'; END IF;
IF (OLD.`enabled` <=> NEW.`enabled`) AND (OLD.`org_enabled` <=> NEW.`org_enabled`) AND (OLD.`contractor_enabled` <=> NEW.`contractor_enabled`) THEN SET NEW.version=OLD.version; SET NEW.edited_at=OLD.edited_at; ELSE SET NEW.version=OLD.version+1; SET NEW.edited_at=UTC_TIMESTAMP(3); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_ws_au` AFTER UPDATE ON `workflow_settings` FOR EACH ROW BEGIN
IF NEW.version<>OLD.version THEN INSERT INTO audit_log(actor_id,action,entity_type,entity_id,payload) VALUES (@behmasir_actor_id,'workflow.ws_update','workflow_settings',NEW.id,JSON_OBJECT('workflow_format',1,'record_version',NEW.version,'before',JSON_OBJECT('id',OLD.`id`,'enabled',OLD.`enabled`,'org_enabled',OLD.`org_enabled`,'contractor_enabled',OLD.`contractor_enabled`,'version',OLD.`version`,'created_at',OLD.`created_at`,'edited_at',OLD.`edited_at`),'after',JSON_OBJECT('id',NEW.`id`,'enabled',NEW.`enabled`,'org_enabled',NEW.`org_enabled`,'contractor_enabled',NEW.`contractor_enabled`,'version',NEW.`version`,'created_at',NEW.`created_at`,'edited_at',NEW.`edited_at`),'change_id',@behmasir_change_id,'db_account',USER())); END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bh5_ws_bd` BEFORE DELETE ON `workflow_settings` FOR EACH ROW BEGIN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Workflow physical deletion blocked; preserve audit history.';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping events for database 'behmasir_pilot'
--

--
-- Dumping routines for database 'behmasir_pilot'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-06 23:14:01
