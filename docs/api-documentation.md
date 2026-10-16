# API Documentation

## 1. Overview

This document describes the planned REST API for the Disaster Relief Resource Allocation and Emergency Response Management System.

The backend will use Node.js and Express. The API will connect the Next.js frontend to MySQL and MongoDB and provide controlled access to disaster management, resource allocation, emergency reporting, and delivery tracking.

**Status:** Planned endpoints. Routes and response formats will be updated to match the implementation.

## 2. API Conventions

- Base URL during local development: `http://localhost:5000/api/v1`
- Data exchange format: JSON
- Authentication: Authenticated requests will use the configured authentication mechanism.
- Authorization: Each protected endpoint will enforce the required role and permissions.
- Errors: Responses should provide an appropriate HTTP status code and a consistent JSON error structure.

Example error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data."
  }
}
```

## 3. Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate a user |
| POST | `/auth/logout` | End the current session |
| GET | `/auth/me` | Retrieve the authenticated user's information |

Access to protected resources must be checked by the backend.

## 4. Disaster and Area Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/disasters` | List disasters |
| POST | `/disasters` | Create a disaster |
| GET | `/disasters/:id` | Retrieve disaster details |
| PATCH | `/disasters/:id` | Update disaster information |
| GET | `/disasters/:id/areas` | List affected areas |
| POST | `/disasters/:id/areas` | Add an affected area |

Create and update operations will require appropriate permissions.

## 5. Relief Camps and Resources

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/camps` | List relief camps |
| POST | `/camps` | Register a relief camp |
| GET | `/resources` | List resource types |
| POST | `/resources` | Register a resource type |
| GET | `/inventory` | View inventory |
| GET | `/inventory/:id` | View a specific inventory record |
| PATCH | `/inventory/:id` | Update inventory through an authorized operation |

Inventory updates must preserve stock consistency and should not bypass allocation rules.

## 6. Resource Requests and Priority

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/requests` | List resource requests |
| POST | `/requests` | Submit a resource request |
| GET | `/requests/:id` | Retrieve request details |
| PATCH | `/requests/:id` | Update permitted request fields |
| GET | `/requests/:id/priority` | Retrieve the current priority score |

The backend will calculate priority using the configured severity, population, shortage, and urgency factors. Clients must not be allowed to arbitrarily set trusted priority scores.

## 7. Allocations and Deliveries

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/requests/:id/approve` | Approve a request |
| POST | `/requests/:id/allocations` | Allocate available resources |
| GET | `/allocations` | List allocation records |
| GET | `/allocations/:id` | Retrieve allocation details |
| GET | `/deliveries` | List deliveries |
| GET | `/deliveries/:id` | Retrieve delivery details |
| PATCH | `/deliveries/:id/status` | Update delivery status |

Delivery transitions must follow the configured lifecycle:

`Requested → Approved → Allocated → Dispatched → In Transit → Delivered → Confirmed`

The backend must validate permitted state transitions and record important status changes.

Allocation operations must use transaction-safe MySQL operations to maintain inventory and allocation consistency.

## 8. Emergency Reports

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/emergency-reports` | List authorized emergency reports |
| POST | `/emergency-reports` | Submit an emergency report |
| GET | `/emergency-reports/:id` | Retrieve report details |
| PATCH | `/emergency-reports/:id/status` | Update an authorized report's status |

Emergency reports will be stored in MongoDB. The backend will validate submitted data and determine which users can access each report.

## 9. Volunteers and Analytics

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/volunteers` | List authorized volunteer records |
| PATCH | `/volunteers/me/availability` | Update the current volunteer's availability |
| GET | `/analytics/overview` | Retrieve an operational summary |
| GET | `/analytics/inventory` | Retrieve inventory analytics |
| GET | `/analytics/requests` | Retrieve request and priority analytics |

The exact analytics and filters will be defined during implementation.

## 10. Real-Time Events

Connected clients will receive authorized updates through Socket.IO.

Proposed event names include:

- `request:created`
- `request:priority-updated`
- `request:escalated`
- `inventory:shortage`
- `allocation:updated`
- `delivery:status-updated`
- `emergency-report:created`
- `volunteer:availability-updated`

Event payloads must contain only information that the receiving user is authorized to access.

MongoDB Change Streams will detect relevant emergency-report changes. Backend handlers will process these changes and publish suitable events.

## 11. Validation and Error Handling

The backend will validate required fields, identifiers, quantities, user permissions, and permitted status transitions.

Expected error categories include:

- `400 Bad Request`: Invalid input.
- `401 Unauthorized`: Authentication required or invalid.
- `403 Forbidden`: Insufficient permissions.
- `404 Not Found`: Requested resource does not exist.
- `409 Conflict`: State conflict or insufficient available inventory.
- `500 Internal Server Error`: Unexpected server failure.

Actual status codes will depend on the implemented API contract.

## 12. Testing

Each implemented endpoint should be tested for:

- Valid requests and expected responses.
- Missing or invalid fields.
- Unauthenticated access.
- Unauthorized roles.
- Missing resources.
- Database failures.
- Concurrent allocation attempts.
- Valid and invalid delivery status transitions.

## 13. Implementation Status

The endpoints and event names in this document are proposed. They are not considered implemented until the corresponding backend routes, authorization checks, database operations, and tests are completed.
