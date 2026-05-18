# FlightPlanner Backend

> **Safety notice**: FlightPlanner is intended exclusively for flight simulation.
> METAR data displayed in the UI must not be used for real-world flight planning,
> real navigation, or operational aviation decisions.

The FlightPlanner backend is a Node.js/TypeScript API server built with **Express**.
Its two responsibilities are:

1. **METAR proxy** — fetch raw METAR data from AviationWeather server-side and return it to the frontend.
2. **Static frontend serving** — in production, serve the built Vite frontend from `frontend/dist`
   so a single Node process handles both the API and the UI.

---

## Why a backend for METAR?

Browsers block direct requests to AviationWeather because the service does not return the
`Access-Control-Allow-Origin` response header required by the
[CORS specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

```
Access to fetch at 'https://aviationweather.gov/api/data/metar?ids=EDDF&format=raw'
from origin 'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Why `Access-Control-Allow-Origin` cannot be fixed in frontend code

`Access-Control-Allow-Origin` is a **response header** that must be set by the responding
server (AviationWeather). A browser does not allow client-side JavaScript to add or override
this header in outgoing requests — it would be a security bypass. The only correct solution is
to make the HTTP request from a server that is not subject to the browser CORS restriction,
and then return the data to the frontend. That is what this backend does.

---

## API endpoints

### `GET /api/health`

Returns the backend status, name, and version (from `package.json`).

**Response — 200 OK**

```json
{
  "status": "ok",
  "name": "FlightPlanner Backend",
  "version": "0.1.0"
}
```

---

### `GET /api/metar?icao=<ICAO>`

Fetches raw METAR text for the given airport, proxied server-side from AviationWeather.

**Query parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `icao`    | Yes      | ICAO airport code (4 alphanumeric chars, e.g. `EDDF`) |

**Success — 200 OK** (`text/plain`)

```
EDDF 181120Z 26005KT 9999 FEW040 15/07 Q1013 NOSIG
```

**Error responses**

| Status | `error` field        | Cause |
|--------|----------------------|-------|
| 400    | `invalid_icao`       | ICAO missing or not 4 alphanumeric characters |
| 404    | `not_found`          | No METAR currently available for this airport |
| 502    | `upstream_error`     | AviationWeather returned an HTTP error |
| 503    | `service_unavailable`| Network error reaching AviationWeather |
| 500    | `internal_error`     | Unexpected server error |

**Error body example**

```json
{
  "error": "invalid_icao",
  "message": "Query parameter \"icao\" must be exactly 4 alphanumeric characters (e.g. EDDF)."
}
```

---

## Environment variables

Copy `.env.example` to `.env` and edit as needed.

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/macOS
cp .env.example .env
```

| Variable          | Default                   | Description |
|-------------------|---------------------------|-------------|
| `PORT`            | `3001`                    | Port the backend listens on |
| `ALLOWED_ORIGINS` | `http://localhost:5173`   | Comma-separated list of origins allowed by CORS |

---

## Local development

Run the **frontend** and **backend** in separate terminals.

### Backend (Terminal 1)

**Windows PowerShell**

```powershell
cd backend
Copy-Item .env.example .env   # first time only
npm install                   # first time only
npm run build
npm start
# or for watch/reload: npx ts-node src/server.ts
```

**Linux/macOS**

```bash
cd backend
cp .env.example .env   # first time only
npm install            # first time only
npm run build
npm start
```

### Frontend (Terminal 2)

**Windows PowerShell**

```powershell
cd frontend
npm install   # first time only
npm run dev
```

**Linux/macOS**

```bash
cd frontend
npm install   # first time only
npm run dev
```

The Vite dev server proxies `/api/*` requests to `http://localhost:3001`, so METAR data
is served from the local backend during development.

---

## Production build

Build both the frontend and the backend.

**Windows PowerShell**

```powershell
# Build frontend
cd frontend
npm run build

# Build backend
cd ..\backend
npm run build
```

**Linux/macOS**

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd ../backend && npm run build
```

---

## Start in production

The backend serves the built frontend from `frontend/dist` automatically.
All non-API routes fall back to `frontend/dist/index.html` so client-side routing works.

**Windows PowerShell**

```powershell
cd backend
$env:PORT = "3001"
$env:ALLOWED_ORIGINS = "https://flightplanner.example.com"
node dist/server.js
```

**Linux/macOS**

```bash
cd backend
PORT=3001 ALLOWED_ORIGINS=https://flightplanner.example.com node dist/server.js
```

Or set variables in `backend/.env` and let dotenv load them at startup.

A single `node dist/server.js` process serves:
- `GET /api/health` — health check
- `GET /api/metar?icao=<ICAO>` — METAR proxy
- All other paths — `frontend/dist/index.html` (SPA fallback) or static assets

---

## Notes

- **Nginx**: For production deployments that require TLS termination, load balancing, or
  reverse proxying, Nginx can be placed in front of the Node process. No Nginx configuration
  file is included in this repository.

- **Docker**: No `Dockerfile` or `docker-compose.yml` is included. The backend is a plain
  Node process and can be containerised independently if needed.

- **Frontend dist path**: The backend resolves `frontend/dist` relative to its own location
  at `backend/src/config/env.ts → FRONTEND_DIST_PATH`. In the compiled output the path
  resolves to `<repo-root>/frontend/dist`.
