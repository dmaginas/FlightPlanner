# UX Design Briefing — FlightPlanner
## Vibe Coding Prototype Brief
### Stand: Mai 2026

> Ziel dieses Briefings ist die Entwicklung eines visuell hochwertigen React-Prototyps für FlightPlanner, der Vertrauen, Kontrolle und professionelle Flugvorbereitung vermittelt — ohne die Komplexität klassischer Aviation-Tools.  
> Basierend auf dem Ideal Customer Profile für virtuelle Piloten und Flightsim-Enthusiasten.

---

# 1. Produktvision

FlightPlanner ist ein moderner Flight-Planning-Assistent für virtuelle Piloten, der komplexe Flugplanung auf eine schnelle, immersive und visuell verständliche Experience reduziert.

Das Produkt soll sich anfühlen wie:
- ein modernes FMC
- ein intelligenter Dispatcher
- ein Premium-Cockpit-System
- eine ruhige operative Umgebung

Nicht wie:
- ein Legacy-Aviation-Tool
- ein Tabellen-Interface
- ein Gaming-Dashboard
- ein technisch überladener Simulator-Mod

---

# 2. Zielgruppe

## Primärer Nutzer
Virtuelle Piloten und Flightsim-Enthusiasten.

### Typische Plattformen
- Microsoft Flight Simulator (MSFS)
- X-Plane
- Prepar3D
- VATSIM
- IVAO

### Charakter des Nutzers
- liebt Realismus
- technikaffin
- möchte professionell wirken
- sucht Immersion
- toleriert Komplexität nur wenn sie sinnvoll wirkt
- empfindet bestehende Aviation-Tools als visuell veraltet

---

# 3. Jobs to be Done (JTBD)

## Funktionale Jobs
- Flugroute von A nach B erstellen
- SID und STAR auswählen
- Wetter verstehen und berücksichtigen
- Wegpunkte prüfen
- Flugplan exportieren

## Emotionale Jobs
- Sich wie ein echter Pilot fühlen
- Kontrolle über den Flug haben
- Vertrauen in die Route entwickeln
- Schnell ins Cockpit kommen
- Weniger mentale Belastung während der Planung

## Soziale Jobs
- Auf VATSIM/IVAO kompetent wirken
- Professionelle Vorbereitung demonstrieren

---

# 4. Gewünschte Nutzeremotion

## Der Nutzer soll fühlen:
- Vertrauen
- Kontrolle
- Ruhe
- Professionalität
- operative Sicherheit
- Vorfreude auf den Flug

## Der Nutzer soll NICHT fühlen:
- Überforderung
- Chaos
- Unsicherheit
- technische Frustration
- Lernstress

---

# 5. Hauptziel des UX Designs

Das UX Design soll komplexe Flugplanung in einen klaren, geführten und visuell hochwertigen Flow übersetzen.

Der Nutzer soll:
1. Route verstehen
2. Entscheidungen nachvollziehen
3. Wetter intuitiv erfassen
4. Sich jederzeit orientieren können
5. Schnell handlungsfähig werden

---

# 6. Kernprinzipien des Designs

## 1. Visual First
Karten, Wetterlayer und Flugpfade sind wichtiger als Tabellen.

Die visuelle Orientierung hat Priorität vor Datendichte.

---

## 2. Calm Operational UX
Das Interface soll ruhig und kontrolliert wirken.

Keine:
- hektischen Animationen
- aggressive Farben
- Gaming-Ästhetik
- visuelle Überladung

---

## 3. Cockpit-Inspirierte Interaktion
Interaktionen sollen sich anfühlen wie:
- FMC Inputs
- moderne Aircraft Systems
- professionelle Aviation Interfaces

Aber:
- deutlich einfacher
- moderner
- intuitiver

---

## 4. Progressive Complexity
Komplexität wird schrittweise sichtbar gemacht.

Standardzustand:
- einfach
- klar
- reduziert

Details:
- on demand
- kontextabhängig
- fokussiert

---

# 7. Visuelle Designrichtung

## Inspirationsquelle
Moderne FMC-Systeme aus Verkehrsflugzeugen.

Nicht als direkte Kopie —
sondern als emotionale Referenz.

---

## Stilrichtung
- Dark UI
- Glassmorphism
- leuchtende Statusfarben
- minimalistische Panels
- moderne Aviation-Optik
- große Kartenflächen
- radarartige Layer
- hochwertige Typografie
- ruhige Übergänge

---

## UI Eigenschaften

### Farben
- dunkle Hintergründe
- radarartige Akzentfarben
- hohe Kontraste für Lesbarkeit
- reduzierte Farbanzahl

