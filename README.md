# Disaster Relief Management System

Member A implementation for administration, inventory, request scoring, allocation, delivery, and analytics.

## Setup

Use Node.js 22.13 or newer and Docker Compose. Copy .env.example to .env and set the database passwords, ADMIN_PASSWORD, and a random JWT_SECRET of at least 32 bytes.

    npm ci
    docker compose up -d --wait
    npm run seed
    npm run dev

Sign in at http://localhost:3000 as admin@relief.local using ADMIN_PASSWORD. To allocate the demo request, approve it and set Central Warehouse stock to at least 200 L. Run npm test for authentication tests.

MySQL triggers and API transactions write committed events to the notification outbox. The report summary pipeline reads MongoDB. Report ingestion, the live dashboard and the WebSocket consumer are Member B integration points.

See [relational design](docs/design.md) for the schema and scoring.
