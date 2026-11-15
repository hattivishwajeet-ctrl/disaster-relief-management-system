# Disaster Relief Resource Allocation and Emergency Response

Disasters can create simultaneous shortages across multiple relief camps. Admins use this project to rank requests, allocate stock, and track shipments. Volunteers submit reports and update their availability. Changes to severity, population, and stock can change the active queue as the situation develops.

## Run locally

Requires Node.js 22.13 or newer and Docker Compose with a running Linux engine. Run these commands in the project directory.

```powershell
Copy-Item .env.example .env
# Fill in the password and secret fields in .env before continuing.
npm ci
docker compose up -d --wait
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the exact origin configured in `APP_ORIGIN`. The seed creates `admin@relief.local` and `volunteer@relief.local`. Each password comes from the corresponding environment variable and must be at least 12 characters. Generate a random JWT secret of at least 32 bytes. Seed is repeatable and leaves existing account passwords and demo data intact.

Use `npm run build` and then `npm start` for the production build. The long-running Node server serves the Next.js UI, JSON API, and same-origin WebSocket endpoint. For an external deployment, provide authenticated MySQL and MongoDB replica-set connections, terminate HTTPS at a reverse proxy that forwards WebSocket upgrades, set `COOKIE_SECURE=true` and use the public HTTPS origin in `APP_ORIGIN`. Run one Node application instance with this outbox implementation. The Compose MongoDB instance has no authentication and binds only to the local host port for development.

## Verify the workflows

For a database created with the earlier three-role schema, stop the app, run `npm run migrate`, then restart the app. The migration disables accounts from the retired role while preserving their IDs for historical records.

```powershell
npm test
npm run test:integration
```

Run the integration test with the app and seeded test databases running. The test creates isolated records with unique names. It covers role restrictions, priority ranking and WebSocket updates, MongoDB summaries, invalid delivery transitions, allocation rollback, concurrent allocation, shortage alerts, inventory receipt, and volunteer availability.

### Demo

1. Sign in as admin and open Overview. The seeded Riverbend Flood request starts at **70**.
2. In a separate browser profile, sign in as volunteer and open Reports. Submit an emergency report for East Bank Camp with type `population` and affected population **300**.
3. Watch the admin’s queue update to **92** and check Recent notifications for the report and priority events.
4. Approve the request. As admin, set the warehouse’s water inventory to **220 L** with an alert threshold of **50 L**. In Allocation, allocate the **200 L** request from Central Warehouse. The source falls to **20 L**, triggering a shortage alert.
5. In the delivery tracker, advance the shipment through Dispatched, In Transit, Delivered, and Confirmed. Verify the destination receives **200 L** and review the full delivery history.
6. Open Analytics to review distribution, shortages, unattended requests, and MongoDB field summaries.

The age rule marks a Requested or Approved record critical if its priority is at least 80 and it remains unallocated for 15 minutes from creation. The MySQL Event Scheduler checks every minute. The trigger also evaluates the rule whenever a request is updated.

## Project guide

- [Architecture, relational design, data dictionary, and scoring](docs/design.md)
- [API, WebSocket contract, and MongoDB document model](docs/contracts.md)
- [MySQL CREATE and ALTER statements](db/mysql/init/01-schema.sql)
- [MySQL DROP statements](db/mysql/drop.sql)
- [SQL dashboard queries](server/analytics.mjs)
- [MongoDB pipeline and report worker](server/reports.mjs)
- Screenshots of the [administration screen](docs/screenshots/administration.png), and [mobile volunteer report form](docs/screenshots/volunteer.png)

MySQL initialization scripts run when the database volume is first created. `docker compose stop` stops the services while retaining the data.
