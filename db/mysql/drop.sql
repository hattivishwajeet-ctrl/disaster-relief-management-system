-- Destructive teardown within the selected project database.
DROP EVENT IF EXISTS escalate_unattended;
DROP VIEW IF EXISTS live_priority,request_details,stock_totals,stock_by_location,camp_directory;
DROP TRIGGER IF EXISTS stock_update;
DROP TRIGGER IF EXISTS stock_insert;
DROP TRIGGER IF EXISTS request_events;
DROP TRIGGER IF EXISTS request_guard;
DROP TRIGGER IF EXISTS request_insert_event;
DROP TRIGGER IF EXISTS request_insert_guard;
DROP PROCEDURE IF EXISTS allocate_request;
DROP PROCEDURE IF EXISTS recalculate_priority;
DROP PROCEDURE IF EXISTS stock_event;
DROP TABLE IF EXISTS notifications,
  camp_population_evidence,processed_reports,availability,volunteers,
  delivery_history,allocations,requests,inventory,resources,locations,affected_areas,disasters,users;
