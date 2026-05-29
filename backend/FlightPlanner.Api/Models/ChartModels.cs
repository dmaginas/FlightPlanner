namespace FlightPlanner.Api.Models;

public sealed record ChartDto(
    string Id,
    string Name,
    string Type,    // "APT" | "DEP" | "ARR" | "APP" | "REF" | "OTHER"
    string Source   // "faa" | "chartfox"
);

public sealed record ChartListResponse(
    string        Icao,
    List<ChartDto> Charts
);
