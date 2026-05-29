namespace FlightPlanner.Api.Models;

public sealed record RunwayDto(
    string LeIdent,
    double LeLat,
    double LeLon,
    string HeIdent,
    double HeLat,
    double HeLon,
    int    LengthFt,
    int    WidthFt,
    string Surface,
    bool   Lighted,
    bool   Closed
);

public sealed record AirportDiagramResponse(
    string          Icao,
    List<RunwayDto> Runways
);
