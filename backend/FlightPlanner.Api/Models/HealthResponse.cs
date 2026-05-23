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

    /// <summary>Status of each external API integration.</summary>
    public required IReadOnlyList<ApiServiceStatus> ApiServices { get; init; }
}

/// <summary>
/// Status of a single external API integration.
/// </summary>
public sealed class ApiServiceStatus
{
    /// <summary>Human-readable service name.</summary>
    public required string Name { get; init; }

    /// <summary>Machine-readable identifier.</summary>
    public required string Key { get; init; }

    /// <summary>
    /// "ok"             — configured and ready
    /// "not_configured" — API key required but not set
    /// "no_key_required"— no API key needed, always available
    /// </summary>
    public required string Status { get; init; }

    /// <summary>Short human-readable note (e.g. setup instructions).</summary>
    public required string Note { get; init; }

    /// <summary>Whether this service requires an API key.</summary>
    public bool KeyRequired { get; init; }
}
