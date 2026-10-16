# Database Design

## 1. Overview

The Disaster Relief Resource Allocation and Emergency Response Management System uses two databases:

- **MySQL:** Stores structured relational data and supports transactional resource allocation.
- **MongoDB:** Stores emergency reports and field observations with flexible document structures.

This design is preliminary and will be refined during implementation.

## 2. MySQL Relational Database

### 2.1 Planned Tables

| Table | Purpose |
|---|---|
| users | Stores user accounts, authentication references, and role information |
| volunteers | Stores volunteer-specific information and availability |
| disasters | Stores disaster type, severity, status, and relevant dates |
| affected_areas | Stores affected locations and estimated population |
| relief_camps | Stores camp details and associated locations |
| resources | Defines resource types, units, and descriptions |
| inventory | Tracks resource quantities at warehouses and relief camps |
| resource_requests | Stores requests, shortage information, priority scores, and status |
| allocations | Records quantities allocated to requests and their source inventory |
| deliveries | Tracks dispatch, transit, delivery, and confirmation information |

The final schema may introduce additional tables where needed to maintain normalized data and support the complete delivery lifecycle.

### 2.2 Relationships

The intended relationships include:

- A disaster can affect multiple areas.
- An affected area can contain or be associated with multiple relief camps.
- A resource type can have inventory entries at multiple locations.
- A relief camp or other authorized location can submit multiple resource requests.
- A resource request can receive multiple allocation records.
- Allocations can reference the inventory location from which resources are assigned.
- A delivery can be associated with an allocation or request.
- A user can have a role that determines permitted operations.

Exact foreign keys and cardinalities will be established in the final relational schema.

## 3. Resource Inventory

Inventory must be maintained by resource type and location.

For each inventory entry, the design should track:

- Resource identifier.
- Storage location.
- Available quantity.
- Reserved or allocated quantity, if reservations are implemented.
- Safe-stock threshold.
- Last update timestamp.

The system must prevent an allocation from reducing available inventory below the permitted quantity.

## 4. Resource Request Priority

Each resource request will have a priority score calculated using:

- Disaster severity.
- Affected population.
- Resource shortage level.
- Urgency.

The scoring formula, factor weights, normalization rules, and priority thresholds must be defined and documented before implementation.

Priority scores should be recalculated when relevant request details or emergency reports change the underlying conditions.

## 5. Transaction-Safe Allocation

Resource allocation must maintain consistency across inventory, allocation records, and request status.

The planned transaction workflow is:

1. Begin a database transaction.
2. Validate the request and the user's permissions.
3. Lock or otherwise safely coordinate access to the relevant inventory rows.
4. Verify that sufficient stock is available.
5. Deduct or reserve the required quantity.
6. Insert the allocation record.
7. Update the request status.
8. Commit the transaction if all operations succeed.
9. Roll back the transaction if any operation fails.

The implementation must also address concurrent allocation attempts and prevent duplicate processing.

## 6. MySQL Advanced Database Concepts

The project will demonstrate the following concepts.

### Transactions
Maintain atomic and consistent inventory allocation operations.

### Stored Procedures
Encapsulate selected database operations, such as allocation or inventory summaries, where appropriate.

### Triggers
Enforce suitable database-level rules or record relevant changes. Trigger responsibilities must be designed carefully to avoid conflicting with backend business logic.

### Views
Provide reusable representations of information such as current inventory, pending requests, and delivery status.

### Indexing
Improve query performance for frequently searched fields, foreign keys, request statuses, resource identifiers, locations, and timestamps as appropriate.

## 7. MongoDB Document Design

### 7.1 Emergency Reports Collection

Proposed collection: `emergency_reports`

An illustrative document is:

```json
{
  "reportId": "ER-EXAMPLE-001",
  "disasterId": 1,
  "areaId": 1,
  "submittedBy": 1,
  "reportType": "resource_shortage",
  "severity": "high",
  "description": "Drinking water supplies are running low.",
  "affectedPopulation": 250,
  "status": "submitted",
  "createdAt": "2026-10-16T08:00:00Z"
}
```

The identifiers and field values above are illustrative. The final schema will depend on the application and integration requirements.

### 7.2 Aggregation Framework

Aggregation pipelines may summarize reports by disaster, area, report type, severity, or time period.

These summaries can support coordinator dashboards and post-disaster analysis.

### 7.3 Change Streams

MongoDB Change Streams will detect relevant report changes. A backend handler will validate and process events before notifying authorized clients.

Change Streams require MongoDB to run as a replica set.

## 8. Cross-Database Consistency

MySQL transactions cannot automatically provide a single atomic transaction across MySQL and MongoDB.

Therefore:

- MySQL will remain authoritative for resource inventory and allocations.
- MongoDB will store emergency reports and field observations.
- Backend logic will coordinate priority recalculation and notifications.
- If a database event cannot be processed, the implementation should provide appropriate error handling and a recovery strategy.

## 9. Data Security

- Use parameterized SQL queries.
- Validate and authorize database operations.
- Restrict database credentials and privileges.
- Keep passwords and connection strings out of source control.
- Avoid storing unnecessary sensitive information in emergency reports.
- Apply suitable indexes and validation rules.

## 10. Implementation Status

The tables, relationships, collection structure, and database operations described here are proposed designs. They will be updated to match the implemented schema, tested queries, and actual database behavior.
