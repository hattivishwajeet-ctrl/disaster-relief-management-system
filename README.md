# Disaster Relief Resource Allocation and Emergency Response Management System

A web-based disaster relief coordination platform designed to prioritize emergency requests, manage relief resources, and provide real-time visibility into disaster response operations.

## Overview

During disasters such as floods, earthquakes, and cyclones, relief teams must coordinate limited resources across multiple affected areas. This project aims to centralize disaster information, automate request prioritization, maintain consistent inventory records, and track relief deliveries from request to confirmation.

## Objectives

- Centralize disaster, affected-area, relief-camp, resource, inventory, request, allocation, user, and volunteer information.
- Calculate resource-request priorities using disaster severity, affected population, resource shortage, and urgency.
- Recalculate priorities when relevant emergency information changes.
- Maintain consistent inventory and allocation records through database transactions.
- Track resource deliveries throughout their complete lifecycle.
- Provide real-time notifications and monitoring dashboards.
- Support operational analytics and post-disaster planning.

## Key Features

- Disaster and affected-area management
- Multi-location inventory management
- Automated request-priority scoring
- Transaction-safe resource allocation
- Automatic escalation of critical requests
- Resource delivery tracking
- Emergency reporting by volunteers
- Real-time inventory shortage alerts
- Live coordinator dashboards and notifications
- Role-based interfaces for administrators, relief coordinators, and volunteers
- Disaster and resource analytics

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Backend | Node.js and Express |
| Relational database | MySQL |
| Document database | MongoDB |
| Real-time communication | Socket.IO / WebSockets |
| Database event monitoring | MongoDB Change Streams |

## Resource Delivery Lifecycle

`Requested → Approved → Allocated → Dispatched → In Transit → Delivered → Confirmed`

## Database Concepts

**MySQL**
- Transactions and referential integrity
- Stored procedures
- Triggers
- Views
- Indexing

**MongoDB**
- Flexible document storage
- Aggregation framework
- Change Streams for detecting data changes

## Project Status

Currently in the initial setup and documentation phase. Implementation, integration, and testing will be tracked as development progresses.

## Repository Structure

The repository will be organized into frontend, backend, database, tests, and documentation directories as development begins.

## Documentation

Project documentation will cover requirements, system architecture, database design, API specifications, installation, testing, and usage instructions.

## Contributors

- Project owner and developer: Repository owner
- Collaborator: Repository collaborator

## Disclaimer

This project is being developed for academic and demonstration purposes. It is not a substitute for validated emergency-response procedures or operational disaster-management infrastructure.
