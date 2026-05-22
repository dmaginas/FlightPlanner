# Miro Board Aufgabe — FlightPlanner Discovery

Modul: 1
Quelle: Nutzerumfrage `docs/Survey/FlightPlanner User Experience Survey.csv`
Datum: 21.05.2026

---

## F1: Was hat weniger gut funktioniert?

### 1. Benutzeroberfläche & Usability
- Mehrere Nutzer kritisieren eine **schlechte oder veraltete UI** (SimBrief als "old-fashioned with horrible usability")
- Ständiges **Wechseln zwischen Tabs/Seiten** und zwischen verschiedenen Tools wird als störend empfunden

### 2. Fehlende Funktionalität
- **Kein Redispatch, kein Tankering** — für realistische Dispatch-Simulation vermisst
- **Keine anpassbaren OFP-Formate** (Operational Flight Plan)
- **Keine vernünftige Cross-Section Wetterkarte** (GRAMET)
- Keine **Vorschau** ("lack of preview")

### 3. Datenfehler & fehlende Navigationsdaten
- Falsche oder fehlende SIDs/STARs/Approaches im MSFS Planner
- Fehlende oder ungenaue Daten im MSFS Flight Planner

### 4. Tool-Fragmentierung
- Nutzer müssen **mehrere Tools gleichzeitig** verwenden (SimBrief, PFPX, Little Navmap, MSFS-Planner etc.)

### 5. Kosten
- SimBrief / Navigraph-Anbindung wird als **zu teuer** empfunden

### 6. Einheitenproblem
- Wechseln zwischen KG und LB — beide Einheiten sollten gleichzeitig angezeigt werden

---

## F2: Wer sind die Kunden, Nutzer oder die Zielgruppe?

### Primäre Zielgruppe: IFR-Simmer mit Anspruch auf Realismus

| Segment | Beschreibung |
|---|---|
| IFR-Piloten (simuliert) | Fliegen ausschließlich nach Instrumentenflugregeln |
| Online-Piloten VATSIM/IVAO | Fliegen in echten Online-Netzwerken mit ATC |
| Serious Simmers | Wollen echte Dispatch-Prozesse nachahmen |
| Realismus-Enthusiasten | Streben nach 1:1-Abbildung realer Abläufe |

### Simulator-Plattformen
- **Microsoft Flight Simulator 2020/2024** — dominiert mit ~9 von 11 Nutzern
- X-Plane, FlightGear, P3D V5 — Minderheit

### Drei konkrete Nutzer-Segmente

**1. Der Realist-Simmer**
Möchte echte Dispatch-Prozesse nachbilden (Redispatch, Tankering, OFP-Format). Nutzt heute PFPX oder SimBrief, ist aber unzufrieden mit fehlendem Funktionsumfang.

**2. Der VATSIM/IVAO-Pilot**
Fliegt regelmäßig online, braucht korrekte Routen, SIDs/STARs und ATC-kompatible Pläne. Schätzt schnelle, zuverlässige Routengenerierung.

**3. Der IFR-Einsteiger / Gelegenheits-Simmer**
Sucht eine einfache, gut aussehende Alternative zu SimBrief mit weniger Lernaufwand und besserer UI.

---

## F3: Wann/wo benötigen sie unsere Lösung? Wann haben sie die meisten Schwierigkeiten?

### Zeitlich: Immer vor dem Flug

| Planungszeit | Anzahl Nutzer | Kontext |
|---|---|---|
| < 10 Minuten | 3 | Route bereits bekannt / existiert |
| 10–30 Minuten | 3 | Typischer IFR-Flug |
| 30–60 Minuten | 3 | Unbekannte Route, Einschränkungen |
| Situationsabhängig | 2 | Je nach Komplexität |

**Kritischer Moment:** Wenn keine gespeicherte Route existiert — dann steigt die Zeit von 2–3 Min. auf 15–20+ Min.

### Wo die größten Schwierigkeiten auftreten

