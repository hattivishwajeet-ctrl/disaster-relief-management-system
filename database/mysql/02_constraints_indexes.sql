
-- =====================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 02_constraints_indexes.sql
-- MEMBER 1: DATABASE CONSTRAINTS AND INDEXES
-- =====================================================

USE disaster_relief_db;

-- 1. PERFORMANCE INDEXES

CREATE INDEX idx_disaster_status
ON disasters(status);

CREATE INDEX idx_disaster_type
ON disasters(disaster_type);

CREATE INDEX idx_area_disaster
ON affected_areas(disaster_id);

CREATE INDEX idx_camp_area
ON camps(area_id);

CREATE INDEX idx_camp_status
ON camps(status);

CREATE INDEX idx_inventory_resource
ON inventory(resource_id);

CREATE INDEX idx_inventory_camp
ON inventory(camp_id);

CREATE INDEX idx_request_camp_status
ON resource_requests(camp_id, status);

CREATE INDEX idx_request_priority
ON resource_requests(priority_score DESC);

CREATE INDEX idx_request_urgency
ON resource_requests(urgency);

CREATE INDEX idx_request_created
ON resource_requests(created_at);

CREATE INDEX idx_allocation_request
ON allocations(request_id);

CREATE INDEX idx_allocation_status
ON allocations(status);

CREATE INDEX idx_delivery_status
ON deliveries(delivery_status);

CREATE INDEX idx_user_role
ON users(role);

-- 2. BUSINESS VALIDATION CONSTRAINTS

ALTER TABLE resource_requests
ADD CONSTRAINT chk_request_approval_status
CHECK (
    status NOT IN ('APPROVED', 'PARTIALLY_ALLOCATED',
                   'ALLOCATED', 'COMPLETED')
    OR quantity_approved > 0
);

ALTER TABLE deliveries
ADD CONSTRAINT chk_delivery_timestamps
CHECK (
    (delivered_at IS NULL OR delivered_at >= dispatched_at)
    AND
    (confirmed_at IS NULL OR confirmed_at >= delivered_at)
);

ALTER TABLE event_outbox
ADD CONSTRAINT chk_outbox_attempts
CHECK (attempts >= 0);

-- 3. VERIFY INDEXES

SHOW INDEX FROM disasters;
SHOW INDEX FROM camps;
SHOW INDEX FROM inventory;
SHOW INDEX FROM resource_requests;
SHOW INDEX FROM allocations;
SHOW INDEX FROM deliveries;

-- =====================================================
-- END
-- =====================================================
