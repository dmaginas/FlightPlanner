# FlightPlanner Aviation Overlay Data Sources Research

**File target:** `docs/aviation-overlays-research.md`  
**Research date:** 2026-05-18  
**Scope:** free/no-cost data sources for FlightPlanner map overlays: High Airways, Low Airways, VORs, and NDBs.  
**Important:** This report is not legal advice. It is a conservative technical and licensing assessment intended to support a later implementation decision.

---

## 1. Executive Summary

### Is there a free/no-cost worldwide source for all four overlays?

**No clearly suitable single source was found** that is both free/no-cost, worldwide, clearly licensed for reuse/redistribution, and covers all four desired overlays:

- High Airways
- Low Airways
- VORs
- NDBs

The strongest free/open candidates are good for **navaids** but not for **global High/Low Airways**. Global airway data appears much harder to obtain with clear rights, current update cycles, usable geometry, and worldwide coverage.

### Is there a good source for VORs/NDBs?

**Yes: OurAirports is the best first-prototype candidate for VOR/NDB overlays.**

Reasons:

- It offers downloadable CSV data, including `navaids.csv`.
- The official data page states that all data is released to the Public Domain and carries no accuracy/fitness guarantee.
- The data is simple to import into GeoJSON or a local cache.
- It is global in scope.
- It does not require an API key.

Airportmap is also promising for navaids because it provides open database downloads under the MIT license, but OurAirports is simpler and more established as a first prototype input.

### Is there a good source for High/Low Airways?

**No clearly suitable free worldwide source for global High/Low Airways was found.**

Potential partial sources exist:

- **FAA NASR/CIFP**: strong for the United States, updated on the FAA cycle, but not worldwide and technically more complex.
- **open flightmaps**: promising public-license aviation data for certain regions, but not a simple worldwide High/Low airway dataset and not obviously the fastest first prototype path.
- **Eurocontrol EAD/AIXM**: technically strong but access, agreements, and usage rights are too constrained/unclear for a free global FlightPlanner overlay.
- **OpenAIP**: useful for many aviation objects and navaids, but the data is licensed under CC BY-NC 4.0, requires API keys for the public API, and is therefore not a clean recommendation for a broadly reusable FlightPlanner feature.

### Is a live API or periodic import more realistic?

A **periodic import** is more realistic than a live frontend API call.

Recommended pattern:

1. Backend or build-time import downloads approved source data.
2. Data is normalized into a compact internal format or GeoJSON.
3. The frontend loads prepared static/vector assets or paginated backend responses.
4. Leaflet renders overlays with clustering/simplification/zoom-dependent loading.

This avoids CORS issues, reduces rate-limit risk, keeps license attribution centralized, and enables preprocessing for performance.

### Which source is most promising?

For the **first prototype**, the most promising source is:

> **OurAirports `navaids.csv` for VOR/NDB overlays.**

It has the best combination of legal clarity, technical simplicity, global scope, and low integration risk.

### Which source should be tested first in a prototype?

**Prototype VOR/NDB overlays first using OurAirports `navaids.csv`.**

Do **not** prototype global High/Low Airways yet as a FlightPlanner feature, because no clearly licensed, free, worldwide, technically simple source was found during this research.

### Go / No-Go by overlay type

| Overlay | Recommendation | Reason |
|---|---:|---|
| VORs | **GO for prototype** | OurAirports provides global navaid data with clear Public Domain terms and simple CSV access. |
| NDBs | **GO for prototype** | Same as VORs; OurAirports contains navaid data suitable for simple point overlays. |
| High Airways | **NO-GO for global prototype** | No clearly licensed, free, worldwide, simple source identified. |
| Low Airways | **NO-GO for global prototype** | Same as High Airways; consider only after separate airway-source/license research. |

---

## 2. Comparison Table

