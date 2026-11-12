
-- =====================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 03_seed_data.sql
-- MEMBER 1: DEMONSTRATION DATA
-- MySQL 8.0+
-- =====================================================

USE disaster_relief_db;

START TRANSACTION;

-- -----------------------------------------------------
-- 1. USERS
-- Password hashes below are DEMO placeholders.
-- Replace with actual bcrypt hashes before authentication.
-- -----------------------------------------------------

INSERT INTO users
(user_id, full_name, email, password_hash, role, phone)
VALUES
(1, 'System Administrator', 'admin@relief.com',
 'DEMO_HASH_REPLACE_BEFORE_PRODUCTION', 'ADMIN', '9876500001'),
(2, 'Rahul Sharma', 'coordinator@relief.com',
 'DEMO_HASH_REPLACE_BEFORE_PRODUCTION', 'COORDINATOR', '9876500002'),
(3, 'Priya Kumar', 'coordinator2@relief.com',
 'DEMO_HASH_REPLACE_BEFORE_PRODUCTION', 'COORDINATOR', '9876500003');

-- -----------------------------------------------------
-- 2. DISASTERS
-- Severity: 1 (Low) to 5 (Critical)
-- -----------------------------------------------------

INSERT INTO disasters
(disaster_id, disaster_name, disaster_type, severity,
 description, status, start_date, created_by)
VALUES
(1, 'Karnataka Flood Emergency 2026', 'FLOOD', 5,
 'Severe flooding affecting multiple communities.',
 'ACTIVE', '2026-11-10 06:00:00', 1),

(2, 'Coastal Cyclone Emergency 2026', 'CYCLONE', 4,
 'Cyclone-related damage requiring emergency relief.',
 'ACTIVE', '2026-11-11 08:00:00', 1);

-- -----------------------------------------------------
-- 3. AFFECTED AREAS
-- -----------------------------------------------------

INSERT INTO affected_areas
(area_id, disaster_id, area_name, population_affected,
 severity, latitude, longitude)
VALUES
(1, 1, 'Belagavi Flood Zone', 12000, 5, 15.8497, 74.4977),
(2, 1, 'Bagalkot Flood Zone', 8500, 4, 16.1725, 75.6557),
(3, 2, 'Coastal Relief Zone', 6000, 4, 14.4673, 74.1239);

-- -----------------------------------------------------
-- 4. RELIEF CAMPS
-- -----------------------------------------------------

INSERT INTO camps
(camp_id, area_id, camp_name, location_description,
 capacity, current_occupancy, contact_number, status)
VALUES
(1, 1, 'Belagavi Central Relief Camp',
 'Central relief distribution centre',
 2000, 1500, '9876510001', 'ACTIVE'),

(2, 1, 'Belagavi North Relief Camp',
 'Northern temporary shelter',
 1000, 850, '9876510002', 'ACTIVE'),

(3, 2, 'Bagalkot Community Camp',
 'Community relief and medical centre',
 1500, 900, '9876510003', 'ACTIVE'),

(4, 3, 'Coastal Emergency Camp',
 'Coastal emergency shelter',
 1200, 1100, '9876510004', 'ACTIVE');

-- -----------------------------------------------------
-- 5. RESOURCES
-- -----------------------------------------------------

INSERT INTO resources
(resource_id, resource_name, category, unit, description)
VALUES
(1, 'Drinking Water', 'WATER', 'Litres',
 'Safe drinking water'),

(2, 'Rice', 'FOOD', 'Kg',
 'Emergency food supply'),

(3, 'Medical Kits', 'MEDICINE', 'Kits',
 'First aid and emergency medical supplies'),

(4, 'Blankets', 'CLOTHING', 'Pieces',
 'Blankets for affected families'),

(5, 'Emergency Tents', 'SHELTER', 'Pieces',
 'Temporary emergency shelters');

-- -----------------------------------------------------
-- 6. INVENTORY
-- Warehouse inventory
-- -----------------------------------------------------

INSERT INTO inventory
(inventory_id, resource_id, location_type,
 warehouse_name, camp_id, quantity,
 reserved_quantity, minimum_threshold)
