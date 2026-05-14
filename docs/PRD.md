# Product Requirements Document — FlightPlanner
**Version:** 1.0  
**Stand:** Mai 2026  
**Status:** Draft

---

## 1. Produktvision

FlightPlanner ist ein moderner Flight-Planning-Assistent für virtuelle Piloten, der komplexe Flugplanung auf eine schnelle, immersive und visuell verständliche Experience reduziert.

**Winning Aspiration:**  
> „Das erste Flight-Planning-Tool, das sich wie ein modernes Premium-Produkt anfühlt — und trotzdem wie ein intelligenter Dispatcher denkt."

Das Produkt soll sich anfühlen wie:
- ein modernes FMC / Cockpit-System
- ein intelligenter Dispatcher-Desk
- ein Premium Aviation Tool

Nicht wie:
- ein Legacy Aviation Tool mit Tabellen-Interface
- ein Gaming-Dashboard
- ein technisch überladener Simulator-Mod

---

## 2. Strategische Positionierung

### Positioning Statement
FlightPlanner hilft virtuellen Piloten dabei, realistische Flugrouten in Sekunden statt Minuten zu erstellen — mit intelligenter Wetterintegration und einer modernen Premium-Experience.

### Wettbewerbsvorteil
Während bestehende Tools (SimBrief, Little Navmap, SkyVector) Daten anzeigen, bietet FlightPlanner:
- überlegene UX und visuelle Qualität
- intelligente, AI-gestützte Empfehlungen
- eine immersive, cockpit-artige Atmosphäre

**Kernversprechen:** „Professionelle Flugplanung ohne Komplexität."

### Wettbewerb & Referenzprodukte
| Produkt | Stärke | Schwäche |
|---------|--------|----------|
| SimBrief | Datentiefe, Community-Standard | UI veraltet, hohe Lernkurve |
| Little Navmap | Kostenlos, Feature-reich | Kompliziert, visuell überladen |
| Navigraph | Charts & Datenqualität | Teuer, nicht standalone |
| ForeFlight | Premium Aviation UX | Real-Aviation, nicht für Simmer |

**FlightPlanner-Differenzierung:** deutlich bessere UX + AI-Routing + visuelle Wetterdarstellung + moderne Web-App.

---

## 3. Zielgruppe

### Primäre Nutzerpersona: Virtueller Pilot / Flightsim-Enthusiast

Menschen, die regelmäßig realistische Flugsimulationen nutzen und Wert auf Immersion, Realismus und professionelle Flugplanung legen.

**Typische Plattformen:**
- Microsoft Flight Simulator (MSFS)
- X-Plane
- Prepar3D
- VATSIM / IVAO
- SimBrief / Navigraph

**Charakterprofil:**
- liebt Realismus und Technik
- möchte professionell wirken
- sucht Immersion
- toleriert Komplexität nur wenn sie sinnvoll wirkt
- empfindet bestehende Aviation-Tools als visuell veraltet

### Fokusmärkte
- Hardcore Flightsim-Enthusiasten
- IFR-orientierte VATSIM-Piloten
- Streamer & Content Creator im Flightsim-Bereich
- SimBrief-Poweruser mit UX-Frust
- Technik-affine Aviation-Nerds

### Nutzeralltag (Typischer Ablauf heute)
Ein typischer Nutzer:
1. Startet abends seinen Flugsimulator
2. Möchte schnell einen immersiven Flug durchführen
3. Öffnet **mehrere Tools parallel**: Wetterseiten, SimBrief, Charts, Navigraph
4. Verbringt 20–40 Minuten mit manueller Planung
5. Muss Wind, Fuel, STARs/SIDs und Wetter manuell prüfen
6. Möchte eigentlich lieber schneller ins Cockpit

### Early Adopters
- Hardcore Flightsim-Fans
- VATSIM-Piloten
- Streamer & YouTuber im Flightsim-Bereich
- SimBrief-Poweruser mit UX-Frust

---

## 4. Problem Statement & Pain Points

### Hauptprobleme

| Pain Point | Details |
|------------|---------|
| **Manuelle Flugplanung ist komplex** | Viele Datenquellen, viele Klicks, hohe Lernkurve |
| **Wetterintegration ist mühsam** | METAR/TAF-Interpretation nicht anfängerfreundlich, Wind & Turbulenzen schwer einschätzbar |
| **Bestehende Tools wirken technisch/alt** | UI funktional statt modern, zu viele Tabellen, wenig visuelle Führung |
| **Medienbruch** | Nutzer springen zwischen mehreren Webseiten und Tools hin und her |
| **Zu viel Zeit vor dem Flug** | Planung kostet 20–40 Min, die eigentlich fürs Fliegen genutzt werden könnten |

### Meta-Frage (kritisch zu validieren)
> „Ist das Kernproblem wirklich fehlende UX — oder eigentlich fehlende intelligente Automatisierung?"

---

## 5. Technischer Stack