1. **Routenerstellung** — 4 von 11 Nutzern nennen "Routing" als wichtigstes Problem
2. **Tool-Wechsel** — häufigster Workflow-Brecher
3. **Anflug- & Abflugprozeduren** — falsche/fehlende SIDs/STARs
4. **Wetterinformation** — 3 von 11 nennen "Weather" als wichtigstes Problem
5. **Gewichts- & Ladungsplanung** — ZFW, TOW, MACTOW zeitaufwändig

### Für welche Flüge wird das Tool nicht gebraucht?
- VFR-Flüge (5 von 11 Nutzern)
- GA / Kurzstrecke in bekannten Gebieten
- Platzrunden / Quick Circuits

**Das Tool wird ausschließlich für IFR-Flüge benötigt.**

---

## F4: Wie lösen sie ihre Probleme derzeit? Welche Verhaltensweisen können wir beobachten?

### Aktuelle Planungsmethoden

| Nutzer | Primäres Tool | Gleichzeitig genutzte Tools |
|---|---|---|
| 1 | SimBrief | SimBrief allein |
| 2 | Manuell | MSFS Flight Planner |
| 3 | SimBrief + PFPX | SimBrief, MSFS Planner, PFPX |
| 4 | SimBrief | SimBrief allein |
| 5 | Echte Profi-Tools | SimBrief + eigene Real-World-Tools |
| 6 | Little Navmap | MSFS Planner + Little Navmap |
| 7 | MSFS Planner | MSFS Planner allein |
| 8 | PFPX | PFPX allein |
| 9 | Stift + Papier | SkyVector |
| 10 | SimBrief (+ PFPX) | SimBrief, manuell bei fehlenden Routen |
| 11 | MSFS Flight Planner | SimBrief |

### Beobachtbare Verhaltensmuster

**1. Multi-Tool-Jonglage** — Kein einziger Nutzer kommt mit einem Tool aus

**2. SimBrief als De-facto-Standard trotz Frustration** — Verbleib mangels Alternativen (Lock-in)

**3. Manuelle Workarounds** — Waypoints manuell eintippen, eigene Routen mit IFPS-Prüfung bauen, Stift & Papier

**4. PFPX als Veteran-Lösung** — Halten an veraltetem Tool fest wegen fehlender Alternative mit Profi-Features

**5. Wetter wird separat beschafft** — Windy, GRAMET, METAR aus verschiedenen Quellen

**6. Hohe Switchwilligkeit** — Mehrheit würde wechseln, aber Hürde ist hoch für fortgeschrittene Nutzer

---

## F5: Was hat gut funktioniert? Welche Förderfaktoren oder alternativen Lösungen gab es?

### Positives an bestehenden Tools

**SimBrief:**
- Schnelle Routengenerierung für einfache IFR-Routen
- Zuverlässige Datenbank bestehender Routen
- FMC/CDU-Export direkt in PMDG 737, A320 etc.

**Little Navmap:**
- Visuelle Kartenansicht — einfach und übersichtlich
- Simplizität, 5-Minuten-Planung für weniger komplexe Flüge

**PFPX:**
- Profi-Funktionen (Redispatch, Tankering, OFP-Anpassung) — Goldstandard für ernsthafte Dispatch-Simulation

### Alternative Lösungen im Vergleich

| Tool | Stärke | Schwäche |
|---|---|---|
| SimBrief | Schnelle Routen, weit verbreitet | Schlechte UI, kein Redispatch, Kosten |
| PFPX | Profi-Features, OFP-Anpassung | Veraltet, kein MSFS-Support |
| Little Navmap | Visuelle Karte, kostenlos | Kein echter Dispatch-Workflow |
| MSFS Planner | Direkt im Sim, einfach | Fehlende Daten, keine IFR-Tiefe |
| SkyVector | VFR-Planung, kostenlos | Kein IFR-Workflow |

