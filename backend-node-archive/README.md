# FlightPlanner — Node/TypeScript Backend (Archiv)

> **Dieses Backend ist veraltet und wird nicht mehr aktiv verwendet.**

## Status

Dieses Verzeichnis enthält das ehemalige Node.js/TypeScript-Backend des FlightPlanner-Projekts
(Express, Vitest, Supertest). Es wurde archiviert, nachdem das aktive Backend auf
**ASP.NET Core (.NET 10 LTS)** migriert wurde.

## Aktives Backend

Das aktive Backend befindet sich unter:

```
backend/
  FlightPlanner.sln
  FlightPlanner.Api/
  FlightPlanner.Api.Tests/
```

Bitte verwende ausschließlich das ASP.NET-Core-Backend unter `backend/`.

## Warum archiviert?

- Das Projekt wurde auf C# / ASP.NET Core umgestellt, um eine einheitlichere
  .NET-Technologie mit Visual Studio 2026 zu nutzen.
- Das Node-Backend bleibt als Referenz für die ursprüngliche Implementierung erhalten.

## Hinweis

Starte dieses Backend **nicht** erneut als aktives Backend.
Alle Konfigurationen, Ports und Umgebungsvariablen sind veraltet.
