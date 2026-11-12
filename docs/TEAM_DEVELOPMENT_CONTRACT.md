# TEAM DEVELOPMENT CONTRACT
## Disaster Relief Resource Allocation and Emergency Response Management System

**Repository:** `hattivishwajeet-ctrl/disaster-relief-management-system`  
**Team size:** 2 members  
**Development approach:** Parallel development with planned integration  
**Project architecture:** Next.js + Node.js/Express + MySQL + MongoDB + Socket.IO

---

# 1. Project Objective

Develop a web-based Disaster Relief Resource Allocation and Emergency Response Management System that:

- Centralizes disaster, affected-area, camp, resource, inventory and emergency request management.
- Automatically calculates and ranks emergency requests based on severity, affected population, shortage and urgency.
- Ensures transaction-safe allocation of limited resources.
- Tracks resource delivery from request to confirmation.
- Stores structured information in MySQL and unstructured emergency reports in MongoDB.
- Dynamically recalculates request priorities when new emergency information arrives.
- Provides real-time updates and notifications to relief coordinators.
- Provides role-based interfaces for administrators, coordinators and volunteers.

The project must demonstrate advanced database concepts beyond basic CRUD operations.

---

# 2. Technology Stack and Architecture

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Backend REST APIs | Node.js + Express |
| Relational database | MySQL |
| Document database | MongoDB |
| Real-time communication | Socket.IO |
| Authentication | JWT |
| Password security | bcrypt password hashing |
| Version control | Git + GitHub |

### Agreed architecture

The application will use the following architecture:

1. Next.js will handle the user interface and frontend routing.
2. Express will provide the REST API backend.
3. Socket.IO will handle persistent real-time connections.
4. MongoDB change streams will detect newly submitted emergency reports.
5. MySQL will maintain structured records and transaction-safe operations.
6. MongoDB will maintain flexible emergency reports and field observations.

**Important implementation decision:** Socket.IO and MongoDB change streams will run in a persistent Node.js server environment, not inside short-lived Next.js route handlers.

The Express application will expose REST endpoints and host the Socket.IO server. The real-time processing module will be maintained separately within the backend codebase.

MongoDB must run as a replica set to support change streams. The team will configure either MongoDB Atlas with a suitable replica-set deployment or a local single-node replica set during Milestone 1.

---

# 3. Member Responsibilities

## MEMBER 1 – Relational Database, Core Backend, Allocation and Admin Interface

**Primary ownership:** MySQL architecture, core backend, resource allocation, security and administrative frontend.

### A. MySQL – Primary Ownership

Member 1 is responsible for:

1. Designing the complete Entity Relationship Diagram.
2. Database normalization and relational schema design.
3. Creating and maintaining the primary MySQL database.
4. Writing core DDL scripts:
   - CREATE
   - ALTER
   - DROP
5. Implementing database constraints:
   - PRIMARY KEY
   - FOREIGN KEY
   - NOT NULL
   - UNIQUE
   - CHECK
6. Managing multi-location inventory across central warehouses and relief camps.
7. Implementing stored procedures for:
   - Transaction-safe resource allocation.
   - Priority-score calculation.
8. Implementing triggers for:
   - Automatic inventory shortage detection.
   - Escalation of unattended high-priority requests.
   - Inserting relevant event records into the transactional event outbox.
9. Implementing delivery lifecycle validation.
10. Creating indexes, views and analytical SQL queries.
11. Maintaining the transactional event outbox table used by the real-time notification mechanism.

### B. Backend Development

Member 1 is responsible for:

1. JWT-based authentication APIs.
2. Salted password hashing.
3. Role-based authorization middleware.
4. Environment variable configuration for the core backend.
5. REST APIs for:
   - Disasters.
   - Affected areas and camps.
   - Resources.
   - Inventory.
   - Resource requests.
   - Allocations.
   - Delivery tracking.
6. Search and filtering of requests and camps.
7. Core administrative backend operations.
8. Database transaction management.
9. Integration of SQL-based analytics.

### C. Frontend Development – Member 1

Member 1 will independently develop the following Next.js pages and components:

