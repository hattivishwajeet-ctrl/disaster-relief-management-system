CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role ENUM('admin','volunteer') DEFAULT NULL
);
CREATE TABLE disasters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5)
);
CREATE TABLE affected_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  disaster_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  UNIQUE (disaster_id,name),
  FOREIGN KEY (disaster_id) REFERENCES disasters(id)
);
CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT,
  name VARCHAR(120) NOT NULL UNIQUE,
  kind ENUM('warehouse','camp') NOT NULL,
  population INT NOT NULL DEFAULT 0 CHECK (population >= 0),
  CHECK ((kind='warehouse' AND area_id IS NULL AND population=0) OR (kind='camp' AND area_id IS NOT NULL)),
  FOREIGN KEY (area_id) REFERENCES affected_areas(id)
);
CREATE TABLE resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  unit VARCHAR(40) NOT NULL
);
CREATE TABLE inventory (
  location_id INT NOT NULL,
  resource_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  threshold INT NOT NULL CHECK (threshold >= 0),
  PRIMARY KEY (location_id,resource_id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);
CREATE TABLE requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  camp_id INT NOT NULL,
  resource_id INT NOT NULL,
  created_by INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  urgency INT NOT NULL CHECK (urgency BETWEEN 1 AND 5),
  priority INT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 100),
  critical BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('Requested','Approved','Allocated','Dispatched','In Transit','Delivered','Confirmed') NOT NULL DEFAULT 'Requested',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (camp_id) REFERENCES locations(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
ALTER TABLE requests ADD INDEX request_queue (status,priority DESC,created_at,id);
CREATE TABLE allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL UNIQUE,
  source_id INT NOT NULL,
  allocated_by INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (request_id) REFERENCES requests(id),
  FOREIGN KEY (source_id) REFERENCES locations(id),
  FOREIGN KEY (allocated_by) REFERENCES users(id)
);
CREATE TABLE delivery_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (request_id) REFERENCES requests(id)
);
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at DATETIME(3),
  INDEX outbox_pending (published_at,id)
);
CREATE VIEW camp_directory AS
SELECT l.id,l.name,l.population,a.id AS area_id,a.name AS area,d.id AS disaster_id,d.name AS disaster
FROM locations l JOIN affected_areas a ON a.id=l.area_id JOIN disasters d ON d.id=a.disaster_id
WHERE l.kind='camp';
CREATE VIEW stock_by_location AS
SELECT i.*,l.name AS location,l.kind,r.name AS resource,r.unit
FROM inventory i JOIN locations l ON l.id=i.location_id JOIN resources r ON r.id=i.resource_id;
CREATE VIEW stock_totals AS
SELECT r.id AS resource_id,r.name AS resource,r.unit,COALESCE(SUM(i.quantity),0) AS quantity
FROM resources r LEFT JOIN inventory i ON i.resource_id=r.id GROUP BY r.id,r.name,r.unit;
CREATE VIEW request_details AS
SELECT q.*,c.name AS camp,c.disaster_id,c.disaster,r.name AS resource,r.unit
FROM requests q JOIN camp_directory c ON c.id=q.camp_id JOIN resources r ON r.id=q.resource_id;
DELIMITER $$
CREATE TRIGGER request_insert_guard BEFORE INSERT ON requests FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM locations WHERE id=NEW.camp_id AND kind='camp')
     OR NEW.status <> 'Requested' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A new request must target a camp and start Requested';
  END IF;
END$$
CREATE TRIGGER request_insert_event AFTER INSERT ON requests FOR EACH ROW
BEGIN
  INSERT INTO delivery_history(request_id,status) VALUES (NEW.id,NEW.status);
  INSERT INTO notifications(event_type,payload) VALUES ('request_created',JSON_OBJECT('requestId',NEW.id));
END$$
CREATE TRIGGER request_guard BEFORE UPDATE ON requests FOR EACH ROW
BEGIN
  IF NEW.camp_id <> OLD.camp_id OR NEW.resource_id <> OLD.resource_id OR NEW.quantity <> OLD.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Request camp, resource and quantity are immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status='Requested' AND NEW.status='Approved') OR
    (OLD.status='Approved' AND NEW.status='Allocated' AND EXISTS (SELECT 1 FROM allocations WHERE request_id=OLD.id)) OR
    (OLD.status='Allocated' AND NEW.status='Dispatched') OR
    (OLD.status='Dispatched' AND NEW.status='In Transit') OR
    (OLD.status='In Transit' AND NEW.status='Delivered') OR
    (OLD.status='Delivered' AND NEW.status='Confirmed')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid delivery transition';
  END IF;
  IF NEW.status IN ('Requested','Approved') AND NEW.priority >= 80
     AND NEW.created_at <= CURRENT_TIMESTAMP(3) - INTERVAL 15 MINUTE THEN
    SET NEW.critical=TRUE;
  END IF;
