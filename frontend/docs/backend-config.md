# Backend Configuration — FlightPlanner Frontend

This document explains how to run the FlightPlanner React/Vite frontend against either the
legacy **Node.js/TypeScript** backend or the new **C#/ASP.NET Core** backend.

---

## Overview

Backend selection happens **at build/start time** via a `.env` file.
There is **no runtime UI switch** — you restart the dev server (or rebuild) to change backend.

The central configuration lives in:

- `frontend/.env` — your local environment (not committed)
- `frontend/.env.example` — template to copy and fill in
- `frontend/src/config/apiConfig.ts` — reads and validates the env variables
- `frontend/src/api/apiClient.ts` — thin HTTP client that uses the resolved base URL
- `frontend/src/services/metarService.ts` — METAR-specific service, uses apiClient

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BACKEND` | **Yes** | `node` or `aspnet` |
| `VITE_NODE_API_BASE_URL` | No | Base URL of the Node.js backend. Default: `http://localhost:3001` |
| `VITE_ASPNET_API_BASE_URL` | No | Base URL of the ASP.NET backend. Default: `https://localhost:5001` |
| `VITE_API_BASE_URL` | No | Legacy alias for `VITE_ASPNET_API_BASE_URL`. Kept for backward compat. |
| `VITE_OPENAIP_BASE_URL` | No | OpenAIP airport search API base URL. Unrelated to backend selection. |
| `VITE_OPENAIP_API_KEY` | No | Your OpenAIP API key. Unrelated to backend selection. |

---

## Ports / Base URLs

Both ports were **derived from the codebase**, not assumed:

| Backend | Source | Default URL |
|---|---|---|
| Node.js (`backend-node-archive`) | `backend-node-archive/.env` → `PORT=3001` | `http://localhost:3001` |
| ASP.NET (`backend`) | `backend/FlightPlanner.Api/Properties/launchSettings.json` → `applicationUrl` | `https://localhost:5001` (HTTPS) |

The ASP.NET backend also listens on `http://localhost:5000` (HTTP-only profile).
Use `http://localhost:5000` in `VITE_ASPNET_API_BASE_URL` if you do not have a dev certificate set up.

---

## Running Against the Node.js/TypeScript Backend

1. Copy the example env file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Set your backend:
   ```
   VITE_API_BACKEND=node
   VITE_NODE_API_BASE_URL=http://localhost:3001
   ```

3. Start the Node.js backend (from the repo root):
   ```bash
   cd backend-node-archive
   npm install
   npm run dev     # or: npm start
   ```
   The backend listens on `http://localhost:3001` by default.

4. Start the frontend dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The Vite dev server will proxy `/api/*` requests to `http://localhost:3001`.

---

## Running Against the C#/ASP.NET Core Backend

1. Copy the example env file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Set your backend:
   ```
   VITE_API_BACKEND=aspnet
   VITE_ASPNET_API_BASE_URL=https://localhost:5001
   ```

3. Start the ASP.NET backend (from the repo root):
   ```bash
   cd backend
   dotnet run --project FlightPlanner.Api --launch-profile https
   ```
   The backend listens on `https://localhost:5001` (and `http://localhost:5000`).

   > **Tip**: If you do not have a dev certificate, use the HTTP profile:
   > ```bash
   > dotnet run --project FlightPlanner.Api --launch-profile http
   > ```
   > and set `VITE_ASPNET_API_BASE_URL=http://localhost:5000`.

4. Start the frontend dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The Vite dev server will proxy `/api/*` requests to `https://localhost:5001`.

---

## Building for Production

```bash
cd frontend
npm run build
```

The `dist/` folder can be served by the ASP.NET backend as static files
(it already has a static-files middleware configured for `frontend/dist`).

For production you would set `VITE_API_BACKEND=aspnet` (or `node`) in your CI/CD environment
before running the build. The base URL is baked into the bundle at build time.

---

## CORS

The frontend communicates with the backend via `/api/*` routes.

- In **development**: Vite's dev proxy forwards requests, so the browser never sees a cross-origin
  request and CORS is not an issue.
- In **production** (ASP.NET serves the frontend bundle): Both frontend and backend share the same
  origin, so CORS is not needed.
- If you **deploy the frontend separately** (e.g. CDN) and point it at a standalone backend, you
  **must** enable CORS on the backend for the frontend's origin.
  - **ASP.NET**: Add the frontend origin to `Cors:AllowedOrigins` in `appsettings.json`.
  - **Node.js**: Add the frontend origin to `ALLOWED_ORIGINS` in `backend-node-archive/.env`.

---

## Architecture Notes

```
.env (VITE_API_BACKEND=aspnet)
  └─► src/config/apiConfig.ts     resolves backend + baseUrl at startup
        └─► src/api/apiClient.ts   thin fetch wrapper, uses apiConfig.baseUrl
              └─► src/services/metarService.ts   domain logic, uses apiClient
                    └─► src/components/WeatherPanel.tsx   UI, uses metarService
```

- `apiConfig.ts` is the **single source of truth** for which backend is active.
- `apiClient.ts` knows nothing about FlightPlanner domain types.
- `metarService.ts` contains backend-specific mapper stubs so future divergence
  between Node.js and ASP.NET response shapes can be handled without touching the UI.
- React components **never** contain hard-coded backend URLs.

---

## Adding a New API Endpoint

1. Add the relative path in the relevant service (e.g. `src/services/someService.ts`):
   ```ts
   import { apiClient } from '../api/apiClient'
   export async function getSomething() {
     return apiClient.get<SomeType>('/api/something')
   }
   ```
2. If the Node.js and ASP.NET responses differ, add mapper functions in the service
   and select the correct one using `apiConfig.backend`.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Console error "VITE_API_BACKEND is not set" | `.env` file missing or not copied | Copy `.env.example` to `.env` |
| Console error "is not a valid backend name" | Typo in `VITE_API_BACKEND` | Use exactly `node` or `aspnet` |
| METAR fails with "network error" | Backend not running | Start the selected backend first |
| METAR fails with CORS error | Frontend deployed separately without CORS config | Enable CORS in the backend for your frontend origin |
| HTTPS self-signed cert error | Dev cert not trusted | Run ASP.NET with `--launch-profile http` and use `http://localhost:5000` |