### Förderfaktoren für einen Wechsel
- Schönere UI reicht für einfachere Nutzer
- VATSIM-Integration und Navigraph-Navdaten für Fortgeschrittene
- SimBrief-Export kein Pflichtfeature — Mehrheit würde darauf verzichten

---

## F6: Was hat weniger gut funktioniert? Welche Hindernisse gab es?

### Hindernisse in bestehenden Tools

| Tool | Kritik |
|---|---|
| SimBrief | "old-fashioned with a horrible usability", "outdated and very expensive" |
| MSFS Planner | "missing data", falsche Approaches |
| Alle Tools | Kein einheitliches Layout, ständiges Tab-Wechseln |

### Fehlende Kernfunktionen — die PFPX-Lücke

| Fehlende Funktion | Genannte von |
|---|---|
| Redispatch | 2 Nutzer explizit |
| Tankering | 2 Nutzer explizit |
| Anpassbares OFP-Format | 2 Nutzer explizit |
| ETOPS-Planung | 1 Nutzer |
| Offline-Funktionalität | 1 Nutzer |
| TOPCAT-ähnliche Performance | 1 Nutzer |
| Cross-Section Wetterkarte | 1 Nutzer |

### Adoptionshindernisse für FlightPlanner

| Hindernis | Schwere | Betroffene Segmente |
|---|---|---|
| Fehlende Profi-Features (PFPX) | Hoch | Fortgeschrittene, Realisten |
| Navigraph-Integration fehlt | Hoch | Alle IFR-Nutzer |
| Datenzuverlässigkeit unklar | Hoch | Alle Segmente |
| SimBrief-Export fehlt | Mittel | ~2 von 11 Nutzern |
| Kosten / Abo-Modell | Mittel | Preissensible Nutzer |
| MSFS-Integration fehlt | Niedrig | MSFS-only Nutzer |

---

## F7: Was machen unsere Wettbewerber in diesem Bereich (Flugplanung)?

### Marktübersicht nach Kategorien

| Kategorie | Tools |
|---|---|
| Vollständige Planer | SimBrief, PFPX, AviaPlanner |
| Karte & Navigation | Little Navmap, SkyVector |
| Simulator-integriert | MSFS 2024 Planner, LIDO (in MSFS) |
| Wetter | Windy, Autorouter/GRAMET |
| Performance | TOPCAT |
| Navdata-Anbieter | Navigraph |
| Community-Tools | Flight Plan Database |

### Die wichtigsten Wettbewerber

**SimBrief — Marktführer (Navigraph-Eigentum)**
- Geschäftsmodell: Kostenlos + Navigraph-Abo
- Stärken: 120+ Flugzeugtypen, 40+ Exportformate, Wetter, NOTAMs, ETOPS
- Schwächen: Veraltete UI, kein Redispatch/Tankering, Internetpflicht
- Status: Aktiv gepflegt, Marktstandard

**Little Navmap — Open-Source-Alternative**
- Geschäftsmodell: Komplett kostenlos
- Stärken: Offline, plattformübergreifend, exzellente Kartenansicht, MSFS 2024 Support
- Schwächen: Steile Lernkurve, kein Dispatch-Workflow
- Status: Aktiv entwickelt (v3.0.14, Feb 2025)

**PFPX — Der tote Goldstandard**
- Geschäftsmodell: Einmalkauf — seit November 2021 nicht mehr erhältlich
- Stärken: Redispatch, Tankering, Step Climbs, anpassbares OFP
- Schwächen: Kein MSFS-Support, keine Updates
- Status: Eingestellt — hinterlässt unbesetzte Marktlücke

**AviaPlanner — Neuer Herausforderer**
- Geschäftsmodell: Abo-basiert (~$3,50/Monat, 3 Tage kostenlos)
- Stärken: LIDO-Profidaten, Navigraph-Navdata, MSFS 2020/2024 + X-Plane + P3D
- Schwächen: Neu, wenig Nutzerbewertungen, komplexe Oberfläche
- Status: Aktiv — direkter Konkurrent