| Source | Traffic-light rating | Free/no-cost | Global coverage | High Airways | Low Airways | VORs | NDBs | Data format | API or download | License/usage risk | Integration effort | Recommendation |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| OurAirports | 🟢 for VOR/NDB; 🔴 for Airways | Yes | Yes | No | No | Yes | Yes | CSV | Download / GitHub | Low; Public Domain stated by source | Low | Use first for VOR/NDB prototype only. |
| Airportmap | 🟡 | Yes | Yes for airports/navaids | Unclear / likely no full airways | Unclear / likely no full airways | Yes | Yes | CSV / SQL | Download / GitHub | Low-to-medium; MIT stated, but source lineage should be checked | Low-to-medium | Secondary candidate for VOR/NDB after OurAirports. |
| OpenAIP | 🟡 | No-cost access, but API key and terms apply | Broad/global community dataset | Not clearly suitable | Not clearly suitable | Yes | Yes | API formats / map data | API / web / exports | Medium; CC BY-NC 4.0 restricts commercial use | Medium | Useful for private/non-commercial experiments, not first prototype. |
| FAA NASR / CIFP / FAA ADDS | 🟡 for US-only; 🔴 for worldwide | Yes/no-cost public FAA downloads | Primarily United States / NAS | Yes, US/NAS-related | Yes, US/NAS-related | Yes | Yes | AIXM, ARINC 424, TXT, CSV/JSON/KML/Shapefile via ADDS | Download / portal | Low-to-medium for US government data; final legal review still needed | High | Good US-only technical reference; not a global FlightPlanner source. |
| Eurocontrol EAD / AIXM | 🔴 / ⚪ | Some access free, professional access restricted | ECAC/ECAC+ / not worldwide | Yes in EAD context | Yes in EAD context | Yes | Yes | AIXM / reports / services | Web/B2B/download depending on agreement | High/unclear; agreements, fees, liability possible | High | Do not use as free FlightPlanner source. |
| OpenStreetMap / Overpass | 🟡 / 🔴 for this use | Yes, ODbL | Global OSM database, but aviation coverage uneven | Not reliable | Not reliable | Possible but incomplete | Possible but incomplete | OSM XML/JSON via Overpass; extracts possible | API / extracts | Medium; ODbL attribution/share-alike obligations | Medium-to-high | Not recommended for aviation overlay correctness; possible supplementary research only. |
| open flightmaps | 🟡 | Public-license data, but conditions apply | Regional downloads; not clearly complete worldwide | Possible regionally | Possible regionally | Likely regionally | Likely regionally | OFMX / derived formats / map products | Downloads | Medium; license conditions and regional coverage need review | High | Promising for regional aviation layers, not first simple global prototype. |
| ICAO GIS / ICAO API Data Service | 🔴 | No | Global/official-ish products available | Possible | Possible | Possible | Possible | Shapefile, API samples, JSON/Excel packages | Store/API | High/cost; paid/store/API-key model | Medium-to-high | Reject as main free/no-cost source. |
| OpenNav | ⚪ / 🔴 | Website is free to browse | Appears global | Unclear | Unclear | Searchable | Searchable | Web pages | Website | Unclear; no clear reusable dataset/license found | High/scraping not recommended | Reject unless explicit data license/API is found. |
| Aero Sors / ClimateViewer-derived navdata | 🔴 | Freeware / CC BY-NC-SA examples | Some global sim-oriented data | Some packages include Europe airways | Some packages include Europe airways | Yes | Yes | Sim-specific packages / GeoJSON/KMZ | Downloads | High; non-commercial/share-alike and source lineage concerns | Medium | Reject for production data source. |
| Navigraph / Jeppesen / GE / Keyvan / AeroDataBox / Aviation Edge | 🔴 | No | Global commercial products | Yes | Yes | Yes | Yes | ARINC/API/proprietary | Paid/API | High/cost/commercial licensing | Medium | Reject as free/no-cost source. |
| OpenSky Network | 🔴 | Research/public API but not navdata | Global aircraft movement data | No | No | No | No | API / datasets | API / research data | Not relevant | N/A | Reject; not a navdata source. |

---

## 3. Detailed Source Evaluation

### 3.1 OurAirports

**Traffic-light rating:** 🟢 **Suitable for VOR/NDB prototype**; 🔴 **Not suitable for Airways**

#### Description

OurAirports provides open data downloads for airports and related aviation objects. Its official open-data page describes CSV data dumps and includes a specific `navaids.csv` file in the GitHub-hosted data repository.

#### Links checked

- OurAirports open data: https://ourairports.com/data/
- OurAirports GitHub data repository: https://github.com/davidmegginson/ourairports-data
- OurAirports navaids list: https://ourairports.com/navaids/list.html

#### Data coverage

