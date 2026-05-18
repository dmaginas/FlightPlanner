namespace FlightPlanner.Api.Models;

/// <summary>
/// Antwortmodell für den Health-Check-Endpunkt GET /api/health.
/// </summary>
public sealed class HealthResponse
{
    /// <summary>Servicestatus, immer "ok".</summary>
    public required string Status { get; init; }

    /// <summary>Name des Backend-Dienstes.</summary>
    public required string Name { get; init; }

    /// <summary>Aktuelle Backend-Version (aus Assembly-Metadaten).</summary>
    public required string Version { get; init; }
}