VALUES
(1, 1, 'WAREHOUSE', 'Belagavi Main Warehouse',
 NULL, 10000, 1000, 2000),

(2, 2, 'WAREHOUSE', 'Belagavi Main Warehouse',
 NULL, 8000, 500, 1500),

(3, 3, 'WAREHOUSE', 'Belagavi Main Warehouse',
 NULL, 500, 50, 100),

(4, 4, 'WAREHOUSE', 'Belagavi Main Warehouse',
 NULL, 2000, 100, 300),

(5, 5, 'WAREHOUSE', 'Belagavi Main Warehouse',
 NULL, 300, 20, 50),

(6, 1, 'WAREHOUSE', 'Bagalkot Warehouse',
 NULL, 1500, 100, 500),

(7, 2, 'WAREHOUSE', 'Bagalkot Warehouse',
 NULL, 2000, 100, 500);

-- -----------------------------------------------------
-- 7. CAMP INVENTORY
-- -----------------------------------------------------

INSERT INTO inventory
(inventory_id, resource_id, location_type,
 warehouse_name, camp_id, quantity,
 reserved_quantity, minimum_threshold)
VALUES
(8, 1, 'CAMP', NULL, 1, 400, 50, 200),
(9, 2, 'CAMP', NULL, 1, 250, 20, 100),
(10, 3, 'CAMP', NULL, 1, 15, 2, 20),
(11, 1, 'CAMP', NULL, 2, 100, 10, 150),
(12, 2, 'CAMP', NULL, 2, 80, 5, 100),
(13, 1, 'CAMP', NULL, 3, 300, 20, 150),
(14, 3, 'CAMP', NULL, 3, 30, 5, 15),
(15, 1, 'CAMP', NULL, 4, 100, 10, 150);

-- -----------------------------------------------------
-- 8. RESOURCE REQUESTS
-- Priority score will be recalculated by our procedure.
-- Request 1 starts at 70 for the escalation demonstration.
-- -----------------------------------------------------

INSERT INTO resource_requests
(request_id, camp_id, resource_id,
 quantity_requested, quantity_approved,
 affected_population, urgency, priority_score,
 status, request_description, requested_by,
 assigned_coordinator)
VALUES

(1, 1, 1, 5000, 0, 1500,
 'HIGH', 70.00, 'PENDING',
 'Urgent drinking water requirement for flood victims.',
 2, 2),

(2, 2, 2, 1000, 0, 600,
 'CRITICAL', 85.00, 'PENDING',
 'Emergency food requirement for displaced families.',
 2, 2),

(3, 3, 3, 150, 0, 120,
 'HIGH', 65.00, 'PENDING',
 'Medical kits required for injured residents.',
 3, 3),

(4, 4, 4, 800, 0, 400,
 'MEDIUM', 40.00, 'PENDING',
 'Blankets required for temporary shelter.',
 3, 3),

(5, 1, 5, 100, 0, 250,
 'HIGH', 75.00, 'PENDING',
 'Emergency tents required for displaced people.',
 2, 2);

COMMIT;

-- -----------------------------------------------------
-- 9. VERIFICATION QUERIES
-- -----------------------------------------------------

SELECT * FROM users;
SELECT * FROM disasters;
SELECT * FROM affected_areas;
SELECT * FROM camps;
SELECT * FROM resources;
SELECT * FROM inventory;
SELECT * FROM resource_requests;

-- Summary: inventory by resource
SELECT
    r.resource_name,
    SUM(i.quantity) AS total_quantity,
    SUM(i.reserved_quantity) AS total_reserved,
    SUM(i.quantity - i.reserved_quantity) AS available_quantity
FROM resources r
JOIN inventory i ON r.resource_id = i.resource_id
GROUP BY r.resource_id, r.resource_name;

-- Summary: requests by priority
SELECT
    request_id,
    request_description,
    urgency,
    priority_score,
    status
FROM resource_requests
ORDER BY priority_score DESC;

-- =====================================================
-- END OF SEED DATA
-- =====================================================
