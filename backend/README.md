# FlightPlanner Backend

> **Safety notice**: FlightPlanner is intended exclusively for flight simulation.
> METAR data displayed in the UI must not be used for real-world flight planning,
> real navigation, or operational aviation decisions.

The FlightPlanner backend is a **C# / ASP.NET Core (.NET 10 LTS)** API server.
Its two responsibilities are:

1. **METAR proxy** — fetch raw METAR data from AviationWeather server-side and return it to the frontend.
2. **Static frontend serving** — in production, serve the built Vite frontend from `frontend/dist`
   so a single ASP.NET Core process handles both the API and the UI.

---

## Architecture

```
React/Vite Frontend → ASP.NET Core Backend → AviationWeather
```

### Node/TypeScript backend (archived)

The former Node.js/Express backend has been archived to `backend-node-archive/`.
It must not be used as an active backend. See `backend-node-archive/README.md` for details.

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
to make the HTTP request from a server (the ASP.NET Core backend) that is not subject to the
browser CORS restriction, and then return the data to the frontend. CORS is configured in the
backend, never via frontend request headers.

---

## Solution structure

```
backend/
  FlightPlanner.sln                  ← .NET Solution (slnx format, VS 2022/2026)
  FlightPlanner.Api/
    FlightPlanner.Api.csproj         ← net10.0, Nullable enabled, ImplicitUsings enabled
    Program.cs
    Properties/
      launchSettings.json            ← Development profiles (HTTPS 5001, HTTP 5000)
    appsettings.json
    appsettings.Development.json     ← CORS origins for local development
    Controllers/
      HealthController.cs            ← GET /api/health
      MetarController.cs             ← GET /api/metar?icao=EDDF
    Services/
      IAviationWeatherService.cs     ← Interface + AviationWeatherException
      AviationWeatherService.cs      ← HttpClientFactory implementation
    Models/
      HealthResponse.cs
      ErrorResponse.cs               ← { error, details }
    Options/
      CorsOptions.cs                 ← Bound from Cors:AllowedOrigins in appsettings
  FlightPlanner.Api.Tests/
    FlightPlanner.Api.Tests.csproj   ← xUnit, Moq, Microsoft.AspNetCore.Mvc.Testing
    Controllers/
      HealthControllerTests.cs
      MetarControllerTests.cs
      CorsTests.cs
    Services/
      AviationWeatherServiceTests.cs
```

**Project metadata:**
- Nullable Reference Types: enabled
- Implicit Usings: enabled
- Version: 0.1.0
- Test framework: xUnit
- Mocking: Moq + Fake HttpMessageHandler (no real AviationWeather calls in tests)

---

## API endpoints

### `GET /api/health`

Returns the backend status, name, and version.

**Response — 200 OK** (`application/json`)

```json
{
  "status": "ok",
  "name": "FlightPlanner Backend",
  "version": "0.1.0"
}
```

The version is read from the Assembly's `AssemblyInformationalVersionAttribute`.

---

### `GET /api/metar?icao=<ICAO>`

Fetches raw METAR text for the given airport, proxied server-side from AviationWeather.
No API key is required.

```
https://aviationweather.gov/api/data/metar?ids=EDDF&format=raw
```

**Query parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `icao`    | Yes      | ICAO airport code (exactly 4 alphanumeric chars, e.g. `EDDF`). Trimmed and uppercased. |

**Success — 200 OK** (`text/plain`)

```
EDDF 181120Z 26005KT 9999 FEW040 15/07 Q1013 NOSIG
```

**Unified error format** (`application/json`)

```json
{
  "error": "Invalid ICAO code.",
  "details": "ICAO must be exactly 4 alphanumeric characters (e.g. EDDF)."
}
```

**Error responses**

| Status | Cause |
|--------|-------|
| 400    | ICAO missing or not exactly 4 alphanumeric characters |
| 404    | No METAR currently available for this airport |
| 502    | AviationWeather returned an HTTP error |
| 503    | Network error reaching AviationWeather |
| 500    | Unexpected server error |

---

## Swagger / OpenAPI

Swagger UI is available in Development mode:

```
https://localhost:5001/swagger
http://localhost:5000/swagger
```

All endpoints are documented with request parameters and response schemas.

---

## CORS configuration

CORS origins are read from `Cors:AllowedOrigins` in `appsettings.json` /
`appsettings.Development.json`. The wildcard `*` is never used.