- **VORs:** Yes, through navaid data.
- **NDBs:** Yes, through navaid data.
- **High Airways:** No evidence found.
- **Low Airways:** No evidence found.
- **Global scope:** Yes for the dataset family; the navaid page lists navaids around the world.

#### License/usage assessment

OurAirports states that all data is released to the **Public Domain** and comes with no guarantee of accuracy or fitness for use. The GitHub repository is also labelled with the **Unlicense**.

This is the clearest licensing posture found for a first prototype.

#### API/download access

- CSV downloads via GitHub Pages / GitHub repository.
- No API key required.
- Simple import path: CSV -> normalized JSON/GeoJSON -> Leaflet markers.

#### Technical integration

Very simple:

1. Download `navaids.csv` periodically.
2. Filter records by navaid type, e.g. VOR/VOR-DME/VORTAC/NDB variants.
3. Convert latitude/longitude to GeoJSON points.
4. Render with Leaflet markers or clustered markers.

#### CORS/backend/import assessment

Direct frontend CSV fetch may work technically, but the better architecture is a backend or build-time import because it allows caching, attribution, validation, and data versioning.

#### Performance considerations

Navaid point data is manageable compared with global airway linework. For Leaflet, a global marker layer should still use zoom-dependent rendering or marker clustering if the point count becomes large.

#### Risks

- Data quality and currency are community-maintained and not guaranteed.
- It does not solve Airways.
- Must be clearly labelled as simulation-only.

#### Recommendation

**Use OurAirports first for VOR/NDB overlay prototyping.** This best matches the requested priority: legal clarity and technical simplicity.

---

### 3.2 Airportmap

**Traffic-light rating:** 🟡 **Partially suitable**

#### Description

Airportmap provides open database downloads with airports, runways, frequencies, and navaids. The data page says the files are provided under the MIT License and can be downloaded in CSV/SQL formats.

#### Links checked

- Airportmap open databases: https://airportmap.de/data
- Airportmap database GitHub repository: https://github.com/komed3/airportmap-database
- Airportmap about/disclaimer: https://airportmap.de/about

#### Data coverage

- **VORs:** Yes, via navaid dataset.
- **NDBs:** Yes, via navaid dataset.
- **High Airways:** Not clearly covered.
- **Low Airways:** Not clearly covered.
- **Global scope:** The site describes worldwide airport data and navaids.

#### License/usage assessment

Airportmap’s data page states that files are provided under the **MIT License**. This is permissive, but a conservative review should still inspect source lineage because Airportmap states that its basic data is compiled from various public sources and searchable databases.

#### API/download access

- CSV and SQL downloads via GitHub repository.
- No obvious API key requirement for downloads.

#### Technical integration

Similar to OurAirports: CSV -> GeoJSON -> Leaflet markers.

#### CORS/backend/import assessment

A periodic import is preferable. Direct frontend fetching from GitHub/raw URLs is fragile.

#### Performance considerations

Similar to OurAirports; point overlays should be manageable.

#### Risks

- Source lineage needs more review before production use.
- Like OurAirports, it does not appear to solve global Airways.

#### Recommendation

Good secondary candidate for VOR/NDB if OurAirports lacks required fields. For a first prototype, prefer OurAirports because it has clearer public-domain positioning and a simpler official dataset story.

---

### 3.3 OpenAIP

**Traffic-light rating:** 🟡 **Partially suitable**

#### Description

OpenAIP is a crowd-sourced aeronautical information platform. It provides a large dataset and public API. Its website and docs indicate that navaids are available, including VOR/DME/NDB-related facilities.

#### Links checked

- OpenAIP homepage/license summary: https://www.openaip.net/
- OpenAIP legal terms: https://www.openaip.net/legal
- OpenAIP API documentation: https://docs.openaip.net/
- OpenAIP API schema: https://api.core.openaip.net/api/system/specs/v1/schema.json
- OpenAIP navaids overview: https://www.openaip.net/data/navaids

#### Data coverage

- **VORs:** Yes.
- **NDBs:** Yes.
- **High Airways:** Not clearly verified as available in a directly reusable way.
- **Low Airways:** Not clearly verified as available in a directly reusable way.
- **Global scope:** Broad community dataset; exact completeness varies.

#### License/usage assessment

OpenAIP states that its data is licensed under **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**. This is a significant limitation for any public app or future commercial usage. The API also requires an API key and has rate limits.