END$$
CREATE TRIGGER request_events AFTER UPDATE ON requests FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO delivery_history(request_id,status) VALUES (NEW.id,NEW.status);
    INSERT INTO notifications(event_type,payload) VALUES ('delivery_status_changed',
      JSON_OBJECT('requestId',NEW.id,'previousStatus',OLD.status,'status',NEW.status));
    IF NEW.status='Confirmed' THEN
      INSERT INTO inventory(location_id,resource_id,quantity,threshold)
        VALUES (NEW.camp_id,NEW.resource_id,NEW.quantity,0) AS receipt
        ON DUPLICATE KEY UPDATE quantity=inventory.quantity+receipt.quantity;
    END IF;
  END IF;
  IF NEW.priority <> OLD.priority THEN
    INSERT INTO notifications(event_type,payload) VALUES ('priority_updated',
      JSON_OBJECT('requestId',NEW.id,'previousPriority',OLD.priority,'priority',NEW.priority));
  END IF;
  IF NEW.critical AND NOT OLD.critical THEN
    INSERT INTO notifications(event_type,payload) VALUES ('critical_request',
      JSON_OBJECT('requestId',NEW.id,'priority',NEW.priority));
  END IF;
END$$
CREATE PROCEDURE stock_event(IN p_location INT, IN p_resource INT, IN p_qty INT, IN p_threshold INT, IN p_shortage BOOLEAN)
BEGIN
  INSERT INTO notifications(event_type,payload) VALUES ('inventory_updated',
    JSON_OBJECT('locationId',p_location,'resourceId',p_resource,'quantity',p_qty,'threshold',p_threshold));
  IF p_shortage THEN
    INSERT INTO notifications(event_type,payload) VALUES ('shortage_alert',
      JSON_OBJECT('locationId',p_location,'resourceId',p_resource,'quantity',p_qty,'threshold',p_threshold));
  END IF;
END$$
CREATE TRIGGER stock_insert AFTER INSERT ON inventory FOR EACH ROW
  CALL stock_event(NEW.location_id,NEW.resource_id,NEW.quantity,NEW.threshold,NEW.quantity<NEW.threshold)$$
CREATE TRIGGER stock_update AFTER UPDATE ON inventory FOR EACH ROW
BEGIN
  IF NEW.quantity <> OLD.quantity OR NEW.threshold <> OLD.threshold THEN
    CALL stock_event(NEW.location_id,NEW.resource_id,NEW.quantity,NEW.threshold,
      NEW.quantity<NEW.threshold AND OLD.quantity>=OLD.threshold);
  END IF;
END$$
CREATE EVENT escalate_unattended ON SCHEDULE EVERY 1 MINUTE DO
  UPDATE requests SET critical=TRUE
  WHERE status IN ('Requested','Approved') AND priority>=80 AND NOT critical
    AND created_at <= CURRENT_TIMESTAMP(3) - INTERVAL 15 MINUTE$$

CREATE PROCEDURE recalculate_priority(
  IN p_request INT, IN p_camp INT, IN p_resource INT, IN p_disaster INT
)
BEGIN
  UPDATE requests q
    JOIN locations l ON l.id=q.camp_id
    JOIN affected_areas a ON a.id=l.area_id
    JOIN disasters d ON d.id=a.disaster_id
    JOIN stock_totals s ON s.resource_id=q.resource_id
  SET q.priority=LEAST(100, d.severity*6 + LEAST(30,FLOOR(l.population/10)) +
    q.urgency*5 + FLOOR(15*GREATEST(0,1-s.quantity/q.quantity)))
  WHERE q.status IN ('Requested','Approved') AND (p_request IS NULL OR q.id=p_request)
    AND (p_camp IS NULL OR q.camp_id=p_camp) AND (p_resource IS NULL OR q.resource_id=p_resource)
    AND (p_disaster IS NULL OR d.id=p_disaster);
END$$

CREATE PROCEDURE allocate_request(IN p_request INT, IN p_source INT, IN p_actor INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_resource INT;
  DECLARE v_camp INT;
  DECLARE v_qty INT;
  DECLARE v_allocation INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT status,resource_id,camp_id,quantity INTO v_status,v_resource,v_camp,v_qty
    FROM requests WHERE id=p_request FOR UPDATE;
  IF v_status IS NULL OR v_status <> 'Approved' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Allocation requires an approved request';
  END IF;
  IF p_source=v_camp THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Choose a source outside the destination camp';
  END IF;
  UPDATE inventory SET quantity=quantity-v_qty
    WHERE location_id=p_source AND resource_id=v_resource AND quantity>=v_qty;
  IF ROW_COUNT() <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient stock at the selected location';
  END IF;
  INSERT INTO allocations(request_id,source_id,allocated_by) VALUES(p_request,p_source,p_actor);
  SET v_allocation=LAST_INSERT_ID();
  UPDATE requests SET status='Allocated' WHERE id=p_request;
  CALL recalculate_priority(NULL,NULL,v_resource,NULL);
  INSERT INTO notifications(event_type,payload) VALUES ('allocation_updated',
    JSON_OBJECT('allocationId',v_allocation,'requestId',p_request,'sourceId',p_source,'quantity',v_qty));
  COMMIT;
  SELECT v_allocation AS id;
END$$
DELIMITER ;