**`appsettings.Development.json`:**

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://localhost:5173"
    ]
  }
}
```

For production, set `Cors:AllowedOrigins` via environment variables:

```powershell
# Windows PowerShell
$env:Cors__AllowedOrigins__0 = "https://flightplanner.example.com"
```

```bash
# Linux/macOS
export Cors__AllowedOrigins__0=https://flightplanner.example.com
```

---

## Port configuration

The default ports are set in `Properties/launchSettings.json`:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`

To use different ports, either:
1. Edit `launchSettings.json` for local development, or
2. Set the `ASPNETCORE_URLS` environment variable:

```powershell
$env:ASPNETCORE_URLS = "https://localhost:7001;http://localhost:7000"
dotnet run
```

```bash
ASPNETCORE_URLS="https://localhost:7001;http://localhost:7000" dotnet run
```

---

## Local HTTPS development

ASP.NET Core uses a development certificate for local HTTPS. First-time setup:

```powershell
# Windows PowerShell (run once)
dotnet dev-certs https --trust
```

```bash
# Linux/macOS (run once)
dotnet dev-certs https --trust
```

This creates and trusts a self-signed certificate for `localhost`.

**Frontend note**: Vite's dev server proxy forwards `/api/*` to `https://localhost:5001`
with `secure: false` to accept the self-signed certificate.

---

## Frontend `.env` configuration (`VITE_API_BASE_URL`)

The frontend reads `VITE_API_BASE_URL` to determine the backend base URL.

**`frontend/.env`:**

```env
VITE_API_BASE_URL=https://localhost:5001
```

If `VITE_API_BASE_URL` is not set, the frontend automatically falls back to `https://localhost:5001`.
The port must not be hard-wired in frontend production code; always use `VITE_API_BASE_URL`.

---

## Local development

Run the **backend** and **frontend** in separate terminals.

### Backend (Terminal 1)

**Windows PowerShell**

```powershell
cd backend
dotnet dev-certs https --trust   # first time only
dotnet run --project FlightPlanner.Api
# or for HTTPS explicitly:
dotnet run --project FlightPlanner.Api --launch-profile https
```

**Linux/macOS**

```bash
cd backend
dotnet dev-certs https --trust   # first time only
dotnet run --project FlightPlanner.Api
```

**Visual Studio 2026**

1. Open `backend/FlightPlanner.sln` in Visual Studio 2026.
2. Set `FlightPlanner.Api` as the startup project.
3. Select the `https` launch profile.
4. Press **F5** or click **Run**. Swagger UI opens automatically at `https://localhost:5001/swagger`.
5. Start the frontend separately (see below).
6. Ensure `frontend/.env` contains `VITE_API_BASE_URL=https://localhost:5001`.

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

Vite's dev server proxies `/api/*` to `https://localhost:5001`.

---

## Backend tests

**Windows PowerShell / Linux/macOS**

```bash
cd backend
dotnet test
```

**Visual Studio 2026**

Use the Test Explorer: `Test → Run All Tests`.

### What is tested

- `GET /api/health` — status, name, version
- `GET /api/metar` — valid/invalid ICAO, normalisation, plain text response
- Empty AviationWeather response (404)
- AviationWeather HTTP errors (502)
- Network errors (503)
- Unified error format `{ error, details }`
- CORS: allowed/disallowed origins
- No real AviationWeather calls (all mocked with Moq / Fake HttpMessageHandler)

---

## Production build

Build frontend and backend separately, then start the backend.

**Windows PowerShell**

```powershell
# Build frontend
cd frontend
npm run build

# Restore and build backend
cd ..\backend
dotnet restore
dotnet build --configuration Release

# Run backend (serves frontend/dist automatically)
dotnet run --project FlightPlanner.Api --configuration Release
```

**Linux/macOS**

```bash
cd frontend && npm run build
cd ../backend
dotnet restore
dotnet build --configuration Release
dotnet run --project FlightPlanner.Api --configuration Release
```

A single `dotnet run` process serves:
- `GET /api/health` — health check
- `GET /api/metar?icao=<ICAO>` — METAR proxy
- Swagger UI (in Development environment)
- All other paths — `frontend/dist/index.html` (SPA fallback) or static assets

---

## Notes

- **No API key** for AviationWeather is required.
- **METAR format**: raw text via `format=raw`.
- **Framework**: .NET 10 LTS, ASP.NET Core, classic Controllers (no Minimal APIs).
- **Swagger**: Swashbuckle.AspNetCore 9.x, available in Development only.
- **HttpClient**: managed by `HttpClientFactory` for proper connection pooling.
- **FlightPlanner** is for flight simulation only.