1. Admin management interface.
2. Disaster management screens.
3. Camp and resource management screens.
4. Multi-location inventory management screen.
5. Resource allocation interface.
6. SQL-based analytics dashboard.
7. Inventory and shortage reporting views.

These pages will consume Member 1's REST APIs.

### D. Integration Responsibilities

Member 1 will:

1. Provide the priority calculation procedure for Member 2's dynamic response mechanism.
2. Ensure that database transactions complete successfully before corresponding events are published.
3. Provide backend APIs and database operations required by Member 2.
4. Integrate SQL and MongoDB analytical results where necessary.
5. Support debugging of database and backend integration issues.

### E. Member 1 Documentation Responsibilities

Member 1 owns:

- MySQL ER diagram.
- Relational schema documentation.
- Relational data dictionary.
- SQL DDL scripts.
- Stored procedure documentation.
- Trigger documentation.
- Important SQL queries.
- Database constraints and indexes documentation.
- Core backend API documentation.
- README initial setup and project overview.

### F. Member 1 Deliverables

- Complete ER diagram.
- Normalized relational schema.
- MySQL DDL scripts.
- Constraints and sample data.
- Stored procedures.
- Triggers.
- Transactional event outbox.
- Views and indexes.
- Core backend APIs.
- Authentication and authorization.
- Resource allocation functionality.
- Delivery lifecycle.
- Admin interface.
- SQL analytics dashboard.
- SQL and backend test cases.

---

## MEMBER 2 – MongoDB, Real-Time Architecture, Dynamic Response and Coordinator/Volunteer Interface

**Primary ownership:** MongoDB architecture, emergency reporting, real-time communication, dynamic response and coordinator/volunteer frontend.

### A. MongoDB – Primary Ownership

Member 2 is responsible for:

1. Designing MongoDB document models.
2. Creating emergency report collections.
3. Creating field observation collections.
4. Establishing references to MySQL records using IDs.
5. Creating indexes on:
   - Disaster ID.
   - Camp ID.
   - Timestamp.
   - Report type.
6. Creating text indexes for report search.
7. Implementing MongoDB aggregation pipelines for report summaries.
8. Implementing MongoDB change streams to detect new reports.
9. Configuring and documenting the MongoDB replica-set connection.

### B. Real-Time Architecture

Member 2 is responsible for:

1. Implementing the Socket.IO real-time module.
2. Developing the event hub and event handlers.
3. Integrating MongoDB change streams with the event system.
4. Implementing the dynamic response workflow:

   New emergency report → Priority recalculation → Ranking update → Coordinator notification.

5. Implementing real-time notifications for:
   - Critical requests.
   - Inventory shortages.
   - Priority changes.
   - New emergency reports.
   - Allocation updates.
   - Delivery status changes.
   - Volunteer availability.

6. Implementing the backend event dispatcher that processes committed outbox records and publishes the corresponding Socket.IO events.
7. Implementing appropriate retry and delivery-status handling for failed event publication.
8. Ensuring that the coordinator dashboard receives updates without manual refreshing.

### C. Frontend Development – Member 2

Member 2 will independently develop the following Next.js pages and components:

1. Login interface.
2. Role-based frontend routing.
3. Live coordinator dashboard.
4. Live priority ranking interface.
5. Emergency alerts and notification interface.
6. Delivery tracking interface.
7. Volunteer dashboard.
8. Emergency report submission interface.
9. Volunteer availability interface.
10. Search and filtering of emergency reports.

These pages will consume Member 1's REST APIs and Member 2's real-time events.

### D. Cross-over Database Responsibilities

Member 2 will also own the following MySQL components:

1. Volunteers table.
2. Volunteer availability table.
3. Notifications table.
4. SQL views supporting live priority ranking.

These components must follow the relational schema and naming conventions agreed upon by both members.

Member 1 will review their integration with the core relational schema.

### E. Configuration and Security Responsibilities

Member 2 is responsible for:

1. MongoDB connection configuration.
2. MongoDB replica-set connection URI.
3. Socket.IO server configuration.
4. WebSocket-related environment variables.
5. Secure frontend handling of authentication tokens.
6. Integration with Member 1's authentication and role-based authorization.