**MSFS 2024 Planner (Microsoft)**
- Geschäftsmodell: Kostenlos (im Simulator enthalten)
- Stärken: Direkt integriert, LIDO-Daten eingebaut, Mobile + Web
- Schwächen: Nur für Gelegenheitsnutzer, kein IFR-Profi-Workflow
- Status: Aktiv — Microsoft investiert zunehmend

### Marktlücke

```
PFPX eingestellt (Nov 2021)
        ↓
Profi-Features fehlen überall
        ↓
AviaPlanner: Teilabdeckung, wenig bekannt
        ↓
→ Marktlücke für FlightPlanner
```

**Markttrends:**
- Navigraph wird zum Monopol bei Navdaten
- MSFS 2024 wächst als Plattform, verbessert eigenen Planner
- Free-Tier ist Standard — Nutzer zahlen nur für Premium-Navdaten
- Offline-Fähigkeit gewinnt an Bedeutung

---

## F8: Wo liegen mögliche Chancen für FlightPlanner?

### Chance 1 — Die PFPX-Nachfolge besetzen
Größte und dringendste Marktlücke. ~4 Jahre ohne vollwertigen Ersatz. Profi-Features (Redispatch, Tankering, OFP, ETOPS, Step Climb) werden von niemandem angeboten.

### Chance 2 — All-in-One statt Multi-Tool-Chaos
Kein einziger Nutzer kommt mit einem Tool aus. FlightPlanner kann Routengenerierung, Wetter, Karte, METAR und Dispatch in einer Oberfläche vereinen.

### Chance 3 — Moderne UI als Differenzierungsmerkmal
Die gesamte Kategorie hat ein UI-Problem. Visuelle Qualität wurde explizit als wichtig bewertet (8–9 von 11 Nutzern). Moderne UI ist strategischer Wettbewerbsvorteil.

### Chance 4 — MSFS 2020/2024 als Primärplattform
9 von 11 Umfrageteilnehmern nutzen MSFS. Kein Tool bietet native MSFS-Integration mit Profi-Features.

### Chance 5 — VATSIM/IVAO Community gezielt ansprechen
191.000+ aktive Mitglieder, wächst rasant. Brauchen ATC-kompatible Routen, Eurocontrol IFPS-Compliance, schnelle Planung vor Slots. Loyale Community mit hohem Mundpropaganda-Potenzial.

### Chance 6 — Preispositionierung gegen Navigraph-Monopol
Navigraph wird als zu teuer empfunden. Mögliche Strategie: Free Tier mit Grundfunktionen + Pro Tier mit Navigraph-Integration und Profi-Features.

### Chance 7 — Wetter als integriertes Feature
3 von 11 Nutzern nennen Wetter als wichtigstes einzelnes Problem. METAR beim Airport-Input, Wetter-Layer auf der Karte, GRAMET-Querschnitt direkt im Planungsworkflow.

### Chancenmatrix

| Chance | Aufwand | Wirkung | Priorität |
|---|---|---|---|
| PFPX-Nachfolge (Pro-Features) | Hoch | Sehr hoch | ★★★★★ |
| All-in-One Workflow | Mittel | Sehr hoch | ★★★★★ |
| Moderne UI | Mittel | Hoch | ★★★★☆ |
| MSFS-Native Integration | Mittel | Hoch | ★★★★☆ |
| VATSIM/IVAO Community | Niedrig | Hoch | ★★★★☆ |
| Wetter integriert | Mittel | Mittel | ★★★☆☆ |
| Navigraph-Alternative | Hoch | Mittel | ★★★☆☆ |

---

## F9: Welche Trends und Veränderungen könnten unsere Kunden beeinflussen?

### Trend 1 — MSFS 2024 dominiert (Marktanteile 2026)
- MSFS 2024: 49,5%
- MSFS 2020: 27,8%
- X-Plane 12: 11,0%
- MSFS gesamt: 77,3% des Marktes

