namespace FlightPlanner.Api.Models;

// ── Frontend-facing route DTOs ─────────────────────────────────────────────────

/// <summary>Top-level response from GET /api/routes.</summary>
public sealed class RouteResponse
{
    /// <summary>The primary IFR route to display. Null if no route could be found.</summary>
    public SelectedRouteDto? SelectedRoute { get; init; }

    /// <summary>Alternative routes (metadata only) for future UI selection.</summary>
    public IReadOnlyList<AlternativeRouteDto> Alternatives { get; init; } = [];

    /// <summary>
    /// Human-readable warning when the result is a fallback or partial.
    /// Null on fully successful external lookup.
    /// </summary>
    public string? Warning { get; init; }
}

/// <summary>Primary route including all waypoints.</summary>
public sealed class SelectedRouteDto
{
    public string? Id { get; init; }
    public required string Departure { get; init; }
    public required string Destination { get; init; }
    public string? AircraftType { get; init; }
    public int? CruisingAltitude { get; init; }
    public string RouteType { get; init; } = "IFR";

    /// <summary>Route string (waypoint idents separated by spaces), e.g. "ANEKI UL9 KONAN SILVA".</summary>
    public string? RouteText { get; init; }

    public IReadOnlyList<WaypointDto> Waypoints { get; init; } = [];
    public double? DistanceNm { get; init; }

    /// <summary>"flight-plan-database" or "local-fallback".</summary>
    public required string Source { get; init; }
}

/// <summary>Single waypoint in the route.</summary>
public sealed class WaypointDto
{
    /// <summary>ICAO / fix identifier, e.g. "EDDF" or "ANEKI".</summary>
    public required string Id { get; init; }

    public string? Name { get; init; }
    public double? Lat { get; init; }
    public double? Lon { get; init; }

    /// <summary>Normalised type: "airport", "fix", "vor", "ndb".</summary>
    public string? Type { get; init; }
}

/// <summary>Alternative route candidate (metadata only — no full waypoints).</summary>
public sealed class AlternativeRouteDto
{
    public string? Id { get; init; }
    public string? RouteText { get; init; }
    public double? DistanceNm { get; init; }
    public string? UpdatedAt { get; init; }
    public double? Popularity { get; init; }
}