Secrets must be stored in environment variables and must never be committed to GitHub.

### F. Member 2 Documentation Responsibilities

Member 2 owns:

- MongoDB collection documentation.
- MongoDB document data dictionary.
- MongoDB indexes documentation.
- Aggregation pipeline documentation.
- Change stream documentation.
- Socket.IO architecture documentation.
- Event hub documentation.
- Frontend screenshots.
- Real-time workflow screenshots.
- Coordinator and volunteer interface documentation.

### G. Member 2 Deliverables

- MongoDB document models.
- MongoDB collections.
- MongoDB indexes.
- Aggregation pipelines.
- Change stream implementation.
- MongoDB replica-set configuration.
- Socket.IO server.
- Event hub.
- Dynamic response workflow.
- Event dispatcher.
- Next.js login interface.
- Coordinator dashboard.
- Volunteer interface.
- Real-time notification system.
- MongoDB and real-time test cases.

---

# 4. Shared Responsibilities

The following activities must be completed collaboratively.

| Activity | Responsibility |
|---|---|
| Project requirements | Both |
| API contract | Both |
| WebSocket event contract | Both |
| Database integration design | Both |
| Overall architecture diagram | Both |
| Project README review | Both |
| Problem statement and objectives | Both |
| Scope and limitations | Both |
| Integration testing | Both |
| Final test case review | Both |
| Final conclusion | Both |
| Final presentation and demonstration | Both |

### API and Event Contract

Both members must agree on endpoint names, request formats, response formats, event names and payload structures before integration.

The initial event names will be:

| Event | Purpose |
|---|---|
| `priority_updated` | Request priority has changed |
| `request_escalated` | Request has been automatically escalated |
| `shortage_alert` | Inventory has fallen below its threshold |
| `delivery_status_changed` | Delivery lifecycle status has changed |
| `new_emergency_report` | New emergency report received |
| `allocation_updated` | Resource allocation has changed |
| `volunteer_status_changed` | Volunteer availability has changed |
| `notification_created` | A new coordinator notification is available |

These names must remain consistent across the backend, Socket.IO server and frontend.

No member should independently change a shared contract without informing the other member.

---

# 5. Important Database and Real-Time Integration Agreement

A MySQL trigger cannot directly emit a Socket.IO event. Therefore, the team will use a transactional event-outbox mechanism.

### Agreed workflow

1. A database operation changes inventory, request priority or delivery status.
2. A MySQL trigger inserts a corresponding event record into the `event_outbox` table.
3. The event record is committed as part of the same database transaction.
4. A backend dispatcher processes committed, unpublished outbox records.
5. The dispatcher creates or updates the relevant notification record.
6. The dispatcher publishes the event through Socket.IO.
7. The coordinator dashboard receives the update.
8. The event record is marked as published after successful processing.

If the original database transaction rolls back, the corresponding outbox event also rolls back.

**Ownership:**

- Member 1: Outbox table, relevant SQL triggers and transaction integration.
- Member 2: Event dispatcher, notification persistence, Socket.IO publishing and frontend updates.

Both members must test this mechanism together.

The dispatcher must support retries and avoid duplicate notification creation where possible.

---

# 6. Frontend Ownership Agreement

To avoid duplicate work and uneven distribution, frontend responsibilities are explicitly divided.

| Frontend module | Owner |
|---|---|
| Login interface | Member 2 |
| Role-based routing | Member 2 |
| Admin management | Member 1 |
| Disaster management | Member 1 |
| Camp management | Member 1 |
| Inventory management | Member 1 |
| Resource allocation | Member 1 |
| SQL analytics dashboard | Member 1 |
| Live coordinator dashboard | Member 2 |
| Live priority ranking | Member 2 |
| Emergency alerts | Member 2 |
| Delivery live tracker | Member 2 |
| Volunteer dashboard | Member 2 |
| Emergency report submission | Member 2 |
| Volunteer availability | Member 2 |

Both members must follow a common frontend design system and shared API conventions.

---

# 7. GitHub Branch Management

Each member must work on independent feature branches.

### Member 1 branches

