# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

**Never commit or push without explicit instruction from the user.** Make all code changes first, then wait for the user to say "commit", "push", or similar before running any `git commit` or `git push` commands.

## Versioning

Bump the version on every change before committing:

- **Frontend change** → increment `version` in `frontend/package.json` (displayed in the TopBar at runtime via `__APP_VERSION__`)
- **Backend change** → increment `version` in `backend/FlightPlanner.Api/FlightPlanner.Api.csproj` (`<Version>` tag)

Use [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`
- `PATCH` — bug fix or small tweak
- `MINOR` — new feature, backwards compatible
- `MAJOR` — breaking change

## Project Language

**The project language is English.** All source code, UI strings, comments, variable names, log messages, error messages, and API responses must be in English. Conversation with the user may be in any language, but everything written into the codebase must be English.

## Commands

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install          # install dependencies
npm run dev          # dev server at http://localhost:5173 (proxies /api/* to backend)
npm run build        # production build → frontend/dist
npm run preview      # preview production build
```

### Backend (ASP.NET Core .NET 10)
```bash
cd backend
dotnet run --project FlightPlanner.Api                          # dev mode, HTTP :5000 / HTTPS :5001
dotnet run --project FlightPlanner.Api --configuration Release  # release mode
dotnet test                                                     # run all xUnit tests
dotnet test --filter "FullyQualifiedName~ControllerName"        # run a single test class
```

First-time HTTPS setup:
```bash
dotnet dev-certs https --trust
```

### API Keys (user secrets)
```bash
cd backend/FlightPlanner.Api
dotnet user-secrets set "FlightPlanDatabase:ApiKey" "YOUR_KEY"   # flightplandatabase.com (free)
dotnet user-secrets set "FaaNotam:ApiKey" "YOUR_KEY"             # api.faa.gov (free registration)
```

The OpenAIP key goes in `frontend/.env` as `VITE_OPENAIP_API_KEY`.

## Architecture

### Overview
```
Browser (React SPA)
  └─ /api/* → ASP.NET Core backend (CORS proxy + business logic)
                ├─ AviationWeather.gov   — METAR, TAF (no key)
                ├─ FlightPlanDatabase    — IFR routes (API key)
                ├─ Open Meteo           — GRAMET pressure-level weather (no key)
                ├─ FAA NOTAM API        — NOTAMs (API key)
                └─ OpenAIP              — Airport search (API key, called from frontend)
```

In **production** the backend also serves the compiled frontend from `frontend/dist` as static files, making it a single deployable unit.

In **development** Vite's dev server proxies `/api/*` to the backend (configured in `vite.config.ts`).

### Backend (`backend/FlightPlanner.Api/`)
- **Controllers** — thin CORS proxies: validate ICAO codes, call service, map exceptions to HTTP status codes.
- **Services** — all external HTTP calls live here. Each external API has its own service + interface (`IAviationWeatherService`, `IFlightPlanDatabaseService`, `IGrametService`, `INotamService`).
- **Options** — strongly-typed config classes bound from `appsettings.json` / user secrets (`FlightPlanDatabaseOptions`, `NotamOptions`, `CorsOptions`).
- **Models** — frontend-facing DTOs. Internal API deserialization models are private nested classes inside the service.

Error handling pattern: services throw typed exceptions (`AviationWeatherException`, `FlightPlanDatabaseException`, `NotamException`) with an `ErrorKind` enum. Controllers catch by kind and return the appropriate HTTP status.

Route results from FlightPlanDatabase are cached in-memory (default 30 min TTL) via `IMemoryCache`.

### Frontend (`frontend/src/`)
- **`api/apiClient.ts`** — single generic HTTP client used by all services. Handles JSON/text response parsing and throws `ApiClientError` on non-2xx.
- **`config/apiConfig.ts`** — reads `VITE_API_BACKEND` to select base URL at build time.
- **`services/`** — one file per backend endpoint (`metarService.ts`, `tafService.ts`, `notamService.ts`, `routeService.ts`, `grametService.ts`). Each exports typed records and a typed error class.
- **`components/`** — React components. `MainScreen.tsx` is the root layout (3-column grid). Each panel is a self-contained component that manages its own fetch lifecycle with `useEffect` + `AbortController`.

### Screens
The app has multiple full-screen views managed in `App.tsx`: `MainScreen` (flight planning), `SIDScreen`, `STARScreen`, `GRAMETScreen`. Navigation between them is passed down as `onNavigate` callbacks.
