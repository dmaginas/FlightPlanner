namespace FlightPlanner.Api.Models;

/// <summary>Response from GET /api/navdata — navaid/fix/airway data for a map bounding box.</summary>
public sealed class NavDataBboxResult
{
    public IReadOnlyList<VorDto>      Vors    { get; init; } = [];
    public IReadOnlyList<NdbDto>      Ndbs    { get; init; } = [];
    public IReadOnlyList<FixDto>      Fixes   { get; init; } = [];
    public IReadOnlyList<AirwaySegDto> Airways { get; init; } = [];
}

public sealed record VorDto(string Ident, string Name, double Lat, double Lon, double FreqMhz);
public sealed record NdbDto(string Ident, string Name, double Lat, double Lon, double FreqKhz);
public sealed record FixDto(string Ident, double Lat, double Lon);
public sealed record AirwaySegDto(string Airway, double FromLat, double FromLon, double ToLat, double ToLon);
