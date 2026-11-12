
-- ============================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 06_views.sql
-- MEMBER 1: DATABASE VIEWS AND ANALYTICAL QUERIES
-- MySQL 8.0+
-- ============================================================

USE disaster_relief_db;

-- ============================================================
-- VIEW 1: INVENTORY AVAILABILITY
-- Shows warehouse-wise and camp-wise stock availability.
-- ============================================================

CREATE OR REPLACE VIEW vw_inventory_availability AS
SELECT
    i.inventory_id,
    r.resource_id,
    r.resource_name,
    r.category,
    r.unit,
    i.location_type,
    i.warehouse_name,
    i.camp_id,
    c.camp_name,

    CASE
        WHEN i.location_type = 'WAREHOUSE'
            THEN i.warehouse_name
        ELSE c.camp_name
    END AS location_name,

    i.quantity AS total_quantity,
    i.reserved_quantity,
    (i.quantity - i.reserved_quantity)
        AS available_quantity,
    i.minimum_threshold,

    CASE
        WHEN (i.quantity - i.reserved_quantity)
             <= i.minimum_threshold
            THEN 'LOW_STOCK'
        ELSE 'ADEQUATE'
    END AS stock_status

FROM inventory i
JOIN resources r
    ON i.resource_id = r.resource_id
LEFT JOIN camps c
    ON i.camp_id = c.camp_id;


-- ============================================================
-- VIEW 2: REQUEST PRIORITY RANKING
-- Ranks emergency requests using their priority scores.
-- ============================================================

CREATE OR REPLACE VIEW vw_request_priority_ranking AS
SELECT
    rr.request_id,
    rr.request_description,
    rr.urgency,
    rr.priority_score,

    RANK() OVER (
        ORDER BY rr.priority_score DESC
    ) AS priority_rank,

    rr.quantity_requested,
    rr.quantity_approved,

    (rr.quantity_requested - rr.quantity_approved)
        AS remaining_quantity,

    rr.affected_population,
    rr.status,

    c.camp_id,
    c.camp_name,

    aa.area_name,
    d.disaster_id,
    d.disaster_name,
    d.disaster_type,
    d.severity AS disaster_severity,

    r.resource_name,
    r.category AS resource_category,
    r.unit,

    u.full_name AS assigned_coordinator,

    rr.created_at

FROM resource_requests rr
JOIN camps c
    ON rr.camp_id = c.camp_id
JOIN affected_areas aa
    ON c.area_id = aa.area_id
JOIN disasters d
    ON aa.disaster_id = d.disaster_id
JOIN resources r
    ON rr.resource_id = r.resource_id
LEFT JOIN users u
    ON rr.assigned_coordinator = u.user_id;


-- ============================================================
-- VIEW 3: CAMP RESOURCE SUMMARY
-- Shows inventory and request information for each
-- camp-resource combination.
-- ============================================================

CREATE OR REPLACE VIEW vw_camp_resource_summary AS

SELECT
    c.camp_id,
    c.camp_name,
    aa.area_name,
    d.disaster_name,

    r.resource_id,
    r.resource_name,
    r.category,
    r.unit,

    COALESCE(inv.total_quantity, 0)
        AS total_quantity,

    COALESCE(inv.reserved_quantity, 0)
        AS reserved_quantity,

    COALESCE(inv.available_quantity, 0)
        AS available_quantity,

    COALESCE(inv.minimum_threshold, 0)
        AS minimum_threshold,

    COALESCE(req.total_requests, 0)
        AS total_requests,

    COALESCE(req.total_requested, 0)
        AS total_requested,

    COALESCE(req.total_approved, 0)
        AS total_approved,

    CASE
        WHEN COALESCE(inv.available_quantity, 0)
             <= COALESCE(inv.minimum_threshold, 0)
            THEN 'LOW_STOCK'
        ELSE 'ADEQUATE'
    END AS stock_status

FROM camps c

JOIN affected_areas aa
    ON c.area_id = aa.area_id

JOIN disasters d
    ON aa.disaster_id = d.disaster_id

JOIN (
    SELECT camp_id, resource_id
    FROM inventory
    WHERE location_type = 'CAMP'

    UNION

    SELECT camp_id, resource_id
    FROM resource_requests
) combinations

    ON combinations.camp_id = c.camp_id

JOIN resources r
    ON combinations.resource_id = r.resource_id