Because the project should be conservative, OpenAIP should **not** be marked green for FlightPlanner unless the project is strictly non-commercial and the license obligations are accepted.

#### API/download access

- Public API requires API keys.
- Rate limits are documented.
- API keys should not be exposed in a public frontend; backend proxy would be needed.

#### Technical integration

Technically feasible but more complex than OurAirports:

- API key handling.
- Rate-limit handling.
- Backend proxy/cache.
- License attribution and non-commercial restrictions.

#### CORS/backend/import assessment

Use a backend proxy/import if used at all. Do not call OpenAIP directly from the frontend with an API key.

#### Performance considerations

Data should be cached/imported and simplified, not fetched live per map pan/zoom.

#### Risks

- Non-commercial license may block or complicate future use.
- Completeness may vary by region.
- API limits and key management.

#### Recommendation

Useful for private experiments and comparison, but **not the first prototype** if legal clarity is the top priority.

---

### 3.4 FAA NASR / CIFP / FAA Aeronautical Data Delivery System

**Traffic-light rating:** 🟡 **Partially suitable for US-only overlays**; 🔴 **Not suitable for worldwide overlays**

#### Description

The FAA provides aeronautical data products including NASR subscriptions, CIFP downloads, and an Aeronautical Data Delivery System. CIFP is ARINC 424 raw data updated every 28 days; ADDS provides data in developer-friendly formats such as CSV, JSON, KML, and Shapefile.

#### Links checked

- FAA CIFP download: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/
- FAA CIFP overview: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/
- FAA 28 Day NASR Subscription: https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/
- FAA Aeronautical Data Delivery System: https://adds-faa.opendata.arcgis.com/
- FAA NASR README example: https://nfdc.faa.gov/webContent/28DaySub/2025-03-20/README.txt

#### Data coverage

- **VORs:** Yes, for U.S./NAS.
- **NDBs:** Yes, for U.S./NAS.
- **High Airways:** Likely available in U.S. route data/NASR/CIFP context.
- **Low Airways:** Likely available in U.S. route data/NASR/CIFP context.
- **Global scope:** No; primarily U.S./NAS data. CIFP may include some non-U.S. data elements, but it is not a clear worldwide source for all FlightPlanner overlays.

#### License/usage assessment

FAA data is public/no-cost and from a U.S. government source, but a final legal review is still recommended before redistribution. For this report’s conservative global-source question, FAA data is only partially suitable because it does not solve worldwide coverage.

#### API/download access

- NASR downloads are available by cycle.
- FAA README indicates registration is not necessary to access/download files, though registration is used for email alerts.
- CIFP is raw ARINC 424 data and requires substantial processing.
- ADDS can provide data in CSV, JSON, KML, and Shapefile.

#### Technical integration

High effort:

- Need parsers for ARINC 424, AIXM, or FAA-specific TXT/XML formats.
- Need conversion to normalized route geometries and navaid points.
- Need careful update-cycle management.

#### CORS/backend/import assessment

A periodic backend import is strongly preferred. Live frontend use is not appropriate.

#### Performance considerations

Route linework can be large. Preprocessing to tiled GeoJSON/vector tiles or region-specific files would be needed.

#### Risks

- U.S.-only limitation.
- Format complexity.
- Higher implementation cost.
- Must avoid presenting data as operational.

#### Recommendation

Do not use FAA NASR/CIFP for the first global prototype. Consider it later for a **U.S.-only airway proof-of-concept** if global Airways remain unavailable.

---

### 3.5 Eurocontrol EAD / AIXM sources

**Traffic-light rating:** 🔴 **Not suitable as a free FlightPlanner source** / ⚪ **unclear for negotiated use**

#### Description

Eurocontrol EAD is a centralized aeronautical information database. AIXM is the aeronautical information exchange model used to encode aeronautical data. The AIXM model itself is openly documented, but that does not make EAD data freely reusable in FlightPlanner.

#### Links checked

- Eurocontrol AIXM model: https://www.eurocontrol.int/model/aeronautical-information-exchange-model
- Eurocontrol EAD service: https://www.eurocontrol.int/service/european-ais-database
- EAD Basic: https://www.ead.eurocontrol.int/fwf-eadbasic/public/cms/cmscontent.faces?configKey=default.home.page
- EAD Basic/EAD Pro portal: https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/home/
- Eurocontrol static data operations: https://www.eurocontrol.int/service/static-data-operations

