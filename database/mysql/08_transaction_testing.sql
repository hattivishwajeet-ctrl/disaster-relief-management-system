
USE disaster_relief_db;

-- ==========================================
-- TRANSACTION AND ROLLBACK TEST
-- ==========================================

-- 1. Start a transaction
START TRANSACTION;

-- 2. Insert a temporary test event
INSERT INTO event_outbox (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    status,
    attempts
)
VALUES (
    'transaction_test',
    'test',
    999999,
    JSON_OBJECT(
        'message', 'Testing transaction rollback',
        'test_id', 'TRANSACTION_ROLLBACK_TEST_01'
    ),
    'PENDING',
    0
);

-- 3. Verify that the event exists inside the transaction
SELECT *
FROM event_outbox
WHERE event_type = 'transaction_test'
  AND aggregate_id = 999999;

-- 4. Roll back the transaction
ROLLBACK;

-- 5. Verify that the inserted event no longer exists
SELECT *
FROM event_outbox
WHERE event_type = 'transaction_test'
  AND aggregate_id = 999999;

-- Expected: 0 rows returned