- `feature/mysql-schema`
- `feature/auth-backend`
- `feature/inventory-management`
- `feature/priority-allocation`
- `feature/delivery-management`
- `feature/admin-dashboard`
- `feature/sql-analytics`

### Member 2 branches

- `feature/nextjs-setup`
- `feature/mongodb-models`
- `feature/sql-volunteer-notifications`
- `feature/websocket-server`
- `feature/coordinator-dashboard`
- `feature/volunteer-interface`
- `feature/notifications`

### GitHub Rules

1. Each member must commit using their own GitHub account.
2. Each member must work on their assigned branches.
3. Commits must represent meaningful development work.
4. Commit messages must describe the actual change.
5. Pull requests must be reviewed by the other member.
6. Integration issues must be resolved before merging.
7. Direct pushes to `main` should be avoided.
8. No member should claim another member's work as their own.

---

# 8. Documentation Ownership

The following documentation must be maintained throughout development.

| Document / Evidence | Owner |
|---|---|
| Project README | Member 1; both review |
| Problem statement and objectives | Both |
| Overall architecture diagram | Both |
| MySQL ER diagram | Member 1 |
| Relational data dictionary | Member 1 |
| MongoDB data dictionary | Member 2 |
| Relational schema documentation | Member 1 |
| MongoDB model documentation | Member 2 |
| Important SQL queries | Member 1 |
| MongoDB aggregation queries | Member 2 |
| Stored procedure documentation | Member 1 |
| Trigger documentation | Member 1 |
| WebSocket event documentation | Member 2 |
| Frontend screenshots | Each member for their own pages |
| Database screenshots | Each member for their own database |
| SQL and API test cases | Member 1 |
| MongoDB and real-time test cases | Member 2 |
| Combined end-to-end test case table | Both |
| Final conclusion and limitations | Both |

All documentation must be stored in the repository's `docs/` directory.

---

# 9. Development and Integration Rules

### Rule 1 – Parallel Development

Both members must develop their assigned modules simultaneously.

Member 1 must not wait until all relational database and backend work is completed before Member 2 starts.

Member 2 must not wait until the entire frontend is complete before Member 1 starts.

### Rule 2 – Independent Testing

Each member must test their own modules before requesting integration.

### Rule 3 – Shared Contracts

Both members must agree on:

- Database naming conventions.
- API endpoint structures.
- Request and response formats.
- MySQL reference IDs in MongoDB.
- Event names and payloads.
- Authentication and authorization interfaces.

### Rule 4 – Integration

Integration must happen at planned checkpoints, not only at the end.

### Rule 5 – Code Quality

Both members must:

- Maintain readable and documented code.
- Avoid unnecessary duplication.
- Use environment variables for secrets.
- Handle errors appropriately.
- Test edge cases.
- Understand the implementation of their assigned modules.

---

# 10. Integration Milestones and Schedule

Let **T** represent the final project submission date.

The following is a suggested four-week development schedule. The actual calendar dates must be filled in once the submission deadline is confirmed.

| Milestone | Suggested period | Main outcome |
|---|---|---|
| M1 – Foundation | T-28 to T-24 | Architecture, database setup and contracts |
| M2 – Core development | T-23 to T-16 | MySQL schema, APIs, MongoDB and initial UI |
| M3 – Advanced features | T-15 to T-9 | Procedures, triggers, aggregations, change streams and WebSockets |
| M4 – Integration | T-8 to T-5 | Dynamic response and complete frontend integration |
| M5 – Testing and submission | T-4 to T | Testing, documentation, screenshots and final demo |

### Milestone 1 – Project Foundation

Both members must establish:

- Repository structure.
- API and event contracts.
- MySQL database.
- MongoDB connection and replica-set configuration.
- Next.js application.
- Express backend and Socket.IO architecture.
- Environment variable templates.
- Database ownership boundaries.

### Milestone 2 – Core Functionality

Member 1:

- Relational schema.
- Core backend APIs.
- Authentication.
- Inventory and request management.
- Initial allocation implementation.

Member 2:

- MongoDB collections.
- MongoDB indexes.
- Emergency report submission.
- Next.js interfaces.
- Initial coordinator and volunteer screens.

