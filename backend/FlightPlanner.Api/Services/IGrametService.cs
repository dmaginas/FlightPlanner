using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches GRAMET-style cross-section weather data from Open Meteo
/// for a list of route waypoints at multiple pressure levels.
/// </summary>
public interface IGrametService
{
    /// <summary>
    /// Fetches pressure-level weather data for each waypoint in parallel.
    /// Returns a fallback with zero values for any waypoint that fails.
    /// </summary>
    Task<GrametResponse> FetchGrametAsync(
        IReadOnlyList<GrametWaypointInput> waypoints,
        CancellationToken ct = default);
}
