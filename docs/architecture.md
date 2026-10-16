# System Architecture

## 1. Overview

The Disaster Relief Resource Allocation and Emergency Response Management System follows a modular web application architecture. It combines a Next.js frontend, a Node.js and Express backend, MySQL for structured relational data, MongoDB for flexible emergency reports, and WebSockets for real-time updates.

## 2. Architecture Components

### 2.1 Frontend — Next.js

The frontend provides interfaces for three user roles:

- **Administrator:** Manages users, disasters, system configuration, and overall operations.
- **Relief Coordinator:** Monitors requests, priorities, inventory, allocations, and deliveries.
- **Volunteer:** Submits emergency reports and field observations and updates relevant availability information.

The frontend communicates with the backend through authenticated API requests and receives live updates through the real-time communication layer.

### 2.2 Backend — Node.js and Express

The backend implements the application's business logic and API endpoints.

Responsibilities include:

- Authentication and authorization.
- Disaster and resource management.
- Request-priority calculation and recalculation.
- Transaction-safe resource allocation.
- Delivery lifecycle management.
- Escalation and shortage-alert rules.
- Integration with MySQL and MongoDB.
- Publishing relevant events to connected clients.

### 2.3 MySQL — Relational Data

MySQL stores structured information requiring relational integrity.

Expected entities include:

- Users and volunteers.
- Disasters and affected areas.
- Relief camps.
- Resources and inventory locations.
- Resource requests.
- Allocations and deliveries.

Transactions shall protect allocation operations. Stored procedures, triggers, views, and indexes shall be introduced where appropriate to meet the project's database requirements.

### 2.4 MongoDB — Emergency Reports

MongoDB stores emergency reports and field observations submitted by volunteers.

Reports may contain different fields depending on the type of incident. Aggregation pipelines can summarize reports by disaster, location, incident type, or severity.

### 2.5 Real-Time Communication

Socket.IO over WebSockets is the proposed mechanism for sending updates to connected dashboards.

MongoDB Change Streams will detect relevant changes to emergency reports. A backend event handler will process those changes and publish appropriate updates to authorized clients.

Other application events, such as allocation changes and inventory shortages, can be published by the backend after the corresponding database operation succeeds.

## 3. High-Level Data Flow

1. A user signs in and opens the appropriate role-based dashboard.
2. The frontend requests authorized data from the backend.
3. The backend retrieves structured records from MySQL and emergency reports from MongoDB.
4. A new resource request is evaluated using the configured priority-scoring rules.
5. When a coordinator allocates resources, the backend executes a transaction that maintains inventory and allocation consistency.
6. The backend publishes relevant updates to connected dashboards.
7. When a new emergency report is recorded, MongoDB Change Streams detect the change.
8. The backend processes the report, updates affected priorities when necessary, and sends relevant notifications.
9. Delivery status changes are recorded and displayed throughout the delivery lifecycle.

## 4. Architecture Diagram

The intended flow is:

```text
                 USERS
      Admin / Coordinator / Volunteer
                    |
                    v
             Next.js Frontend
                    |
          HTTP API / WebSockets
                    |
                    v
          Node.js + Express Backend
             /             \
            v               v
          MySQL           MongoDB
      Structured Data    Field Reports
            |               |
            |               v
            |        MongoDB Change Streams
            |               |
            v               v
       Business Logic and Event Processing
                    |
                    v
           Socket.IO / WebSockets
                    |
                    v
          Live Dashboard Updates
```

This diagram is a conceptual overview. The final implementation may separate the API and real-time event handlers into different modules within the backend.

## 5. Security and Reliability

- Authenticate users before granting access to protected operations.
- Enforce role-based permissions on the server.
- Validate user input and database operations.
- Use transactions for resource allocation.
- Avoid exposing database credentials to the frontend.
- Store secrets in environment variables and exclude local environment files from Git.
- Handle database disconnections and real-time communication failures.
- Ensure event processing does not cause duplicate allocations or repeated state changes.

## 6. Deployment Considerations

- Configure MySQL with appropriate users, permissions, and database settings.
- Configure MongoDB as a replica set to support Change Streams.
- Configure environment variables separately for local development and deployment.
- Test the application with multiple clients to verify live updates.
- Verify allocation consistency under concurrent requests.

## 7. Implementation Status

This document describes the planned architecture. Components and data flows will be updated as implementation decisions are finalized and tested.
