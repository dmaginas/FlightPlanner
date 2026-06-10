# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

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

## Code Quality Principles

### SOLID

- **Single Responsibility** — every class, service, and component has exactly one reason to change. Controllers only route and map HTTP; services only call external APIs; components only render UI.
- **Open/Closed** — extend behaviour by adding new implementations (e.g. a new `ExportStrategy`, a new service), not by modifying existing ones.
- **Liskov Substitution** — implementations must be fully substitutable for their interface/base type without breaking callers. Do not narrow preconditions or widen postconditions.
- **Interface Segregation** — keep interfaces small and focused. A service interface exposes only the methods its callers actually need; don't bundle unrelated operations.
- **Dependency Inversion** — depend on abstractions, not concretions. Backend services are injected via their interface (`IChartService`, `INotamService`, …). React components receive data and callbacks as props rather than importing singletons.

### Clean Code (Robert C. Martin)

**Naming**
- Names must reveal intent. A name that requires a comment is a bad name.
- Use searchable, pronounceable names. Avoid encodings, prefixes, and noise words (`data`, `info`, `manager`).
- Functions are verbs (`fetchRoute`, `drawPage`). Classes and types are nouns (`ChartService`, `RouteResult`).

**Functions**
- Functions do one thing. If a function does more than its name says, extract the extra behaviour.
- Keep functions short. The ideal size is visible without scrolling.
- No side effects — a function named `get…` must not mutate state.
- Prefer fewer arguments. More than two or three arguments is a signal to introduce a parameter object.

**Comments**
- Don't add comments that restate what the code already says.
- A comment is warranted only when it explains *why*, not *what* — a hidden constraint, a non-obvious invariant, or a workaround for an external bug.
- Obsolete comments are worse than no comments; delete them when the code changes.

**Error Handling**
- Use typed exceptions / typed error kinds; never swallow errors silently.
- Error handling is a separate concern — don't mix business logic with catch blocks.
- Return meaningful error information so callers can react appropriately.

**Structure**
- The Newspaper Metaphor: high-level concepts at the top of a file, details further down.
- Keep related code close together; unrelated code far apart.
- No dead code. Remove unused functions, variables, and imports immediately.
- The Boy Scout Rule: leave every file slightly cleaner than you found it.

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

Frontend API keys go in `frontend/.env` (gitignored). See `frontend/.env.example` for all variables.

- **OpenAIP** (`VITE_OPENAIP_API_KEY`) — register at https://www.openaip.net → My Account → API Keys
- **OpenWeatherMap** (`VITE_OWM_API_KEY`) — register at https://openweathermap.org/api → Free plan → API keys tab → copy the default key (activates within minutes). Without this key the CLOUDS layer toggle is hidden.

### SID/STAR procedure database (one-time import)

Requires X-Plane CIFP files. Run once to populate `NavData/procedures.sqlite`:
```bash
cd backend
# Use X-Plane's full navdata for best coordinate coverage (~99.6%)
dotnet run --project FlightPlanner.Api -- import-cifp "<cifp-dir>" "<navdata-dir>"

# Example with X-Plane 12:
dotnet run --project FlightPlanner.Api -- import-cifp \
  "D:\X-Plane 12\Resources\default data\CIFP" \
  "D:\X-Plane 12\Resources\default data"
```

The database is written to `bin/Debug/net10.0/NavData/procedures.sqlite`. Without it, `GET /api/procedures/{icao}` returns 503. The importer reads `earth_fix.dat` and `earth_nav.dat` from `<navdata-dir>` for fix coordinate resolution.

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