#### Data coverage

- **VORs/NDBs/Airways:** Available in the EAD/AIXM ecosystem.
- **Global scope:** EAD is strongest for ECAC/ECAC+ and specific datasets, not a simple worldwide public dataset.

#### License/usage assessment

Access and usage are not simple public open-data licensing. Eurocontrol describes EAD Basic as a limited public access service and EAD Pro/MyEAD/professional access as requiring agreements, potential fees, and liability considerations. This is not appropriate as a free/no-cost FlightPlanner source under conservative rules.

#### API/download access

- EAD Basic: free public access but limited and web-oriented.
- Professional/static data: agreement/request/access controlled.
- AIXM data is technically usable but access is the issue.

#### Technical integration

High effort:

- AIXM parsing.
- Agreement/access workflow.
- Data coverage and rights review.

#### CORS/backend/import assessment

Would require backend import or negotiated data access. Not suitable for frontend fetch.

#### Performance considerations

AIXM route data requires preprocessing and simplification before Leaflet rendering.

#### Risks

- Licensing/access complexity.
- Potential fees or agreements.
- Liability/insurance requirements depending on use.

#### Recommendation

Do not use for FlightPlanner’s free data source unless a formal EAD data agreement is pursued.

---

### 3.6 OpenStreetMap / Overpass

**Traffic-light rating:** 🟡 **Legally usable with obligations**, 🔴 **not suitable for reliable aviation overlays**

#### Description

OpenStreetMap is global open geodata under ODbL. It can be queried through Overpass or downloaded as extracts. Some aviation-related tags exist, including proposed/de facto navaid-related tags, but aviation navigation data is not complete or authoritative.

#### Links checked

- OSM copyright/license: https://www.openstreetmap.org/copyright/
- OSM aeroways overview: https://wiki.openstreetmap.org/wiki/Aeroways
- OSM radio navigation aids proposal: https://wiki.openstreetmap.org/wiki/Proposal%3ARadio_navigation_aids
- OSM `aeroway=navigationaid`: https://wiki.openstreetmap.org/wiki/Tag%3Aaeroway%3Dnavigationaid
- Overpass API wiki: https://wiki.openstreetmap.org/wiki/Overpass_API
- Overpass Commons usage guidance: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- Geofabrik Overpass comments: https://www.geofabrik.de/data/overpass-api.html

#### Data coverage

- **VORs:** Some may exist, not reliable/complete.
- **NDBs:** Some may exist, not reliable/complete.
- **High Airways:** Not reliable.
- **Low Airways:** Not reliable.
- **Global scope:** The OSM database is global, but aviation feature completeness is uneven.

#### License/usage assessment

OSM is licensed under ODbL. This is legally usable if attribution and share-alike/database obligations are met. However, ODbL obligations can complicate derived data distribution.

#### API/download access

- Overpass API for queries.
- Planet/extract downloads for bulk imports.

#### Technical integration

Possible but not recommended as primary aviation source:

- Querying all global navaids via public Overpass is not ideal.
- Overpass is flexible, not optimized for heavy production use.
- Data tagging is inconsistent.

#### CORS/backend/import assessment

Avoid direct frontend Overpass queries for global overlays. Use extracts/import if exploring OSM at all.

#### Performance considerations

Global Overpass queries can be heavy and rate-limited. Precomputed files are better.

#### Risks

- Incomplete/uneven aviation data.
- ODbL compliance obligations.
- Potential user misunderstanding.

#### Recommendation

Do not use OSM as the primary source for FlightPlanner aviation overlays. It may be useful for supplementary airport/runway infrastructure, not for reliable VOR/NDB/Airways overlays.

---

### 3.7 open flightmaps

**Traffic-light rating:** 🟡 **Partially suitable / promising but not first prototype**

#### Description

open flightmaps develops and maintains aeronautical data under a public license for rendering VFR maps. Its website states that it grants a worldwide, royalty-free, non-exclusive license under its General Users’ License, including commercial use if conditions are met. Downloads are region-based.

#### Links checked

- open flightmaps homepage/license summary: https://openflightmaps.org/
- open flightmaps downloads: https://openflightmaps.org/downloads/
- open flightmaps GitHub: https://github.com/openflightmaps
- open flightmaps GitLab: https://gitlab.com/openflightmaps