| Bereich | Technologie | Beschreibung |
|---------|-------------|--------------|
| **Frontend-Framework** | React | Komponentenbasierte UI-Entwicklung |
| **Kartenvisualisierung** | Leaflet.js | Interaktive Karte mit OpenStreetMap |
| **Kartendaten** | OpenStreetMap | Freies, offenes Karten-Basislayer |
| **Routing-API** | SimBrief API | Automatische Flugroutenberechnung |
| **Flughafendaten** | OpenAIP / AviationStack | Flughafensuche und -informationen |
| **Hosting** | Vercel / GitHub Pages | Kostenloses Deployment |

---

## 6. Jobs to be Done (JTBD)

### Funktionale Jobs
- Flugroute von A nach B erstellen
- SID und STAR auswählen
- Wetterbedingungen automatisch berücksichtigen
- IFR-/VFR-kompatible Flugpläne generieren
- Alternative Routen vergleichen
- Flugplan exportieren (SimBrief, MSFS)
- Wegpunkte prüfen

### Emotionale Jobs
- Sich wie ein echter Pilot fühlen
- Kontrolle über den Flug haben
- Vertrauen in die Route entwickeln
- Schnell ins Cockpit kommen
- Weniger mentale Belastung während der Planung
- Stolz auf realistische Flugvorbereitung

### Soziale Jobs
- Auf VATSIM/IVAO kompetent wirken
- Professionelle Vorbereitung demonstrieren
- Realistische Flüge mit anderen durchführen

---

## 7. Features & Anforderungen

### MVP — Must-Have

| Feature | Beschreibung | Priorität |
|---------|-------------|-----------|
| **Departure & Arrival Airport** | Eingabe von Start- und Zielflughafen | P0 |
| **Auto Routing** | Automatische Routengenerierung | P0 |
| **Live Weather Integration** | METAR/TAF, Winds Aloft, visuelle Wetterdarstellung | P0 |
| **Route Map** | Interaktive Kartenansicht mit Flugpfad und Wetterlayer | P0 |
| **SID/STAR Selection** | Visuelle Auswahl von Abflug- und Ankunftsprozeduren | P0 |
| **Export** | SimBrief-kompatibler Export, MSFS-kompatibles Format | P0 |
| **Dark Aviation UI** | Premium Dark UI mit Aviation-Ästhetik | P0 |

### Phase 2 — Nice-to-Have

| Feature | Beschreibung | Priorität |
|---------|-------------|-----------|
| **AI Route Optimizer** | AI-generierte Routenoptimierung mit Erklärungen | P1 |
| **Turbulence Prediction** | Turbulenz-Visualisierung auf der Karte | P1 |
| **Smart Route Suggestions** | Kontextbezogene Alternativrouten | P1 |
| **Fuel Calculation** | Automatische Kraftstoffberechnung | P2 |
| **Multiplayer / VATSIM Optimization** | Routen für VATSIM-Events optimieren | P2 |
| **Community Sharing** | Routen und Templates teilen | P2 |
| **Pilot Profiles** | Nutzerprofil, Lieblingsrouten | P3 |
| **Voice Briefing** | AI-gesprochenes Pre-Flight Briefing | P3 |

---

## 8. UX & Design Anforderungen

### Designprinzipien

1. **Visual First** — Karten, Wetterlayer und Flugpfade haben Priorität über Tabellen
2. **Calm Operational UX** — ruhiges, kontrolliertes Interface; keine hektischen Animationen
3. **Cockpit-Inspirierte Interaktion** — fühlt sich an wie FMC-Inputs, aber modern und intuitiv
4. **Progressive Complexity** — einfach im Standardzustand, Details on demand

### Visuelle Designrichtung

- **Stil:** Dark UI, Glassmorphism, leuchtende Statusfarben, minimalistische Panels
- **Farben:** dunkle Hintergründe, radarartige Akzentfarben, hohe Kontraste
- **Typografie:** technisch-präzise Headlines, extrem lesbare Body-Schrift, Mono nur für Datenbereiche
- **Motion:** subtile, ruhige, statusorientierte Animationen — nicht verspielt oder flashy
- **Kartenflächen:** groß, zentral, als primäre Bühne des Interfaces

**Inspirationsquellen:** Tesla UI, Apple Weather, ForeFlight, moderne ATC-Radarsysteme, FMC-Systeme aus Verkehrsflugzeugen.

### Anti-Patterns (vermeiden)
- Tabellen-lastige Interfaces
- Aviation-Legacy-Optik
- überladene Panels mit zu vielen Daten
- aggressive Gaming-Ästhetik
- komplizierte Navigation
- kleine Click Targets
- visuelle Unruhe

### Gewünschte Nutzeremotion
**Soll fühlen:** Vertrauen, Kontrolle, Ruhe, Professionalität, operative Sicherheit, Vorfreude auf den Flug  
**Soll NICHT fühlen:** Überforderung, Chaos, Unsicherheit, technische Frustration, Lernstress

### Screens & Informationsarchitektur

**Hauptscreen — Flight Planning Workspace**
- Kartenansicht mit Route (zentral)
- Departure & Arrival
- Wetterübersicht
- Route Summary + Wegpunkt-Tabelle
- CTA für Export

