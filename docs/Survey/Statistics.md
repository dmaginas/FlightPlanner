# FlightPlanner UX Survey – Auswertung

## Analyse der Umfrageergebnisse

Der Bericht wurde erstellt: **`FlightPlanner_Survey_Statistics.html`** im Downloads-Ordner.

---

Hier eine Zusammenfassung der wichtigsten Erkenntnisse aus den 11 Antworten:

### Kernbefunde

| Thema | Ergebnis |
|---|---|
| **Simulatoren** | 82 % MSFS 2020/2024, P3D & FlightGear je 18 % |
| **UI-Qualität** | 9/11 (82 %) sagen „Wichtig" |
| **Wetter** | 7/11 (64 %) sagen „Wichtig" |
| **#1 zu lösendes Problem** | Routing (5/11 = 45 %) |
| **Typische Planungsdauer** | Die Mehrheit plant 10–30 Minuten |
| **SimBrief-Export** | Gespalten: ~36 % wären froh ohne SimBrief, ~27 % würden den Export vermissen |

### Wichtigste Handlungsempfehlungen

1. **Routenerstellung** ist der wichtigste Differenzierungsfaktor – schnell, realistisch, IFPS-konform
2. **Alles in einer Oberfläche** – der häufigste Pain Point ist Tool-Switching (SimBrief + MSFS + PFPX)
3. **FMC-Export & Navigraph-Integration** werden als unverzichtbar genannt
4. **PFPX-Funktionen** (Redispatch, Tankering, OFP-Format) sprechen eine Power-User-Zielgruppe an
5. **Modernes UI** ist ein eigenständiger Mehrwert, nicht nur nice-to-have

Die HTML-Datei enthält interaktive Diagramme (Donut-Charts, Balkendiagramme) für alle Kategorien.

---

## Was bedeutet „IFPS-konform"?

**IFPS** steht für **Integrated Initial Flight Plan Processing System** – das ist das automatisierte System von EUROCONTROL, das alle Flugpläne im europäischen Luftraum verarbeitet und validiert.

### Was es bedeutet

Wenn ein Pilot (oder Dispatcher) einen IFR-Flugplan für Europa einreicht, läuft dieser zuerst durch das IFPS. Das System prüft automatisch, ob die geplante Route technisch und regulatorisch zulässig ist – zum Beispiel:

- **Streckenverfügbarkeit**: Darf diese Luftstraße (Airway) in dieser Richtung und zu dieser Tageszeit genutzt werden?
- **RAD-Restriktionen** (Route Availability Document): Manche Routen sind für bestimmte Flugzeugtypen, Gewichtsklassen oder Strecken gesperrt.
- **Korrekte Wegpunktfolge**: Sind alle Waypoints in der richtigen Reihenfolge und tatsächlich verbunden?
- **Formatvorschriften**: Entspricht der Flugplan dem ICAO-Format?

### Bezug zur Umfrage

Ein Teilnehmer schrieb explizit: *"carefully checking for Eurocontrol IFPS compliance"* – er baut Routen manuell und prüft dabei, ob sie das IFPS akzeptieren würde. Das ist ein realer Aufwand, den ein gutes Tool automatisch übernehmen könnte (z. B. durch Echtzeit-Validierung gegen das aktuelle RAD).

Für einen reinen Hobby-Simmer ohne VATSIM/IVAO ist das irrelevant. Für Realismus-orientierte Nutzer, die online fliegen, ist es ein wichtiges Qualitätsmerkmal.