#### Data coverage

- **VORs/NDBs:** Likely available regionally as part of VFR map data.
- **High/Low Airways:** Not verified as a simple global High/Low airway dataset.
- **Global scope:** Region downloads are available, but coverage is not a single worldwide dataset.

#### License/usage assessment

The public-license posture is promising. However, the exact General Users’ License conditions and any regional data/source obligations should be reviewed before production use.

#### API/download access

- Region-based downloads.
- Data formats include OFMX/open flightmaps tooling; not as simple as CSV.

#### Technical integration

Moderate to high effort:

- Parse/convert OFMX or related data formats.
- Understand regional packaging.
- Normalize into GeoJSON/vector tiles.

#### CORS/backend/import assessment

Use periodic import, not direct frontend fetch.

#### Performance considerations

If route/airspace linework is used, preprocessing and simplification are needed.

#### Risks

- Regional coverage gaps.
- Format complexity.
- Not the shortest route to a first prototype.

#### Recommendation

Potentially worth a second-phase technical spike, especially for European/regional VFR data, but not the first prototype because OurAirports is simpler and legally clearer for VOR/NDB.

---

### 3.8 ICAO GIS / ICAO API Data Service

**Traffic-light rating:** 🔴 **Not suitable as free/no-cost source**

#### Description

ICAO provides GIS and API data services, including aviation data products and map applications. However, the relevant data products are available through the ICAO Store or API services, not as clearly free/no-cost open datasets.

#### Links checked

- ICAO GIS Aviation Data: https://www.icao.int/icao-gis-aviation-data
- ICAO API Data Service: https://www.icao.int/api-data-service
- ICAO API Data Samples: https://www.icao.int/api-data-samples
- ICAO public GIS portal examples: https://gis.icao.int/portal/home/

#### Data coverage

- Potentially broad/global aviation data depending on product.
- Not evaluated further because the source is not free/no-cost for this use.

#### License/usage assessment

ICAO’s relevant up-to-date GIS data products are sold through the ICAO Store; API services also imply API keys/store products. Not suitable for this free/no-cost requirement.

#### Recommendation

Reject as the primary FlightPlanner overlay source.

---

### 3.9 OpenNav

**Traffic-light rating:** ⚪ **Unclear** / 🔴 **not recommended**

#### Description

OpenNav is a searchable aviation navigation database website.

#### Links checked

- OpenNav: https://opennav.com/

#### Data coverage

- Searchable airports, navs, waypoints.
- Airways availability and reusable dataset access were not verified.

#### License/usage assessment

No clear reusable data license or API terms were found during this research. Scraping would be inappropriate without permission.

#### Recommendation

Reject unless an explicit downloadable dataset/API and license are found.

---

### 3.10 Aero Sors / ClimateViewer-derived VOR/NDB datasets

**Traffic-light rating:** 🔴 **Not suitable for FlightPlanner production data**

#### Description

Aero Sors provides simulator-oriented navdata updates for FSX/P3D and related tools. ClimateViewer hosts a GeoJSON/KMZ-style VOR/NDB layer based on Aero Sors-style data.

#### Links checked

- Aero Sors simulator navdata: https://sors.fr/aero/
- FSX/P3D Navaids update: https://www.sors.fr/aero/navaids3.html
- ClimateViewer VOR/NDB layer: https://climateviewer.org/history-and-science/transportation/maps/icao-flight-navigation-aids-vor-ndb/
- IVAO France AeroSors note: https://www.ivao.fr/en/pages/aerosors

#### Data coverage

- VORs/NDBs are available in some form.
- Airways may exist in some Europe-specific simulator update contexts.

#### License/usage assessment

The ClimateViewer page lists CC BY-NC-SA 4.0 for its map layer, and the source lineage is simulator/AIP-derived. Aero Sors packages are intended for simulator updates, not obviously for redistribution as a web app dataset.

#### Recommendation

Reject for production FlightPlanner overlays. It may be useful only as background reading for simulator ecosystem data formats.

---

## 4. Recommended Architecture for FlightPlanner

### Option A: Direct frontend fetch

**Recommendation:** Avoid for production.

Pros:

- Simple if the source is static CSV/GeoJSON and CORS permits.

Cons:

