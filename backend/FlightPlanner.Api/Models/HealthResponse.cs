namespace FlightPlanner.Api.Models;

/// <summary>
/// Response model for the health-check endpoint GET /api/health.
/// </summary>
public sealed class HealthResponse
{
    /// <summary>Service status — always "ok".</summary>
    public required string Status { get; init; }

    /// <summary>Name of the backend service.</summary>
    public required string Name { get; init; }

    /// <summary>Current backend version (from assembly metadata).</summary>
    public required string Version { get; init; }
}
