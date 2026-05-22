namespace FlightPlanner.Api.Models;

/// <summary>Request body for POST /api/gramet.</summary>
public sealed class GrametRequest
{
    /// <summary>Route waypoints to fetch weather data for. Max 15.</summary>
    public required IReadOnlyList<GrametWaypointInput> Waypoints { get; init; }
}

/// <summary>A single waypoint for which to request pressure-level weather data.</summary>
public sealed class GrametWaypointInput
{
    public required string Id { get; init; }
    public double Lat { get; init; }
    public double Lon { get; init; }
    /// <summary>Cumulative distance from departure in nautical miles.</summary>
    public double DistanceNm { get; init; }
}

/// <summary>Full GRAMET cross-section response for the requested route.</summary>
public sealed class GrametResponse
{
    public required IReadOnlyList<GrametWaypointData> Waypoints { get; init; }
    /// <summary>ISO 8601 UTC timestamp when this data was fetched.</summary>
    public required string GeneratedAt { get; init; }
}

/// <summary>Weather cross-section for a single waypoint at all pressure levels.</summary>
public sealed class GrametWaypointData
{
    public required string Id { get; init; }
    public double Lat { get; init; }
    public double Lon { get; init; }
    public double DistanceNm { get; init; }
    public required IReadOnlyList<GrametLevelData> Levels { get; init; }
}

/// <summary>Weather data at one pressure level for one waypoint.</summary>
public sealed class GrametLevelData
{
    public int PressureHPa { get; init; }
    /// <summary>Approximate altitude in feet (ISA standard).</summary>
    public int FlightLevelFt { get; init; }
    public double TempC { get; init; }
    public double WindSpeedKt { get; init; }
    public int WindDirDeg { get; init; }
    public int CloudCoverPct { get; init; }
}
