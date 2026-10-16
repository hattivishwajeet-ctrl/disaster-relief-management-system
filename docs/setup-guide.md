# Development Setup Guide

## 1. Overview

This guide describes the planned local development environment for the Disaster Relief Resource Allocation and Emergency Response Management System on Windows.

The project uses Next.js, Node.js, Express, MySQL, MongoDB, and Socket.IO.

**Status:** Initial setup guide. Commands and configuration will be updated as the project is implemented.

## 2. Prerequisites

Install the following software:

- Git for Windows
- Node.js LTS and npm
- MySQL Server
- MongoDB Community Server, configured as a replica set
- Visual Studio Code or another suitable code editor

Verify Git and Node.js installations using PowerShell:

```powershell
git --version
node --version
npm --version
```

Verify MySQL availability using the MySQL client or your installed database management tool.

Verify MongoDB availability using:

```powershell
mongosh
```

## 3. Clone the Repository

Replace `YOUR_GITHUB_USERNAME` with the account that owns the repository.

```powershell
git clone https://github.com/YOUR_GITHUB_USERNAME/disaster-relief-management-system.git
cd disaster-relief-management-system
```

## 4. Planned Project Structure

The repository will contain the following main components:

- `frontend/` — Next.js application.
- `backend/` — Node.js and Express API.
- `database/mysql/` — MySQL schema, procedures, triggers, views, and seed scripts.
- `database/mongodb/` — MongoDB setup and sample document definitions.
- `tests/` — Automated and manual test resources.
- `docs/` — Project documentation.

These directories will be added as development begins.

## 5. Environment Configuration

Create local environment files only when the relevant application components are implemented.

Examples of configuration values may include:

- MySQL host, port, database, username, and password.
- MongoDB connection URI.
- Backend API port.
- Frontend API base URL.
- Authentication secrets.

Use `.env.example` to document required variable names with placeholder values.

Never commit real passwords, database credentials, authentication secrets, or populated local `.env` files.

## 6. MySQL Setup

1. Install and start MySQL Server.
2. Create a dedicated database for the application.
3. Create a database user with appropriate privileges.
4. Apply the project's schema and seed scripts when they become available.
5. Verify that the backend can connect to MySQL.

Database creation scripts and the final schema will be documented separately.

## 7. MongoDB Setup

1. Install and start MongoDB.
2. Configure MongoDB as a replica set.
3. Initialize the replica set using the configuration appropriate to the local installation.
4. Verify that the replica set has a primary member.
5. Configure the backend connection URI.
6. Verify that MongoDB Change Streams work with the configured deployment.

The exact commands depend on the MongoDB installation and configuration.

## 8. Install Application Dependencies

Once the frontend and backend packages have been created, install their dependencies from the relevant project directories.

For example:

```powershell
cd frontend
npm install
```

In a separate terminal:

```powershell
cd backend
npm install
```

These commands assume that the corresponding `package.json` files exist.

## 9. Run the Application

The actual development commands will be documented after the frontend and backend have been initialized.

The intended development workflow is:

1. Start MySQL.
2. Start MongoDB with replica-set support.
3. Start the backend API and real-time event handlers.
4. Start the Next.js frontend.
5. Open the local frontend URL shown in the terminal.
6. Verify API connectivity, database access, and live updates.

## 10. Troubleshooting

### MySQL connection failure
Check that MySQL is running and that the configured credentials, host, port, and database name are correct.

### MongoDB Change Streams failure
Verify that MongoDB is configured as a replica set and that the connection is directed to the correct deployment.

### Node.js dependency errors
Confirm that the installed Node.js version is compatible with the project's dependencies and that `npm install` completed successfully.

### Real-time updates not appearing
Check the backend logs, browser console, WebSocket connection, authentication, and event subscription permissions.

## 11. Security Notes

- Keep credentials outside source control.
- Use separate development and production configurations.
- Restrict database users to the privileges they require.
- Do not expose database ports unnecessarily.
- Validate inputs and enforce authorization in the backend.

## 12. Implementation Status

This guide documents the intended development environment. It will be updated with verified installation steps, scripts, and configuration once the application is initialized and tested.
