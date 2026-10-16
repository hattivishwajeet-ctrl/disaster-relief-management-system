# Software Requirements Specification

## 1. Purpose

The Disaster Relief Resource Allocation and Emergency Response Management System is a web-based platform for coordinating disaster information, emergency requests, relief inventory, resource allocation, volunteers, and deliveries.

## 2. Scope

The system will provide a centralized platform for managing relief operations during disasters such as floods, earthquakes, and cyclones. It will prioritize requests, maintain inventory consistency, track deliveries, and provide real-time updates to authorized users.

## 3. User Roles

### 3.1 Administrator
- Manage authorized users and their roles.
- Manage disaster records and system configuration.
- Monitor system-wide operations and analytics.

### 3.2 Relief Coordinator
- Monitor emergency requests and priority rankings.
- Manage inventory and resource allocations.
- Approve requests and track deliveries.
- Receive notifications about critical requests and shortages.

### 3.3 Volunteer
- Submit emergency reports and field observations.
- View relevant assignments and update volunteer availability.
- Provide field updates to support relief operations.

## 4. Functional Requirements

- **FR-01:** The system shall allow authorized users to manage disaster records and affected areas.
- **FR-02:** The system shall maintain relief camps and location-wise resource inventory.
- **FR-03:** The system shall allow authorized users to create and manage resource requests.
- **FR-04:** The system shall calculate request priority using disaster severity, affected population, shortage level, and urgency.
- **FR-05:** The system shall recalculate priority when relevant request or emergency information changes.
- **FR-06:** The system shall maintain consistent inventory, allocation records, and request status during resource allocation.
- **FR-07:** The system shall track deliveries through Requested, Approved, Allocated, Dispatched, In Transit, Delivered, and Confirmed.
- **FR-08:** The system shall escalate unattended high-priority requests according to configured rules.
- **FR-09:** The system shall generate alerts when inventory falls below configured safe thresholds.
- **FR-10:** The system shall store emergency reports and field observations in MongoDB.
- **FR-11:** The system shall provide live updates for relevant requests, reports, inventory changes, and delivery status.
- **FR-12:** The system shall provide role-based interfaces for administrators, relief coordinators, and volunteers.
- **FR-13:** The system shall provide disaster and resource analytics.

## 5. Non-Functional Requirements

- **NFR-01 — Data integrity:** Resource allocation must preserve inventory and allocation consistency.
- **NFR-02 — Security:** Access to operations and data shall be controlled according to user roles.
- **NFR-03 — Reliability:** Database failures and unsuccessful operations shall be handled without silently corrupting records.
- **NFR-04 — Performance:** Frequently accessed records shall use appropriate database queries and indexes.
- **NFR-05 — Maintainability:** The application shall use a modular structure and documented interfaces.
- **NFR-06 — Real-time updates:** Relevant changes shall be communicated to connected dashboards without manual page refreshes.
- **NFR-07 — Auditability:** Important allocation and delivery status changes should be traceable.

## 6. Technology Stack

- Frontend: Next.js
- Backend: Node.js and Express
- Relational database: MySQL
- Document database: MongoDB
- Real-time communication: Socket.IO / WebSockets
- Event monitoring: MongoDB Change Streams

## 7. Database Requirements

### MySQL
MySQL shall store structured relational data, including disasters, affected areas, camps, resources, inventory, requests, allocations, users, and volunteers.

The design shall apply transactions, stored procedures, triggers, views, and indexing where appropriate.

### MongoDB
MongoDB shall store emergency reports and field observations whose structure may vary. Aggregation shall support summaries, while Change Streams shall detect relevant database changes for real-time processing.

## 8. Assumptions and Constraints

- Users must be authenticated before accessing protected functionality.
- Role permissions must be enforced by the backend, not only by the frontend.
- MongoDB Change Streams require a replica-set deployment.
- Priority weights, critical thresholds, and escalation time limits must be defined during implementation.
- Real-time delivery depends on connectivity and successful event processing.

## 9. Acceptance Criteria

The system will be considered functionally ready for demonstration when:
- Authorized users can manage disaster records and resource requests.
- Requests receive priority scores according to a documented formula.
- Successful allocations update inventory and allocation records consistently.
- Delivery status can be tracked through the defined lifecycle.
- Emergency reports can be stored and relevant updates delivered to connected dashboards.
- Role restrictions and configured alerts can be demonstrated.
- Core functionality passes documented tests.
