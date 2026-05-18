
# FlightPlanner

FlightPlanner is a React + TypeScript flight-planning UI for **flight simulation only**.

> Safety notice: Do not use this project for real-world flight planning, navigation, or operational aviation decisions.

## Repository structure

```
FlightPlanner/
  frontend/              ← React/Vite app
  backend/               ← ASP.NET Core backend (.NET 10 LTS) — see backend/README.md
  backend-node-archive/  ← Former Node/TypeScript backend (archived, not active)
  docs/                  ← Design documents and research
```

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Leaflet + React-Leaflet
- **Backend**: C# / ASP.NET Core (.NET 10 LTS) — see [backend/README.md](backend/README.md)

> The former Node.js/TypeScript/Express backend has been archived to `backend-node-archive/`.
> See [backend-node-archive/README.md](backend-node-archive/README.md) for details.

## Frontend

The runnable frontend app is in `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

## Environment variables (`frontend/.env`)

### Required for airport search and airport lookup

```env
VITE_OPENAIP_API_KEY=your_openaip_api_key
# optional override
VITE_OPENAIP_BASE_URL=https://api.core.openaip.net/api
```

### ASP.NET Core backend URL

```env
# Points to the local ASP.NET Core backend (default: https://localhost:5001)
VITE_API_BASE_URL=https://localhost:5001
```

### METAR (no key required)

METAR data is fetched via the ASP.NET Core backend (`/api/metar`), which proxies requests to
AviationWeather server-side. This avoids the browser CORS restriction that would otherwise
block direct requests to `https://aviationweather.gov`.

See [backend/README.md](backend/README.md) for full backend documentation including Swagger,
CORS configuration, HTTPS setup, and Visual Studio 2026 instructions.

## Aviation data sources used

- **Airport search / lookup**: OpenAIP API (`/airports`)
- **METAR weather**: Aviation Weather Center Data API (`/api/data/metar`) — proxied via ASP.NET Core backend

## Notes on Airways / VOR / NDB map layers

For this revision, only METAR and safety disclaimer features were implemented.

Airways/VOR/NDB overlay layers were not integrated yet because a single free source with clear
browser-side CORS behavior, stable global coverage, and straightforward legal fit for all three
overlay types still needs a final selection and validation in this codebase context.