LEFT JOIN (
    SELECT
        camp_id,
        resource_id,
        SUM(quantity) AS total_quantity,
        SUM(reserved_quantity) AS reserved_quantity,
        SUM(quantity - reserved_quantity)
            AS available_quantity,
        MAX(minimum_threshold) AS minimum_threshold

    FROM inventory
    WHERE location_type = 'CAMP'

    GROUP BY camp_id, resource_id
) inv

    ON inv.camp_id = c.camp_id
    AND inv.resource_id = r.resource_id

LEFT JOIN (
    SELECT
        camp_id,
        resource_id,
        COUNT(*) AS total_requests,
        SUM(quantity_requested) AS total_requested,
        SUM(quantity_approved) AS total_approved

    FROM resource_requests

    GROUP BY camp_id, resource_id
) req

    ON req.camp_id = c.camp_id
    AND req.resource_id = r.resource_id;


-- ============================================================
-- VIEW 4: DELIVERY TRACKING
-- Shows allocation and delivery lifecycle information.
-- ============================================================

CREATE OR REPLACE VIEW vw_delivery_tracking AS

SELECT
    del.delivery_id,

    a.allocation_id,
    a.request_id,
    a.allocated_quantity,
    a.status AS allocation_status,
    a.allocation_date,

    rr.request_description,
    rr.urgency,
    rr.priority_score,

    c.camp_id,
    c.camp_name,

    r.resource_name,
    r.unit,

    i.location_type,

    CASE
        WHEN i.location_type = 'WAREHOUSE'
            THEN i.warehouse_name
        ELSE source_camp.camp_name
    END AS source_location,

    allocator.full_name AS allocated_by,

    del.delivery_status,
    del.dispatched_at,
    del.delivered_at,
    del.confirmed_at,
    del.delivery_notes,
    del.updated_at

FROM deliveries del

JOIN allocations a
    ON del.allocation_id = a.allocation_id

JOIN resource_requests rr
    ON a.request_id = rr.request_id

JOIN camps c
    ON rr.camp_id = c.camp_id

JOIN resources r
    ON rr.resource_id = r.resource_id

JOIN inventory i
    ON a.inventory_id = i.inventory_id

LEFT JOIN camps source_camp
    ON i.camp_id = source_camp.camp_id

LEFT JOIN users allocator
    ON a.allocated_by = allocator.user_id;


-- ============================================================
-- VIEW 5: DISASTER OVERVIEW
-- Provides disaster-wise operational statistics.
-- ============================================================

CREATE OR REPLACE VIEW vw_disaster_overview AS

SELECT
    d.disaster_id,
    d.disaster_name,
    d.disaster_type,
    d.severity,
    d.status AS disaster_status,
    d.start_date,

    COALESCE(areas.total_areas, 0)
        AS total_areas,

    COALESCE(areas.total_population_affected, 0)
        AS total_population_affected,

    COALESCE(camps.total_camps, 0)
        AS total_camps,

    COALESCE(requests.total_requests, 0)
        AS total_requests,

    COALESCE(requests.pending_requests, 0)
        AS pending_requests,

    COALESCE(requests.critical_requests, 0)
        AS critical_requests,

    COALESCE(requests.total_quantity_requested, 0)
        AS total_quantity_requested,

    COALESCE(requests.total_quantity_approved, 0)
        AS total_quantity_approved,

    COALESCE(delivery.total_deliveries, 0)
        AS total_deliveries,

    COALESCE(delivery.completed_deliveries, 0)
        AS completed_deliveries

FROM disasters d

LEFT JOIN (
    SELECT
        disaster_id,
        COUNT(*) AS total_areas,
        SUM(population_affected)
            AS total_population_affected
    FROM affected_areas
    GROUP BY disaster_id
) areas
    ON areas.disaster_id = d.disaster_id

LEFT JOIN (
    SELECT
        aa.disaster_id,
        COUNT(c.camp_id) AS total_camps
    FROM affected_areas aa
    JOIN camps c
        ON aa.area_id = c.area_id
    GROUP BY aa.disaster_id
) camps
    ON camps.disaster_id = d.disaster_id

LEFT JOIN (
    SELECT
        aa.disaster_id,
        COUNT(rr.request_id) AS total_requests,

        SUM(
            CASE
                WHEN rr.status = 'PENDING'
                    THEN 1 ELSE 0
            END
        ) AS pending_requests,

        SUM(
            CASE
                WHEN rr.urgency = 'CRITICAL'
                    THEN 1 ELSE 0
            END
        ) AS critical_requests,

        SUM(rr.quantity_requested)
            AS total_quantity_requested,

        SUM(rr.quantity_approved)
            AS total_quantity_approved

    FROM affected_areas aa

    JOIN camps c
        ON aa.area_id = c.area_id

    JOIN resource_requests rr
        ON c.camp_id = rr.camp_id

    GROUP BY aa.disaster_id
) requests
    ON requests.disaster_id = d.disaster_id

