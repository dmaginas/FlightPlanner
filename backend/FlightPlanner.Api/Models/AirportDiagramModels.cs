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

public sealed record IlsDto(
    string RunwayIdent,
    string IlsIdent,
    double FrequencyMhz,
    string Category,
    double BearingDeg
);

public sealed record AtcFrequencyDto(
    string Type,
    string Description,
    double FrequencyMhz
);

public sealed record AirportDiagramResponse(
    string                 Icao,
    List<RunwayDto>        Runways,
    List<IlsDto>           IlsApproaches,
    List<AtcFrequencyDto>  AtcFrequencies
);