### Milestone 3 – Advanced Database Features

Member 1:

- Stored procedures.
- Transaction-safe allocation.
- Triggers.
- Event outbox.
- Delivery lifecycle.
- SQL analytics.

Member 2:

- Aggregation pipelines.
- Change streams.
- Socket.IO event hub.
- Event dispatcher.
- Volunteer and notification tables.
- Real-time notification implementation.

### Milestone 4 – Dynamic Response Integration

Both members must demonstrate:

1. A resource request starts with a priority score of 70.
2. A volunteer submits a new emergency report.
3. MongoDB detects the new report.
4. The relevant MySQL request is identified.
5. Member 1's priority calculation procedure executes.
6. The request's priority changes from 70 to 92 in the demonstration scenario.
7. The corresponding update is committed.
8. The backend publishes the event.
9. The coordinator dashboard updates automatically.
10. The coordinator receives the appropriate notification.

### Milestone 5 – Final Testing and Demonstration

- Functional testing.
- Database integrity testing.
- Transaction testing.
- API testing.
- Authentication and authorization testing.
- Real-time update testing.
- MongoDB change stream testing.
- Frontend testing.
- End-to-end scenario testing.
- Documentation completion.
- Final demonstration.

---

# 11. Priority Scoring and Demonstration Agreement

The team must finalize the priority-scoring formula during Milestone 1.

Both members must agree on:

- Input variables.
- Variable weights.
- Scoring range.
- Escalation rules.
- Recalculation conditions.
- Treatment of missing or invalid data.

A reproducible demonstration dataset must be created early.

The team must seed an initial request and an emergency report that produce the specified demonstration change from 70 to 92.

The values must be generated by the implemented scoring formula, not manually assigned during the demonstration.

The exact scoring formula and sample inputs must be documented.

---

# 12. Quality and Accountability Rules

Both members agree to:

1. Complete assigned responsibilities independently.
2. Inform the other member about blockers or delays.
3. Avoid modifying another member's module without coordination.
4. Participate in integration and debugging.
5. Maintain meaningful GitHub commit history.
6. Complete documentation for their assigned modules.
7. Understand the technical decisions made in their own modules.
8. Participate in the final demonstration.
9. Review and test each other's integrated contributions.
10. Inform the other member before changing agreed architecture or shared interfaces.

Neither member is exempt from understanding the overall system.

---

# 13. Final Responsibility Summary

| Component | Member 1 | Member 2 |
|---|---|---|
| Core MySQL schema | Primary | Review |
| Volunteer and notification SQL | Review | Primary |
| Relational data dictionary | Primary | — |
| MongoDB data dictionary | — | Primary |
| Core backend APIs | Primary | Integration |
| Authentication and security | Primary | Frontend integration |
| Priority calculation | Primary | Integration |
| Transaction-safe allocation | Primary | — |
| Inventory management | Primary | — |
| Delivery lifecycle | Primary | Live UI integration |
| SQL triggers and procedures | Primary | — |
| Transactional outbox | Primary | Integration |
| MongoDB models | — | Primary |
| MongoDB aggregations | Integration | Primary |
| Change streams | — | Primary |
| Socket.IO event hub | Integration | Primary |
| Event dispatcher | Integration | Primary |
| Dynamic response | Priority procedure | Workflow integration |
| Next.js foundation | Shared integration | Primary |
| Admin interface | Primary | — |
| Allocation interface | Primary | — |
| SQL analytics dashboard | Primary | — |
| Coordinator dashboard | — | Primary |
| Volunteer interface | — | Primary |
| Notifications | Database support | Primary |
| README | Primary | Review |
| Screenshots | Own modules | Own modules |
| End-to-end testing | Both | Both |
| Final demonstration | Both | Both |

---

# 14. Agreement

Both members acknowledge that:

- Responsibilities have been divided to enable parallel development.
- Each member is accountable for their assigned deliverables.
- Shared integration decisions require mutual agreement.
- Both members will contribute to testing, documentation and final demonstration.
- Major changes in scope or responsibility must be discussed and agreed upon.
- Individual contributions must be reflected honestly in GitHub history.

---

**End of Team Development Contract**
