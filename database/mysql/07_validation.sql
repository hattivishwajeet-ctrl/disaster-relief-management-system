
USE disaster_relief_db;

-- ==========================================
-- 1. VERIFY DATABASE TABLES
-- ==========================================

SHOW TABLES;

-- ==========================================
-- 2. VERIFY TABLE RECORD COUNTS
-- ==========================================

SELECT 'users' AS table_name, COUNT(*) AS total FROM users
UNION ALL
SELECT 'disasters', COUNT(*) FROM disasters
UNION ALL
SELECT 'affected_areas', COUNT(*) FROM affected_areas
UNION ALL
SELECT 'camps', COUNT(*) FROM camps
UNION ALL
SELECT 'resources', COUNT(*) FROM resources
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'resource_requests', COUNT(*) FROM resource_requests
UNION ALL
SELECT 'allocations', COUNT(*) FROM allocations
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries
UNION ALL
SELECT 'event_outbox', COUNT(*) FROM event_outbox;

-- ==========================================
-- 3. VERIFY ANALYTICAL VIEWS
-- ==========================================

SHOW FULL TABLES WHERE Table_type = 'VIEW';

SELECT * FROM vw_disaster_overview;
SELECT * FROM vw_inventory_availability;
SELECT * FROM vw_request_priority_ranking;
SELECT * FROM vw_camp_resource_summary;
SELECT * FROM vw_delivery_tracking;

-- ==========================================
-- 4. VERIFY REQUEST PRIORITY ORDER
-- ==========================================

SELECT
    request_id,
    urgency,
    priority_score,
    status
FROM resource_requests
ORDER BY priority_score DESC;

-- ==========================================
-- 5. VERIFY DELIVERY STATUS
-- ==========================================

SELECT
    delivery_id,
    allocation_id,
    delivery_status,
    dispatched_at,
    delivered_at,
    confirmed_at
FROM deliveries;

-- ==========================================
-- 6. VERIFY EVENT OUTBOX
-- ==========================================

SELECT
    event_id,
    event_type,
    aggregate_type,
    status,
    attempts
FROM event_outbox
ORDER BY event_id;