**SID Selection Screen**
- SID Liste + Kartenvisualisierung
- Runway-Bezug + Wind/Wetter-Kontext
- Route Preview

**STAR Selection Screen**
- STAR Liste + Kartenansicht
- Wetterintegration + Arrival Flow
- Übergänge zur Route

---

## 9. Technischer Rahmen

### Frontend
- **Framework:** React
- **Architektur:** komponentenbasiert, zustandsorientiert, map-first layout, responsive desktop-first

### Integrationen
- **Wetterdaten:** METAR/TAF, Winds Aloft, Live Weather API
- **Navigation:** Navigationsdaten für Waypoints, SIDs, STARs
- **Export:** SimBrief-kompatibles Format, MSFS-Format
- **Karten-Rendering:** interaktives Karten-Layer mit Wetter-Overlay

### Fehlende Inhalte für MVP (zu beschaffen)
- Echte Aviation-Navigationsdaten
- Live Wetterdaten-API
- Reale Karten-API
- UI States (Error, Loading, Empty)

---

## 10. Risiken & offene Fragen

### Kritische Risiken

| # | Risiko | Kritische Annahme | Mitigation |
|---|--------|-------------------|------------|
| 1 | **Kein Wechsel von SimBrief** | Nutzer sind unzufrieden genug, um zu wechseln | Discovery Interviews: Wechselbereitschaft testen |
| 2 | **„Schöne UI" kein Kaufgrund** | Visuelle Qualität erzeugt ausreichend Mehrwert | Priorisierungstest: UX vs. Daten vs. Automatisierung |
| 3 | **Wetter nicht schmerzhaft genug** | Wetterplanung ist relevantes Problem für genug Nutzer | Segmentierung: IFR vs. Casual Piloten |
| 4 | **Nutzer wollen Kontrolle behalten** | Nutzer wollen maximale Vereinfachung | Balance: AI-Empfehlungen + erklärbar + Override möglich |
| 5 | **Problem zu selten** | Flugplanung passiert häufig genug | Frequenzvalidierung in Discovery Interviews |
| 6 | **„Premium" wird anders definiert** | Premium = modernes Design | Alternativhypothese: Premium = Datenpräzision + Realismus |
| 7 | **Export & Integration wichtiger als UX** | Nutzer priorisieren Erlebnis über Kompatibilität | SimBrief-Export als MVP-Blocker behandeln |
| 8 | **Zielgruppe zu breit** | „Virtuelle Piloten" sind homogen | Fokus-Entscheidung: IFR-Hardcore vs. Casual MSFS |

### Offene Strategiefrage
Die wichtigste Entscheidung vor der Entwicklung:

> **Design-first Tool** (Version 1: Premium Experience)  
> vs.  
> **AI Dispatcher Assistant** (Version 2: AI Co-Pilot)

Diese Frage muss durch Discovery Interviews beantwortet werden, bevor der Entwicklungsfokus festgelegt wird.

---

## 11. Erfolgsmetriken

### Business-Metriken
- Anzahl aktiver Nutzer (DAU/MAU)
- Wiederkehrende Nutzung (Retention Rate)
- Export-Rate (Conversion Planung → Export)

### UX-Metriken
- Time to first route (Ziel: < 2 Minuten)
- Route completion rate
- Subjektives Vertrauen (NPS / User Satisfaction)
- Wahrgenommene Einfachheit

### Strategische Metriken
- Anzahl AI-generierter Routen (wenn AI-Feature live)
- Community Shares (wenn Community-Feature live)
- Session Duration

### Das Design funktioniert, wenn:
- Nutzer die Route schnell verstehen
- Nutzer weniger Zeit für Planung brauchen
- Nutzer Vertrauen in Entscheidungen entwickeln
- Nutzer wiederkommen
- Nutzer den Flow als „professionell" wahrnehmen

---

## 12. Nächste Schritte

### Validierung (vor Entwicklung)
1. Discovery Interviews mit 5–8 virtuellen Piloten durchführen
2. Kernfrage klären: UX-Problem oder Automatisierungs-Problem?
3. Segmentierungs-Entscheidung treffen: IFR-Hardcore vs. Casual
4. Export-Abhängigkeiten validieren: SimBrief-Kompatibilität als Blocker?

### MVP Entwicklung
1. React-Prototyp mit Hauptscreen (Karte + Route + Wetter)
2. SID/STAR Selection Screens
3. Export-Funktionalität
4. User Testing mit Early Adopters

### Marketing Hooks (für Kommunikation)
- „Plane wie ein echter Pilot."
- „Vom Gate zur Route in Sekunden."
- „Flight Planning neu gedacht."
- „Die schönste Art, virtuelle Flüge zu planen."
- „Weniger Planung. Mehr Flugzeit."

---

*FlightPlanner hat die Chance, das „Notion der Flightsim-Planung" zu werden: technisch stark, visuell modern, massiv einfacher nutzbar und emotional ansprechend für Enthusiasten.*