MSFS 2024 hat eigenen Flight Planner (Web + Mobile + In-Sim) — direkter Konkurrent. Microsoft verbessert ihn kontinuierlich.

### Trend 2 — Markt wächst stark
- Flugsimulations-Markt: $5,90 Mrd. (2024) → $8,59 Mrd. (2032), CAGR 4,7%
- Hardware-Markt: $1,84 Mrd. (2024) → $3,24 Mrd. (2033)

### Trend 3 — VATSIM/IVAO wächst explosionsartig
- VATSIM Q1 2025: 191.316 aktive Mitglieder
- IVAO 2024: 6.000 gleichzeitige Verbindungen (Rekord)
- vPilot Nov 2024 für MSFS 2024 aktualisiert

### Trend 4 — Hardware-Boom treibt Anspruch auf Realismus
- 70% der VR-Nutzer: nahezu realistische Erlebnisse
- Home-Cockpit-Markt wächst 2025 "unprecedented"
- Hardware-Enthusiasten sind natürliche Zielgruppe für Premium-Features

### Trend 5 — KI in der Flugplanung — noch nicht im Consumer-Markt
- Airlines nutzen KI bereits (Alaska Airlines, Flyways AI: 3–5% Treibstoffeinsparung)
- KI in Aviation: $1,75 Mrd. (2025) → $4,86 Mrd. (2030)
- Consumer-Segment: noch kein KI-gestütztes Tool für Simmer → First-Mover-Chance

### Trend 6 — Wetter- und Aviation-APIs werden zugänglich
- AviationWeather API (2025): JSON-Endpoints für METAR, TAF, PIREPs — kostenlos
- FAA Digital NOTAMs: maschinenlesbar
- OpenAIP, OurAirports: freie Navigationsdaten mit täglichen Updates

### Trend 7 — Mobile-First wird relevant
- MSFS 2024 Planner läuft auf Smartphone und Browser
- FlyCharts (iOS, 2025): vollständige Flugplanung mobil
- Reine Desktop-Apps verlieren mittelfristig

### Trend 8 — Navigraph unter Druck
- AviaPlanner (Juli 2024): Konkurrent mit LIDO-Charts, $3,50/Monat
- MSFS 2024 integriert LIDO nativ — umgeht Navigraph
- Navigraph-Monopol bröckelt — guter Zeitpunkt für Alternative

### Trend 9 — Creator Economy treibt Community-Wachstum
- Große YouTuber: ObsidianAnt (326K), Q8Pilot (104K), FlyWithLado (540K Instagram)
- Microsoft hat offizielles Creator-Programm
- Ein einziger Review kann FlightPlanner viral gehen lassen

---

## F10: Wenn sich nichts ändert, wie würde die Zukunft für die Nutzer aussehen?

### Kurzfristig (2026–2027) — Stagnation mit wachsender Frustration
- SimBrief bleibt der ungeliebte Standard — UI veraltet, keine Profi-Features
- PFPX-Vakuum bleibt unbesetzt (seit 2021 kein vollwertiger Ersatz)
- AviaPlanner bleibt Nischenprodukt ohne Community-Momentum

### Mittelfristig (2027–2029) — Marktkonsolidierung durch Microsoft
- MSFS 2024 Planner übernimmt das einfache Segment (Casual-Simmer)
- Navigraph zementiert Monopol — Preise steigen, Auswahl sinkt
- VATSIM/IVAO-Community leidet unter fehlenden professionellen Tools

### Langfristig (2029+) — Zwei-Klassen-Markt
- **Klasse A (Casual):** MSFS 2024 Planner — gut versorgt von Microsoft
- **Klasse B (Profi):** SimBrief (veraltet) + 3–4 Zusatztools — chronisch unterversorgt