### Typografie
- technisch-präzise Headlines
- extrem lesbare Body-Typografie
- mono-spaced Elemente nur für Datenbereiche

### Motion
Animationen:
- subtil
- ruhig
- systemisch
- statusorientiert

Nicht:
- verspielt
- flashy
- game-artig

---

# 8. Screens & Informationsarchitektur

# Hauptscreen

## Ziel
Zentraler Flight Planning Workspace.

## Inhalte
- Kartenansicht mit Route
- Departure & Arrival
- Wetterübersicht
- Route Summary
- Wegpunkt-Tabelle
- Aktive Flugroute
- CTA für Export

## Wichtigste UX Aufgabe
Der Nutzer muss die Route sofort verstehen können.

---

# SID Selection Screen

## Ziel
Einfache und sichere Auswahl der SID.

## Inhalte
- SID Liste
- Kartenvisualisierung
- Runway Bezug
- Wetter-/Wind-Kontext
- Route Preview

## Wichtigste UX Aufgabe
Der Nutzer soll Vertrauen entwickeln, die richtige SID gewählt zu haben.

---

# STAR Selection Screen

## Ziel
Klare Auswahl der Arrival Procedure.

## Inhalte
- STAR Liste
- Kartenansicht
- Wetterintegration
- Arrival Flow
- Übergänge zur Route

## Wichtigste UX Aufgabe
Komplexe Arrival-Procedures verständlich und visuell greifbar machen.

---

# 9. Inhaltsstruktur

## Bereits vorhanden
- Texte
- Produktvision
- ICP
- JTBD
- Messaging

## Fehlende Inhalte
- echte Wetterdaten
- echte Aviation-Daten
- reale Karten
- UI States
- Error States
- Loading States
- Tooltips
- AI-Erklärungen

---

# 10. Kerninhalte des Interfaces

## Primäre Inhalte
- Kartenanzeige
- Flugroute
- Wetterlayer
- Wegpunkt-Tabelle
- SID/STAR Informationen
- Flugstatus

## Sekundäre Inhalte
- technische Details
- METAR/TAF Daten
- Alternativrouten
- Exportinformationen

---

# 11. UX Prioritäten

## Höchste Priorität
- Orientierung
- Lesbarkeit
- Vertrauen
- Geschwindigkeit
- visuelle Klarheit

## Niedrigere Priorität
- maximale Datentiefe
- Expertenfeatures
- vollständige Simulation echter FMCs

---

# 12. Technischer Rahmen

## Frontend
React

## Geeignet für
- schnelle Iteration
- Vibe Coding
- component-driven Design
- prototypische UI Flows

## Empfohlene Architektur
- komponentenbasiert
- zustandsorientiert
- map-first layout
- responsive desktop-first

---

# 13. UX Erfolgsmetriken

## Das Design funktioniert wenn:
- Nutzer die Route schnell verstehen
- Nutzer weniger Zeit für Planung brauchen
- Nutzer Vertrauen in Entscheidungen entwickeln
- Nutzer wiederkommen
- Nutzer den Flow als „professionell“ wahrnehmen

## Primäre Business-Metrik
- Anzahl Nutzer

## Sinnvolle UX-Metriken
- Time to first route
- Route completion rate
- Export rate
- Wiederkehrende Nutzung
- subjektives Vertrauen
- wahrgenommene Einfachheit

---

# 14. UX Leitidee

> „FlightPlanner soll sich anfühlen wie ein modernes Cockpit-System, das komplexe Flugplanung in einen ruhigen, professionellen und visuell verständlichen Flow übersetzt.“

---

# 15. Design Anti-Patterns

## Vermeiden
- Tabellen-lastige Interfaces
- Aviation-Legacy-Optik
- überladene Panels
- zu viele Daten gleichzeitig
- aggressive Gaming-Ästhetik
- komplizierte Navigation
- kleine Click Targets
- visuelle Unruhe

---

# 16. Vibe Coding Guidance

## Der Prototyp soll:
- emotional wirken
- sofort Vertrauen erzeugen
- visuell beeindrucken
- nach Premium Aviation Software aussehen
- sich „expensive“ anfühlen
- Maps als zentrale Bühne nutzen

## Nicht optimieren für:
- perfekte technische Korrektheit
- vollständige Aviation-Realität
- Experten-Edgecases

## Sondern optimieren für:
- Wahrnehmung
- Gefühl von Kontrolle
- Geschwindigkeit
- immersive UX
- visuelle Orientierung
