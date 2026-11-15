# API and events

All routes are relative to `/api`. JSON writes require the configured `Origin` and an `application/json` body where applicable. Login sets a signed HttpOnly cookie. Validation errors return 400, unauthenticated requests 401, role or origin failures 403, missing records 404, and conflicting state 409.

| Method and route | Access | Request or result |
| --- | --- | --- |
| POST /auth/login | Public | email, password; returns user identity and role |
| GET /auth/me, POST /auth/logout | Signed in | Session identity or cookie removal |
| GET /disasters, /areas, /camps, /resources | Signed in | Lists. Camps accept disasterId, q, and associated request status and minPriority |
| POST /disasters | Admin | name, severity |
| PATCH /disasters/:id | Admin | severity |
| POST /areas | Admin | disasterId, name |
| POST /camps | Admin | areaId, name, population |
| PATCH /camps/:id | Admin | population |
| GET /locations, /inventory | Admin | Locations or stock totals and rows; inventory accepts locationId |
| POST /locations, /resources | Admin | Warehouse name or resource name and unit |
| PUT /inventory | Admin | locationId, resourceId, quantity, threshold |
| GET /requests | Admin | disasterId, status, minPriority, q |
| POST /requests | Admin | campId, resourceId, quantity, urgency |
| GET /priority | Admin | Ranked active requests; accepts disasterId |
| GET /allocations | Admin | Allocation and delivery tracker rows |
| POST /allocations | Admin | requestId, sourceId; returns allocation id |
| GET /requests/:id/delivery | Admin | Current state and transition history |
| PATCH /requests/:id/delivery | Admin | status; allocation uses POST /allocations |
| GET /volunteers, /notifications | Admin | Availability directory or recent notifications |
| GET, PUT /availability/me | Volunteer | Own availability; PUT accepts available boolean |
| GET /reports | Signed in | disasterId, campId, collection, reportType, q; volunteers see their own reports |
| POST /reports | Signed in | Document fields below and collection; returns 202 and document ID |
| GET /analytics | Admin | Distribution, shortages, unattended requests, and report summaries; accepts disasterId |

The request lifecycle is Requested → Approved → Allocated → Dispatched → In Transit → Delivered → Confirmed. The database trigger enforces each transition and appends history.

## WebSocket

Connect to `/events` with a admin session cookie and the configured browser origin. On connection, the hub sends `{"type":"connected"}`. Notifications use `{ id, type, payload, createdAt }`.

| Type | Payload |
| --- | --- |
| priority_updated | requestId, previousPriority, priority |
| shortage_alert | locationId, resourceId, quantity, threshold |
| critical_request | requestId, priority |
| report_received | reportId, collection, disasterId, campId, requestId, title |
| allocation_updated | allocationId, requestId, sourceId, quantity |
| delivery_status_changed | requestId, previousStatus, status |
| volunteer_availability | userId, available |
| request_created | requestId |
| inventory_updated | locationId, resourceId, quantity, threshold |
| inventory_saved | locationId, resourceId |
| disaster_updated, area_updated, camp_updated, location_updated, resource_updated | ID of changed entity; area_updated includes disasterId |
| demo_seeded | disasterId, requestId |

Notifications and business mutations commit together in MySQL. The hub broadcasts from the committed outbox. Events are refresh signals and may repeat after a restart. On reconnection the client refreshes its views, and admins can fetch recent notifications over HTTP.

## MongoDB collections

`emergency_reports` records urgent changes from the field. `field_observations` records observations such as damaged roads or operational conditions. Each stores `_id` as an ObjectId; `disasterId`, `campId`, optional `requestId`, and `submittedBy` reference MySQL IDs. Required text fields are `title`, `description`, and `reportType`. The API assigns a BSON Date `timestamp` and `processed: false`. Optional fields are `affectedPopulation` and a flexible scalar-valued `details` object.

Both collections index disasterId and campId with timestamp, timestamp alone, reportType with timestamp, and title and description as a text index. A processing index supports reconciliation. The analytics pipeline unions the collections, filters by disaster when supplied, groups by disaster and report type, and returns count, newest timestamp, and largest reported population.

Insert change streams trigger the report worker. It verifies processing uniqueness with a MySQL receipt, applies population updates in timestamp order per camp, calls the SQL priority procedure, and writes the report notification in the same transaction. Once that commits it marks the MongoDB document processed. Reconciliation replays pending documents if a stream disconnects or a worker restarts. A duplicate receipt prevents reapplying the SQL transaction.