### Kumulative Schadensrechnung
- Mehrzeit durch fragmentierte Tools: ~15 Min./Flug
- Flüge pro Woche: 3–4
- **Zeitverlust pro Jahr: ~40 Stunden** — eine volle Arbeitswoche verschwendet

### Zeitfenster für FlightPlanner

| Stand | PFPX-Lücke | Casual-Segment | VATSIM-Community |
|---|---|---|---|
| Jetzt | Offen | Erreichbar | Wächst |
| In 3 Jahren | Teils von AviaPlanner besetzt | Von MSFS absorbiert | Plateau |

**Das Zeitfenster ist offen — aber nicht unbegrenzt.**

---

## F11: Was wollen wir erreichen?

### Vision
> FlightPlanner wird der neue Standard für ernsthafte IFR-Flugsimulator-Piloten — die erste moderne All-in-One-Plattform, die SimBrief's Reichweite mit PFPX's Tiefe in einer professionellen Oberfläche vereint.

### Das Problem das wir lösen
Ernsthafte IFR-Simmer haben seit 2021 kein vollwertiges Planungstool mehr. PFPX ist tot, SimBrief ist veraltet und funktionsarm. Das Ergebnis: stundenlange Workarounds mit 3–4 fragmentierten Tools statt fokussiertem Fliegen.

### Gewünschte Ergebnisse

**Nutzernutzen:**
| Heute | Mit FlightPlanner |
|---|---|
| 3–4 Tools parallel | Ein Tool für den gesamten Workflow |
| 15–60 Min. Planungszeit | 5–10 Min. dank Automatisierung |
| Veraltete, frustrierende UI | Moderne, intuitive Oberfläche |
| Kein Redispatch / Tankering | Vollständiger Profi-Dispatch |
| Wetter separat recherchieren | Wetter direkt in der Planung |

**Marktposition:**
- Kurzfristig (Jahr 1): Bekanntester PFPX-Nachfolger in der MSFS-Community
- Mittelfristig (Jahr 2–3): Marktführer im Profi-IFR-Segment
- Langfristig (Jahr 4+): Industriestandard — was PFPX für P3D war, ist FlightPlanner für MSFS

### Geschäftsmodell (Empfehlung)
- **Free Tier:** Routengenerierung, Basis-Wetter, MSFS-Export
- **Pro Tier (~€8–12/Monat):** Redispatch, Tankering, OFP-Anpassung, ETOPS, Navigraph-Integration

### Adressierbarer Markt
- VATSIM aktive Mitglieder 2025: 191.000
- MSFS-Anteil (77%): ~147.000 potenzielle Nutzer
- Pro-Konversion (konservativ 10%): ~14.700 zahlende Nutzer
- Umsatz bei €10/Monat: ~€1,47 Mio./Jahr

### KPIs

**Wachstum:**
| Metrik | Ziel Jahr 1 | Ziel Jahr 2 | Ziel Jahr 3 |
|---|---|---|---|
| Registrierte Nutzer | 5.000 | 20.000 | 50.000 |
| Aktive Nutzer/Monat (MAU) | 2.000 | 10.000 | 30.000 |
| Zahlende Pro-Nutzer | 500 | 2.000 | 7.000 |
| VATSIM-Nutzeranteil | 20% | 35% | 50% |

**Qualität:**
- Planungszeit Durchschnitt: < 10 Minuten
- NPS (Net Promoter Score): > 50
- 7-Tage-Retention: > 60%
- Tool-Wechsel-Rate: > 40% kommen von SimBrief

**Finanziell:**
- MRR Jahr 1: €5.000 | Jahr 2: €20.000
- Churn Rate: < 5% (Jahr 1) | < 3% (Jahr 2)
- Free-to-Pro Conversion: > 10% (Jahr 1) | > 15% (Jahr 2)

---

## F12: Warum würden sie unsere Lösung benötigen? Welches Problem werden wir lindern? Was werden sie gewinnen?

### Der Kern — drei ungelöste Jobs

