# EcoSmart Ballari — Smart Waste Management

Location-Based Garbage Management System for Ballari, Karnataka. The project contains static HTML dashboards and one shared Node.js, Express, and MySQL backend.

## Run locally

1. Copy `backend/.env.example` to `backend/.env`, then set your local database, JWT, Resend, and Gemini values. Never commit `.env`.
2. Copy `maps-config.example.js` to `maps-config.js`, then set a browser-restricted Google Maps key. Never commit `maps-config.js`.
3. Configure `backend/.env` with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and optionally `PORT=5000`.
4. Start the API:

   ```powershell
   cd backend
   node server.js
   ```

5. Open the project root with VS Code Live Server and use `index.html`.

Demo accounts:

- Admin: `admin@ecotech.com` / `Admin@123`
- Driver: `ramesh.driver@ecotech.com` / `Driver@123`

## Dashboards

- `admin-dashboard/index.html` — Admin workspace
- `driver-dashboard/index.html` — Driver mobile-first workspace
- `citizen-dashboard/index.html` — Citizen service portal

## Backend APIs

All protected endpoints require `Authorization: Bearer <JWT>`.

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`

### Admin-only APIs

- `GET /api/admin/dashboard`
- `GET|POST /api/admin/bins`, `PUT|DELETE /api/admin/bins/:id`, `PUT /api/admin/bins/:id/assign`
- `GET|POST /api/admin/drivers`, `PUT|DELETE /api/admin/drivers/:id`
- `GET /api/admin/citizens`, `PUT /api/admin/citizens/:id/status`, `DELETE /api/admin/citizens/:id`
- `GET|POST /api/admin/routes`, `PUT|DELETE /api/admin/routes/:id`
- `GET /api/admin/requests`, `PUT /api/admin/requests/:id`
- `GET /api/admin/complaints`, `PUT|DELETE /api/admin/complaints/:id`
- `GET /api/admin/live-locations`
- `GET /api/admin/notifications`, `PUT /api/admin/notifications/:id/read`, `DELETE /api/admin/notifications/:id`
- `GET|PUT /api/admin/settings`
- `GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Driver-only APIs

- Dashboard, assigned bins/route, collection completion or skip, location tracking, history, notifications, profile, problem reporting, and status under `/api/driver`.

### Citizen-only APIs

- `GET /api/citizen/dashboard`
- `GET /api/citizen/bins`
- `GET|POST /api/citizen/requests`, `PUT /api/citizen/requests/:id/cancel`
- `GET|POST /api/citizen/complaints`
- `GET /api/citizen/notifications`, `PUT /api/citizen/notifications/:id/read`, `DELETE /api/citizen/notifications/:id`
- `GET|PUT /api/citizen/profile`

## Database migrations

Run the non-destructive migrations against the database configured by `DB_NAME`:

- `backend/migrations/002_driver_module.sql`
- `backend/migrations/003_admin_module.sql`
- `backend/migrations/004_citizen_module.sql` (or run `node backend/scripts/migrateCitizen.js`)

Demo setup scripts:

```powershell
cd backend
node scripts/seedAdmin.js
node scripts/seedDriver.js
```
