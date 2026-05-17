# FlightPlanner

FlightPlanner is a React + TypeScript flight-planning UI for **flight simulation only**.

> Safety notice: Do not use this project for real-world flight planning, navigation, or operational aviation decisions.

## Tech stack

- React 18
- TypeScript
- Vite
- Leaflet + React-Leaflet

## App location

The runnable frontend app is in `src/`.

```bash
cd src
npm install
npm run dev
```

## Environment variables (`src/.env`)

### Required for airport search and airport lookup

```env
VITE_OPENAIP_API_KEY=your_openaip_api_key
# optional override
VITE_OPENAIP_BASE_URL=https://api.core.openaip.net/api
```

### No key required for METAR

METAR data is fetched from the Aviation Weather Center Data API:
`https://aviationweather.gov/api/data/metar`

## Aviation data sources used

- **Airport search / lookup**: OpenAIP API (`/airports`)
- **METAR weather**: Aviation Weather Center Data API (`/api/data/metar`)

## Notes on Airways / VOR / NDB map layers

For this revision, only METAR and safety disclaimer features were implemented.

Airways/VOR/NDB overlay layers were not integrated yet because a single free source with clear browser-side CORS behavior, stable global coverage, and straightforward legal fit for all three overlay types still needs a final selection and validation in this codebase context.