LEFT JOIN (
    SELECT
        aa.disaster_id,
        COUNT(del.delivery_id) AS total_deliveries,

        SUM(
            CASE
                WHEN del.delivery_status = 'CONFIRMED'
                    THEN 1 ELSE 0
            END
        ) AS completed_deliveries

    FROM affected_areas aa

    JOIN camps c
        ON aa.area_id = c.area_id

    JOIN resource_requests rr
        ON c.camp_id = rr.camp_id

    JOIN allocations a
        ON rr.request_id = a.request_id

    JOIN deliveries del
        ON a.allocation_id = del.allocation_id

    GROUP BY aa.disaster_id
) delivery
    ON delivery.disaster_id = d.disaster_id;


-- ============================================================
-- ANALYTICAL QUERIES
-- Demonstrates JOIN, GROUP BY, HAVING, ORDER BY,
-- subqueries and aggregate functions.
-- ============================================================


-- QUERY 1: HIGHEST PRIORITY EMERGENCY REQUESTS
-- JOIN + ORDER BY

SELECT
    request_id,
    disaster_name,
    camp_name,
    resource_name,
    urgency,
    priority_score,
    status
FROM vw_request_priority_ranking
ORDER BY priority_score DESC;


-- QUERY 2: TOTAL INVENTORY BY RESOURCE
-- JOIN + GROUP BY + SUM

SELECT
    resource_name,
    category,
    SUM(total_quantity) AS total_stock,
    SUM(reserved_quantity) AS reserved_stock,
    SUM(available_quantity) AS available_stock
FROM vw_inventory_availability
GROUP BY resource_id, resource_name, category
ORDER BY available_stock DESC;


-- QUERY 3: CAMPS WITH LOW RESOURCE STOCK
-- HAVING

SELECT
    camp_name,
    resource_name,
    available_quantity,
    minimum_threshold,
    stock_status
FROM vw_camp_resource_summary
WHERE stock_status = 'LOW_STOCK'
ORDER BY available_quantity ASC;


-- QUERY 4: REQUESTS ABOVE AVERAGE PRIORITY
-- SUBQUERY

SELECT
    request_id,
    request_description,
    priority_score,
    urgency
FROM resource_requests
WHERE priority_score > (
    SELECT AVG(priority_score)
    FROM resource_requests
)
ORDER BY priority_score DESC;


-- QUERY 5: DISASTER-WISE OPERATIONAL SUMMARY
-- GROUPED ANALYTICAL REPORT

SELECT
    disaster_name,
    disaster_type,
    total_areas,
    total_population_affected,
    total_camps,
    total_requests,
    pending_requests,
    critical_requests,
    total_deliveries,
    completed_deliveries
FROM vw_disaster_overview
ORDER BY severity DESC;


-- QUERY 6: RESOURCE REQUEST FULFILMENT
-- Aggregate calculations

SELECT
    resource_name,
    SUM(quantity_requested) AS requested_quantity,
    SUM(quantity_approved) AS approved_quantity,

    ROUND(
        SUM(quantity_approved) * 100.0 /
        NULLIF(SUM(quantity_requested), 0),
        2
    ) AS fulfilment_percentage

FROM vw_request_priority_ranking

GROUP BY resource_name
ORDER BY fulfilment_percentage ASC;


-- QUERY 7: CAMP OCCUPANCY ANALYSIS
-- Percentage calculation + filtering

SELECT
    camp_id,
    camp_name,
    capacity,
    current_occupancy,

    ROUND(
        current_occupancy * 100.0 / capacity,
        2
    ) AS occupancy_percentage,

    status

FROM camps

WHERE current_occupancy >= capacity * 0.75

ORDER BY occupancy_percentage DESC;


-- QUERY 8: REQUESTS WITH NO ALLOCATION
-- NOT EXISTS subquery

SELECT
    rr.request_id,
    rr.request_description,
    rr.priority_score,
    rr.status

FROM resource_requests rr

WHERE NOT EXISTS (
    SELECT 1
    FROM allocations a
    WHERE a.request_id = rr.request_id
)

ORDER BY rr.priority_score DESC;


-- ============================================================
-- END OF VIEWS AND ANALYTICAL QUERIES
-- ============================================================