- CORS risk.
- No centralized cache/version control.
- Difficult attribution/license handling.
- Exposes API keys if a keyed API is used.
- Poor for large global data.

Best fit:

- Only small static files bundled with the frontend after legal review.

### Option B: Backend proxy

**Recommendation:** Use only for live APIs where necessary, not for bulk global overlays.

Pros:

- Avoids browser CORS.
- Protects API keys.
- Allows rate limiting and caching.

Cons:

- Still depends on upstream API availability.
- Can cause rate-limit issues if map panning triggers many requests.
- Not ideal for static data like OurAirports CSV.

Best fit:

- METAR-style request/response data.
- Possibly OpenAIP if license and non-commercial restrictions are acceptable.

### Option C: Periodic backend import

**Recommendation:** Preferred.

Pros:

- Best control over licensing, attribution, data version, and transformation.
- Avoids CORS and rate-limit problems at runtime.
- Enables validation, filtering, simplification, and generated GeoJSON.

Cons:

- Requires import tooling.
- Need update/version management.

Best fit:

- OurAirports navaids.
- FAA NASR/CIFP if a US-only proof of concept is attempted.
- open flightmaps regional datasets after deeper format/license review.

### Option D: Static precomputed GeoJSON files

**Recommendation:** Best first implementation target for VOR/NDB.

Pros:

- Very simple frontend integration.
- Works well with Leaflet.
- Can be versioned and compressed.
- Good for a first prototype.

Cons:

- Large global files may need splitting by region/type.
- Update automation needed later.

Best fit:

- `navaids-vor.geojson`
- `navaids-ndb.geojson`
- Possibly region-indexed files such as `navaids/europe-vor.geojson`.

### Option E: Local database or file cache

**Recommendation:** Use later if data grows.

Pros:

- Good for filtering by viewport, zoom, type, and region.
- Can support API queries like `/api/overlays/navaids?bbox=...&type=vor`.

Cons:

- More backend work.
- More deployment complexity.

Best fit:

- Large airways linework.
- Future global overlay service with viewport-based loading.

### Recommended architecture summary

For FlightPlanner:

1. **First prototype:** Import OurAirports `navaids.csv` into static GeoJSON for VOR/NDB.
2. **Serve through the ASP.NET Core backend or bundle as static assets.**
3. **Render in Leaflet with separate VOR and NDB toggles.**
4. **Do not implement global High/Low Airways until a clearly licensed source is identified.**
5. **For later airway experiments, evaluate FAA NASR/CIFP for US-only and open flightmaps for selected regions.**

---

## 5. Recommendation for First Prototype

### Recommended first prototype

**Prototype VOR/NDB overlays using OurAirports `navaids.csv`.**

Why:

- Best legal clarity among researched candidates.
- Public Domain / Unlicense-style data posture.
- Simple CSV format.
- No API key.
- Global dataset family.
- Easy conversion to GeoJSON.
- Easy Leaflet rendering as point markers.

### Prototype scope

Start small:

1. Download/import `navaids.csv`.
2. Filter VOR-like records and NDB records.
3. Generate two static GeoJSON files:
   - `vor.geojson`
   - `ndb.geojson`
4. Render two independent Leaflet layer toggles:
   - VORs
   - NDBs
5. Add disclaimer text.
6. Do not implement Airways yet.

### Airways recommendation

**No-Go for global High/Low Airways for now.**

Reason:

No clearly licensed, free/no-cost, worldwide, technically simple airway source was found. Implementing Airways from an unclear source would create licensing and trust risks.

---

## 6. Reusable FlightPlanner Disclaimer Text

### Short version

> Aviation overlays are provided for flight simulation only. Do not use them for real-world navigation, flight planning, or operational aviation decisions.

### Longer version

> The aviation overlay data shown in FlightPlanner is intended only for flight simulation and educational visualization. It may be incomplete, outdated, or inaccurate and must not be used for real-world flight planning, navigation, dispatch, or any operational aviation decision.

---

## 7. Sources Rejected Quickly

