# Flight Plan Database Integration

## Overview

FlightPlanner uses the [Flight Plan Database API](https://flightplandatabase.com/dev/api) to search for real IFR flight plans between airports. The API key is stored server-side only and is never exposed to the browser.

```
React/Vite Frontend
  → FlightPlanner Backend (ASP.NET or Node.js)
    → Flight Plan Database API
```

---

## API Documentation Reference

- **Official docs:** https://flightplandatabase.com/dev/api
- **Authentication:** HTTP Basic Auth — API key as username, empty password

---

## Endpoints Used

### Primary: Search Plans

```
GET https://api.flightplandatabase.com/search/plans
  ?fromICAO=EDDF
  &toICAO=EGLL
  &limit=5
  &sort=popularity
```

Returns a list of existing IFR flight plans (metadata only — no full waypoints in the list view).

### Secondary: Fetch Full Plan

```
GET https://api.flightplandatabase.com/plan/{id}
```

Returns the full plan including `route.nodes` (waypoints with lat/lon).

**Strategy:** Search returns up to 5 plan summaries → fetch full details for the top plan (2 API calls). The first plan from the API order becomes `selectedRoute`; the remaining 4 summaries become `alternatives`.

---

## What the FPD API Does and Does Not Support

| Parameter | Supported by FPD API? | Notes |
|---|---|---|
| `fromICAO` / `toICAO` | ✅ Yes | Core search parameters |
| `limit` / `sort` | ✅ Yes | Pagination and ordering |
| Aircraft Type | ❌ No | Accepted by our `/api/routes` endpoint; used for client-side enrichment (ETA, fuel estimate) |
| Cruising Altitude | ❌ No | Accepted by our `/api/routes` endpoint; used for altitude label |
| IFR / VFR filter | ❌ No | Only IFR is implemented in our backend |

The FPD API searches a community database of existing flight plans — it does **not** generate new routes on demand.

---

## Internal Endpoint

Both backends expose an identical interface:

```
GET /api/routes
  ?departure=EDDF        (required — 4-char ICAO)
  &destination=EGLL      (required — 4-char ICAO)
  &aircraftType=B738     (optional — ICAO aircraft code)
  &cruisingAltitude=37000 (optional — altitude in feet)
  &routeType=IFR         (optional — default: IFR; only IFR supported)
```

### Success Response (200)

```json
{
  "selectedRoute": {
    "id": "59970",
    "departure": "EDDF",
    "destination": "EGLL",
    "aircraftType": "B738",
    "cruisingAltitude": 37000,
    "routeType": "IFR",
    "routeText": "ANEKI UL9 KONAN UT420 SILVA",
    "waypoints": [
      { "id": "EDDF", "type": "airport", "lat": 50.033, "lon": 8.570 },
      { "id": "ANEKI", "type": "fix", "lat": 50.112, "lon": 8.020 },
      ...
    ],
    "distanceNm": 356.4,
    "source": "flight-plan-database"
  },
  "alternatives": [
    { "id": "59800", "routeText": "...", "distanceNm": 361.2, "updatedAt": "2023-..." }
  ],
  "warning": null
}
```

### Error Responses

| Status | Error Code | When |
|---|---|---|
| 400 | — | Invalid ICAO code or unsupported routeType |
| 404 | — | No flight plans found |
| 503 | `configuration_error` | API key not configured on the server |
| 502 | — | FPD API returned an error |
| 503 | — | Network error reaching FPD API |

---

## API Key Configuration

### ASP.NET Backend (recommended: User Secrets)

```bash
cd backend
dotnet user-secrets set "FlightPlanDatabase:ApiKey" "YOUR_KEY_HERE"
```

The key is stored in `%APPDATA%\Microsoft\UserSecrets\` (never committed).

`appsettings.json` contains the structure with an empty `ApiKey`:
```json
{
  "FlightPlanDatabase": {
    "ApiKey": "",
    "BaseUrl": "https://api.flightplandatabase.com",
    "CacheTtlMinutes": 30
  }
}
```

> **Important:** A missing or empty `ApiKey` is **not** a silent failure. The backend returns `503 configuration_error` on every route request until the key is set.

### Node.js Archive Backend

Copy `.env.example` to `.env` and fill in your key:

```bash
cp backend-node-archive/.env.example backend-node-archive/.env
# Edit .env:
FLIGHT_PLAN_DATABASE_API_KEY=YOUR_KEY_HERE
FLIGHT_PLAN_DATABASE_BASE_URL=https://api.flightplandatabase.com
FLIGHT_PLAN_DATABASE_CACHE_TTL_MINUTES=30
```

`backend-node-archive/.env` is listed in `.gitignore` and will not be committed.

---

## Caching

Both backends implement **server-side in-memory caching** to conserve API quota.

| Property | Value |
|---|---|
| Cache type | In-memory (Map / IMemoryCache) |
| Default TTL | 30 minutes |
| Cache key | `fpd:{DEPARTURE}:{DESTINATION}:IFR` |
| Cache scope | Per-process; lost on restart |
| Configuration | `CacheTtlMinutes` in appsettings.json / `.env` |

> Aircraft type and cruising altitude are **not** part of the cache key since the FPD API does not filter by these parameters.

---

## Fallback Behaviour

```
User clicks "Calculate Route"
  → Frontend calls /api/routes
    → Backend calls FPD API (or cache hit)
      ✅ Success:        selectedRoute shown, local route suppressed
      ❌ No routes (404): Warning shown, local fallback used
      ❌ API error (502/503): Warning shown, local fallback used
      ❌ Config error (503 configuration_error): Hard error shown, NO fallback
```

The **local frontend fallback** (`mockData.ts: getRoute / generateDynamicRoute`) is preserved long-term as a development and offline fallback. It is marked with `source: "local-fallback"` in the route data.

### UI Messages

| Situation | Message |
|---|---|
| External lookup failed | `"External IFR route lookup failed. Showing locally calculated fallback route."` |
| API key missing | `"Flight Plan Database API key is not configured on the server."` |
| All routes | `"Routes are for simulation/planning use only and must not be used for real-world navigation."` |

---

## Alternative Routes

When the FPD search returns multiple results:
- Plan #1 → `selectedRoute` (full waypoints fetched)
- Plans #2–5 → `alternatives` (metadata only: routeText, distanceNm, updatedAt)

The `AlternativesPanel` component displays alternatives in the left sidebar. This data model is prepared for future interactive route selection.

---

## .gitignore Protection

| File | Protected by |
|---|---|
| `backend-node-archive/.env` | `backend-node-archive/.gitignore` → `.env` |
| ASP.NET User Secrets | Stored in OS profile dir, outside the repo |

---

## Manual Testing

1. **With valid API key:** Click "Calculate Route" → external route appears with `source: flight-plan-database`
2. **Without API key:** Click "Calculate Route" → red "Server configuration error" banner
3. **Uncommon route pair:** External route fails → amber fallback warning, local route shown
4. **Alternatives:** Multiple FPD results → `AlternativesPanel` appears in left sidebar

---

## Known Limitations

- The FPD API is a **community database** — not all city pairs have plans
- **100 API calls/day** typical for free tier (check `X-Limit-Cap` response header)
- Cache is lost on backend restart — costs 1–2 extra API calls per restart per route pair
- `auto/generate` endpoint (automatic route generation) is **not** implemented; its response does not include waypoint coordinates (only encoded polyline)
- Only **IFR** routes are currently supported