1. "Ich will professionell planen — wie ein echter Dispatcher."
2. "Ich will schnell starten — ohne stundenlangen Vorbereitungs-Overhead."
3. "Ich will alles an einem Ort — ohne zwischen 4 Tools zu wechseln."

### Welches Problem lindern wir?

**Problem 1 — Der zerbrochene Workflow**
Heute: SimBrief → Windy → GRAMET → MSFS Planner → METAR-Seite = 4–5 Tabs, 3 Apps, 15–60 Minuten.
Mit FlightPlanner: Ein Tool, 5–10 Minuten, Fokus auf das Fliegen.

**Problem 2 — Die PFPX-Lücke**
Seit November 2021 kein vollwertiger Dispatch-Workflow mehr. Redispatch, Tankering, OFP-Anpassung, ETOPS, Step Climb — alles weg.

**Problem 3 — Verlorene Flugzeit**
~40 Stunden Zeitverlust pro Nutzer/Jahr durch schlechtes Tooling.

**Problem 4 — Wachsende Kompetenzlücke für Einsteiger**
Neue VATSIM-Piloten scheitern an Komplexität → falsche Routen → ATC-Korrekturen → Frustration → Aufgabe.

### Was werden sie gewinnen?

**Funktionale Gewinne:**
| Gewinn | Konkreter Nutzen |
|---|---|
| Zeit zurückgewinnen | 40+ Stunden/Jahr mehr Flugzeit |
| Profi-Dispatch erleben | Redispatch, Tankering, OFP wie echte Piloten |
| Korrekte Routen auf VATSIM | Keine ATC-Korrekturen mehr |
| Wetter im Blick | METAR, Cross-Section, Winds direkt beim Plan |
| Vertrauen in die Route | Eurocontrol-Compliance automatisch geprüft |
| Modernes Interface | Keine "horrible usability" mehr |

**Emotionale Gewinne:**
- "Ich fühle mich wie ein echter Dispatcher"
- "Ich freue mich auf jeden Flug — die Planung macht sogar Spaß"
- "Endlich ein Tool das meinen Ansprüchen gerecht wird"

**Soziale Gewinne:**
- VATSIM-Piloten: professionelles Auftreten, weniger ATC-Korrekturen
- Realismus-Enthusiasten: authentischer Workflow, Zugehörigkeit zur "serious simmer" Community
- Content Creator: professioneller Planungsprozess on-stream

### Das Wertversprechen pro Segment

| Segment | Wertversprechen |
|---|---|
| VATSIM/IVAO-Pilot | "Korrekte Routen, ATC-ready, in 10 Minuten — ohne Tab-Wechsel." |
| PFPX-Vermisser | "Redispatch, Tankering, OFP — endlich wieder. Für MSFS 2024." |
| Realismus-Enthusiast | "Plant wie ein echter Dispatcher. Fliegt wie ein Profi." |
| IFR-Einsteiger | "IFR-Planung die erklärt statt überfordert — der direkte Weg zu VATSIM." |

### Jobs-to-be-Done

> Wenn ich einen IFR-Flug auf MSFS/VATSIM plane, will ich eine vollständige, professionelle Route in unter 10 Minuten — ohne Toolwechsel, damit ich mehr Zeit mit Fliegen verbringe und mich als ernsthafter Pilot fühle. Heute scheitere ich daran, weil kein Tool das vollständig löst — FlightPlanner ist die erste Antwort darauf.

---

## F13: Ist PFPX kostenpflichtig?

Ja, PFPX war kostenpflichtig — ein **Einmalkauf** (keine Subscription).

Seit **November 2021** wird es jedoch nicht mehr verkauft und ist nicht mehr erhältlich. Wer es vor diesem Datum gekauft hat, kann es weiterhin nutzen — bekommt aber keine Updates mehr.

Das ist einer der Hauptgründe warum die PFPX-Lücke so schmerzhaft ist: Nutzer können die Software nicht einmal mehr nachkaufen, selbst wenn sie wollten.