| Source | Quick rejection reason | Category |
|---|---|---|
| Navigraph | Commercial subscription/product; not free/no-cost. | Cost/license |
| Jeppesen NavData | Commercial navigation data product. | Cost/license |
| GE Aerospace Navigation Database | Commercial/professional aviation database. | Cost/license |
| Keyvan Worldwide ARINC 424 Database | Price quote/order required; not free/no-cost. | Cost/license |
| Aviation Edge | Paid API/database model; not focused on free nav overlay data. | Cost/license |
| AeroDataBox | Paid API marketplace model. | Cost/license |
| ICAO Store GIS products | Official data products available through store/pricing/API packages. | Cost/license |
| OpenSky Network | Aircraft surveillance/trajectory data, not navaid/airway overlay data. | Missing data |
| OpenFlights routes | Airline route data, not IFR airways or navaids. | Missing data |
| SkyVector | Free website, but no clear reusable data API/license for extracting overlays. | License/access |
| AirNav | Useful U.S. web lookup, but no clear reusable bulk license/API for FlightPlanner. | License/access |
| OpenNav | Searchable website, no clear reusable dataset/API license found. | License/access |
| Aero Sors / ClimateViewer | Simulator-specific and/or non-commercial/share-alike/source-lineage concerns. | License/source risk |
| OSM Overpass public live queries | ODbL obligations plus incomplete aviation coverage and runtime performance/rate-limit concerns. | Quality/technical risk |

---

## 8. Next Steps

1. **Do a final license review** for OurAirports and Airportmap before storing data in the repository or distributing derived GeoJSON.
2. **Download a small OurAirports `navaids.csv` sample** and inspect the available type/frequency/identifier fields.
3. **Create a one-off conversion experiment** from CSV to GeoJSON for VOR and NDB records.
4. **Prototype a small region first**, e.g. Europe or Germany, before loading global navaids.
5. **Test Leaflet performance** with marker clustering and zoom-dependent rendering.
6. **Design layer toggles** for VOR and NDB only.
7. **Add the simulation-only overlay disclaimer** near the map layer selector or aviation overlay panel.
8. **Do not implement High/Low Airways** until a source with clear rights, global coverage, and usable geometry is identified.
9. **Optionally run a second research pass** specifically on open flightmaps and FAA NASR/CIFP for limited-region airway proof-of-concepts.

---

## Final Go / No-Go Matrix

| Overlay | Prototype decision | Recommended source | Notes |
|---|---:|---|---|
| VORs | **GO** | OurAirports `navaids.csv` | Best legal clarity and technical simplicity. |
| NDBs | **GO** | OurAirports `navaids.csv` | Same import pipeline as VORs. |
| High Airways | **NO-GO** | None identified | Revisit after source/license-specific airway research. |
| Low Airways | **NO-GO** | None identified | Revisit after source/license-specific airway research. |

---

## Source Links

- OurAirports open data: https://ourairports.com/data/
- OurAirports data repository: https://github.com/davidmegginson/ourairports-data
- OurAirports navaids list: https://ourairports.com/navaids/list.html
- Airportmap open databases: https://airportmap.de/data
- Airportmap database repository: https://github.com/komed3/airportmap-database
- OpenAIP homepage: https://www.openaip.net/
- OpenAIP legal terms: https://www.openaip.net/legal
- OpenAIP API documentation: https://docs.openaip.net/
- OpenAIP navaids: https://www.openaip.net/data/navaids
- FAA CIFP download: https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/
- FAA NASR subscription: https://www.faa.gov/air_traffic/flight_info/aeronav/Aero_Data/NASR_Subscription/
- FAA Aeronautical Data Delivery System: https://adds-faa.opendata.arcgis.com/
- Eurocontrol AIXM model: https://www.eurocontrol.int/model/aeronautical-information-exchange-model
- Eurocontrol EAD: https://www.eurocontrol.int/service/european-ais-database
- EAD Basic: https://www.ead.eurocontrol.int/fwf-eadbasic/public/cms/cmscontent.faces?configKey=default.home.page
- OpenStreetMap copyright/license: https://www.openstreetmap.org/copyright/
- Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
- Overpass Commons: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- open flightmaps: https://openflightmaps.org/
- open flightmaps downloads: https://openflightmaps.org/downloads/
- ICAO GIS Aviation Data: https://www.icao.int/icao-gis-aviation-data
- ICAO API Data Service: https://www.icao.int/api-data-service
- OpenNav: https://opennav.com/
- Aero Sors: https://sors.fr/aero/
- ClimateViewer VOR/NDB layer: https://climateviewer.org/history-and-science/transportation/maps/icao-flight-navigation-aids-vor-ndb/
