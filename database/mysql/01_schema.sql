
-- =====================================================
-- DISASTER RELIEF MANAGEMENT SYSTEM
-- FILE: 01_schema.sql
-- MEMBER 1: CORE MYSQL SCHEMA
-- MySQL 8.0+
-- =====================================================

CREATE DATABASE IF NOT EXISTS disaster_relief_db;
USE disaster_relief_db;

-- 1. USERS
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'COORDINATOR', 'VOLUNTEER')
        NOT NULL DEFAULT 'VOLUNTEER',
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- 2. DISASTERS
CREATE TABLE disasters (
    disaster_id INT AUTO_INCREMENT PRIMARY KEY,
    disaster_name VARCHAR(150) NOT NULL,
    disaster_type ENUM(
        'FLOOD', 'EARTHQUAKE', 'CYCLONE',
        'LANDSLIDE', 'FIRE', 'OTHER'
    ) NOT NULL,
    severity TINYINT NOT NULL,
    description TEXT,
    status ENUM('ACTIVE', 'CONTAINED', 'RESOLVED')
        NOT NULL DEFAULT 'ACTIVE',
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_disaster_severity
        CHECK (severity BETWEEN 1 AND 5),

    FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- 3. AFFECTED AREAS
CREATE TABLE affected_areas (
    area_id INT AUTO_INCREMENT PRIMARY KEY,
    disaster_id INT NOT NULL,
    area_name VARCHAR(150) NOT NULL,
    population_affected INT NOT NULL DEFAULT 0,
    severity TINYINT NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_area_population
        CHECK (population_affected >= 0),

    CONSTRAINT chk_area_severity
        CHECK (severity BETWEEN 1 AND 5),

    FOREIGN KEY (disaster_id)
        REFERENCES disasters(disaster_id)
        ON DELETE CASCADE
);

-- 4. RELIEF CAMPS
CREATE TABLE camps (
    camp_id INT AUTO_INCREMENT PRIMARY KEY,
    area_id INT NOT NULL,
    camp_name VARCHAR(150) NOT NULL,
    location_description VARCHAR(255),
    capacity INT NOT NULL,
    current_occupancy INT NOT NULL DEFAULT 0,
    contact_number VARCHAR(20),
    status ENUM('ACTIVE', 'FULL', 'CLOSED')
        NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_camp_capacity
        CHECK (capacity > 0),

    CONSTRAINT chk_camp_occupancy
        CHECK (
            current_occupancy >= 0
            AND current_occupancy <= capacity
        ),

    FOREIGN KEY (area_id)
        REFERENCES affected_areas(area_id)
        ON DELETE RESTRICT
);

-- 5. RESOURCES
CREATE TABLE resources (
    resource_id INT AUTO_INCREMENT PRIMARY KEY,
    resource_name VARCHAR(120) NOT NULL UNIQUE,
    category ENUM(
        'FOOD', 'WATER', 'MEDICINE',
        'CLOTHING', 'SHELTER', 'RESCUE', 'OTHER'
    ) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. INVENTORY
CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    location_type ENUM('WAREHOUSE', 'CAMP') NOT NULL,
    warehouse_name VARCHAR(150),
    camp_id INT,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    minimum_threshold INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_inventory_quantity
        CHECK (quantity >= 0),

    CONSTRAINT chk_inventory_reserved
        CHECK (
            reserved_quantity >= 0
            AND reserved_quantity <= quantity
        ),

    CONSTRAINT chk_inventory_threshold
        CHECK (minimum_threshold >= 0),

    CONSTRAINT chk_inventory_location
        CHECK (
            (location_type = 'WAREHOUSE'
             AND warehouse_name IS NOT NULL
             AND camp_id IS NULL)
            OR
            (location_type = 'CAMP'
             AND camp_id IS NOT NULL
             AND warehouse_name IS NULL)
        ),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    FOREIGN KEY (camp_id)
        REFERENCES camps(camp_id),

    UNIQUE KEY uq_warehouse_resource
        (resource_id, warehouse_name),

    UNIQUE KEY uq_camp_resource
        (resource_id, camp_id)
);

-- 7. RESOURCE REQUESTS
CREATE TABLE resource_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    camp_id INT NOT NULL,
    resource_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_approved INT NOT NULL DEFAULT 0,
    affected_population INT NOT NULL DEFAULT 0,
    urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
        NOT NULL DEFAULT 'MEDIUM',
    priority_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    status ENUM(
        'PENDING', 'APPROVED', 'PARTIALLY_ALLOCATED',
        'ALLOCATED', 'REJECTED', 'COMPLETED'
    ) NOT NULL DEFAULT 'PENDING',
    request_description TEXT,
    requested_by INT,
    assigned_coordinator INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_request_quantity
        CHECK (quantity_requested > 0),

    CONSTRAINT chk_approved_quantity
        CHECK (
            quantity_approved >= 0
            AND quantity_approved <= quantity_requested
        ),

    CONSTRAINT chk_affected_population
        CHECK (affected_population >= 0),

    CONSTRAINT chk_priority_score
        CHECK (priority_score BETWEEN 0 AND 100),

    FOREIGN KEY (camp_id)
        REFERENCES camps(camp_id),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    FOREIGN KEY (requested_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    FOREIGN KEY (assigned_coordinator)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- 8. ALLOCATIONS
CREATE TABLE allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    inventory_id INT NOT NULL,
    allocated_quantity INT NOT NULL,
    allocated_by INT,
    allocation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM(
        'RESERVED', 'DISPATCHED',
        'CANCELLED', 'DELIVERED'
    ) NOT NULL DEFAULT 'RESERVED',

    CONSTRAINT chk_allocation_quantity
        CHECK (allocated_quantity > 0),

    FOREIGN KEY (request_id)
        REFERENCES resource_requests(request_id),

    FOREIGN KEY (inventory_id)
        REFERENCES inventory(inventory_id),

    FOREIGN KEY (allocated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- 9. DELIVERIES
CREATE TABLE deliveries (
    delivery_id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_id INT NOT NULL UNIQUE,
    delivery_status ENUM(
        'REQUESTED', 'APPROVED', 'ALLOCATED',
        'DISPATCHED', 'IN_TRANSIT',
        'DELIVERED', 'CONFIRMED'
    ) NOT NULL DEFAULT 'REQUESTED',
    dispatched_at DATETIME,
    delivered_at DATETIME,
    confirmed_at DATETIME,
    delivery_notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (allocation_id)
        REFERENCES allocations(allocation_id)
);

-- 10. TRANSACTIONAL EVENT OUTBOX
CREATE TABLE event_outbox (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(60) NOT NULL,
    aggregate_id INT NOT NULL,
    payload JSON NOT NULL,
    status ENUM(
        'PENDING', 'PROCESSING',
        'PUBLISHED', 'FAILED'
    ) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    last_error TEXT,

    INDEX idx_outbox_status_created (status, created_at)
);

-- =====================================================
-- END OF CORE SCHEMA
-- =====================================================
