
# FlightPlanner

FlightPlanner is a React + TypeScript flight-planning UI for **flight simulation only**.

> Safety notice: Do not use this project for real-world flight planning, navigation, or operational aviation decisions.

## Repository structure

```
FlightPlanner/
  frontend/   ← React/Vite app (previously src/)
  backend/    ← Node/TypeScript API backend (see backend/README.md)
  docs/       ← Design documents and research
```

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Leaflet + React-Leaflet
- **Backend**: Node.js, TypeScript, Express — see [backend/README.md](backend/README.md)

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

### METAR (no key required)

METAR data is fetched via the project backend (`/api/metar`), which proxies requests to
AviationWeather server-side. This avoids the browser CORS restriction that would otherwise
block direct requests to `https://aviationweather.gov`.

See [backend/README.md](backend/README.md) for details.

## Aviation data sources used

- **Airport search / lookup**: OpenAIP API (`/airports`)
- **METAR weather**: Aviation Weather Center Data API (`/api/data/metar`) — proxied via backend

## Notes on Airways / VOR / NDB map layers

For this revision, only METAR and safety disclaimer features were implemented.

Airways/VOR/NDB overlay layers were not integrated yet because a single free source with clear
browser-side CORS behavior, stable global coverage, and straightforward legal fit for all three
overlay types still needs a final selection and validation in this codebase context.
