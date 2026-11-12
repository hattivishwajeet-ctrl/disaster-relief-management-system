
-- =====================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 04_stored_procedures.sql
-- MEMBER 1: STORED PROCEDURES
-- MySQL 8.0+
-- =====================================================

USE disaster_relief_db;

DELIMITER $$

-- =====================================================
-- PROCEDURE 1: PRIORITY SCORE CALCULATION
-- =====================================================

DROP PROCEDURE IF EXISTS sp_calculate_priority$$

CREATE PROCEDURE sp_calculate_priority(
    IN p_request_id INT,
    IN p_report_bonus INT
)
BEGIN
    DECLARE v_urgency VARCHAR(20);
    DECLARE v_population INT;
    DECLARE v_severity INT;
    DECLARE v_urgency_score INT DEFAULT 0;
    DECLARE v_population_score INT DEFAULT 0;
    DECLARE v_final_score INT DEFAULT 0;

    -- Retrieve request and disaster information
    SELECT
        rr.urgency,
        rr.affected_population,
        d.severity
    INTO
        v_urgency,
        v_population,
        v_severity
    FROM resource_requests rr
    JOIN camps c ON rr.camp_id = c.camp_id
    JOIN affected_areas aa ON c.area_id = aa.area_id
    JOIN disasters d ON aa.disaster_id = d.disaster_id
    WHERE rr.request_id = p_request_id;

    -- Urgency score
    SET v_urgency_score =
        CASE v_urgency
            WHEN 'CRITICAL' THEN 50
            WHEN 'HIGH' THEN 40
            WHEN 'MEDIUM' THEN 25
            WHEN 'LOW' THEN 10
            ELSE 0
        END;

    -- Population score (maximum 15)
    SET v_population_score =
        LEAST(15, FLOOR(v_population / 100));

    -- Overall priority calculation
    SET v_final_score =
        LEAST(
            100,
            v_urgency_score
            + v_population_score
            + (v_severity * 3)
            + GREATEST(0, p_report_bonus)
        );

    -- Update request
    UPDATE resource_requests
    SET priority_score = v_final_score
    WHERE request_id = p_request_id;

    SELECT
        p_request_id AS request_id,
        v_urgency_score AS urgency_points,
        v_population_score AS population_points,
        v_severity * 3 AS disaster_points,
        GREATEST(0, p_report_bonus) AS report_bonus,
        v_final_score AS final_priority_score;
END$$


-- =====================================================
-- PROCEDURE 2: TRANSACTION-SAFE RESOURCE ALLOCATION
-- =====================================================

DROP PROCEDURE IF EXISTS sp_allocate_resource$$

CREATE PROCEDURE sp_allocate_resource(
    IN p_request_id INT,
    IN p_inventory_id INT,
    IN p_quantity INT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_requested INT DEFAULT 0;
    DECLARE v_approved INT DEFAULT 0;
    DECLARE v_stock INT DEFAULT 0;
    DECLARE v_reserved INT DEFAULT 0;
    DECLARE v_new_approved INT DEFAULT 0;
    DECLARE v_not_found INT DEFAULT 0;
    DECLARE v_allocation_id INT;

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET v_not_found = 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Allocation quantity must be positive';
    END IF;

    START TRANSACTION;

    -- Lock the request row
    SELECT quantity_requested, quantity_approved
    INTO v_requested, v_approved
    FROM resource_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Resource request not found';
    END IF;

    -- Lock the inventory row
    SET v_not_found = 0;

    SELECT quantity, reserved_quantity
    INTO v_stock, v_reserved
    FROM inventory
    WHERE inventory_id = p_inventory_id
    FOR UPDATE;

    IF v_not_found = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Inventory record not found';
    END IF;

    -- Check available inventory
    IF (v_stock - v_reserved) < p_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient available inventory';
    END IF;

    -- Check remaining request quantity
    IF (v_requested - v_approved) < p_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Allocation exceeds remaining request';
    END IF;

    SET v_new_approved = v_approved + p_quantity;

    -- Create allocation record
    INSERT INTO allocations (
        request_id,
        inventory_id,
        allocated_quantity,
        allocated_by,
        status
    )
    VALUES (
        p_request_id,
        p_inventory_id,
        p_quantity,
        p_user_id,
        'RESERVED'
    );

    SET v_allocation_id = LAST_INSERT_ID();

    -- Reserve inventory
    UPDATE inventory
    SET reserved_quantity = reserved_quantity + p_quantity
    WHERE inventory_id = p_inventory_id;

    -- Update request progress
    UPDATE resource_requests
    SET
        quantity_approved = v_new_approved,
        status = CASE
            WHEN v_new_approved = v_requested
                THEN 'ALLOCATED'
            ELSE 'PARTIALLY_ALLOCATED'
        END
    WHERE request_id = p_request_id;

    -- Create delivery tracking record
    INSERT INTO deliveries (
        allocation_id,
        delivery_status
    )
    VALUES (
        v_allocation_id,
        'ALLOCATED'
    );

    COMMIT;

    SELECT
        v_allocation_id AS allocation_id,
        p_request_id AS request_id,
        p_quantity AS allocated_quantity,
        'RESERVED' AS allocation_status,
        'ALLOCATED' AS delivery_status,
        'SUCCESS' AS result;
END$$

DELIMITER ;

-- =====================================================
-- END OF STORED PROCEDURES
-- =====================================================
