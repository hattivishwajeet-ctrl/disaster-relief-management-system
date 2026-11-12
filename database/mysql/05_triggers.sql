
-- =====================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 05_triggers.sql
-- MEMBER 1: AUTOMATIC DATABASE TRIGGERS
-- MySQL 8.0+
-- =====================================================

USE disaster_relief_db;

DELIMITER $$

-- =====================================================
-- TRIGGER 1: SHORTAGE ALERT AFTER INVENTORY INSERT
-- =====================================================

DROP TRIGGER IF EXISTS trg_inventory_shortage_insert$$

CREATE TRIGGER trg_inventory_shortage_insert
AFTER INSERT ON inventory
FOR EACH ROW
BEGIN
    IF (NEW.quantity - NEW.reserved_quantity)
        <= NEW.minimum_threshold THEN

        INSERT INTO event_outbox (
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES (
            'shortage_alert',
            'inventory',
            NEW.inventory_id,
            JSON_OBJECT(
                'inventory_id', NEW.inventory_id,
                'resource_id', NEW.resource_id,
                'available_quantity',
                    NEW.quantity - NEW.reserved_quantity,
                'minimum_threshold', NEW.minimum_threshold
            )
        );
    END IF;
END$$


-- =====================================================
-- TRIGGER 2: SHORTAGE ALERT AFTER INVENTORY UPDATE
-- Fires when available stock crosses below threshold.
-- =====================================================

DROP TRIGGER IF EXISTS trg_inventory_shortage_update$$

CREATE TRIGGER trg_inventory_shortage_update
AFTER UPDATE ON inventory
FOR EACH ROW
BEGIN
    IF (OLD.quantity - OLD.reserved_quantity)
            > OLD.minimum_threshold
       AND
       (NEW.quantity - NEW.reserved_quantity)
            <= NEW.minimum_threshold THEN

        INSERT INTO event_outbox (
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES (
            'shortage_alert',
            'inventory',
            NEW.inventory_id,
            JSON_OBJECT(
                'inventory_id', NEW.inventory_id,
                'resource_id', NEW.resource_id,
                'available_quantity',
                    NEW.quantity - NEW.reserved_quantity,
                'minimum_threshold', NEW.minimum_threshold
            )
        );
    END IF;
END$$


-- =====================================================
-- TRIGGER 3: PRIORITY UPDATE EVENT
-- =====================================================

DROP TRIGGER IF EXISTS trg_request_priority_updated$$

CREATE TRIGGER trg_request_priority_updated
AFTER UPDATE ON resource_requests
FOR EACH ROW
BEGIN
    IF OLD.priority_score <> NEW.priority_score THEN

        INSERT INTO event_outbox (
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES (
            'priority_updated',
            'resource_request',
            NEW.request_id,
            JSON_OBJECT(
                'request_id', NEW.request_id,
                'old_priority', OLD.priority_score,
                'new_priority', NEW.priority_score,
                'urgency', NEW.urgency,
                'status', NEW.status
            )
        );

    END IF;
END$$


-- =====================================================
-- TRIGGER 4: CRITICAL REQUEST ESCALATION EVENT
-- =====================================================

DROP TRIGGER IF EXISTS trg_request_escalated$$

CREATE TRIGGER trg_request_escalated
AFTER UPDATE ON resource_requests
FOR EACH ROW
BEGIN
    IF (
        (OLD.urgency <> 'CRITICAL'
         AND NEW.urgency = 'CRITICAL')
        OR
        (OLD.priority_score < 90
         AND NEW.priority_score >= 90)
    ) THEN

        INSERT INTO event_outbox (
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES (
            'request_escalated',
            'resource_request',
            NEW.request_id,
            JSON_OBJECT(
                'request_id', NEW.request_id,
                'old_priority', OLD.priority_score,
                'new_priority', NEW.priority_score,
                'urgency', NEW.urgency,
                'status', NEW.status
            )
        );

    END IF;
END$$


-- =====================================================
-- TRIGGER 5: DELIVERY STATUS VALIDATION
-- =====================================================

DROP TRIGGER IF EXISTS trg_validate_delivery_transition$$

CREATE TRIGGER trg_validate_delivery_transition
BEFORE UPDATE ON deliveries
FOR EACH ROW
BEGIN
    IF OLD.delivery_status <> NEW.delivery_status THEN

        IF NOT (
            (OLD.delivery_status = 'REQUESTED'
             AND NEW.delivery_status = 'APPROVED')

            OR

            (OLD.delivery_status = 'APPROVED'
             AND NEW.delivery_status = 'ALLOCATED')

            OR

            (OLD.delivery_status = 'ALLOCATED'
             AND NEW.delivery_status = 'DISPATCHED')

            OR

            (OLD.delivery_status = 'DISPATCHED'
             AND NEW.delivery_status = 'IN_TRANSIT')

            OR

            (OLD.delivery_status = 'IN_TRANSIT'
             AND NEW.delivery_status = 'DELIVERED')

            OR

            (OLD.delivery_status = 'DELIVERED'
             AND NEW.delivery_status = 'CONFIRMED')
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Invalid delivery status transition';

        END IF;

    END IF;
END$$


-- =====================================================
-- TRIGGER 6: DELIVERY STATUS CHANGE EVENT
-- =====================================================

DROP TRIGGER IF EXISTS trg_delivery_status_changed$$

CREATE TRIGGER trg_delivery_status_changed
AFTER UPDATE ON deliveries
FOR EACH ROW
BEGIN
    IF OLD.delivery_status <> NEW.delivery_status THEN

        INSERT INTO event_outbox (
            event_type,
            aggregate_type,
            aggregate_id,
            payload
        )
        VALUES (
            'delivery_status_changed',
            'delivery',
            NEW.delivery_id,
            JSON_OBJECT(
                'delivery_id', NEW.delivery_id,
                'allocation_id', NEW.allocation_id,
                'old_status', OLD.delivery_status,
                'new_status', NEW.delivery_status
            )
        );

    END IF;
END$$

DELIMITER ;

-- =====================================================
-- END OF TRIGGERS
-- =====================================================
