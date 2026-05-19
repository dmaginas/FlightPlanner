namespace FlightPlanner.Api.Options;

/// <summary>
/// Configuration options for the Flight Plan Database API integration.
/// Bind from the "FlightPlanDatabase" section in appsettings.json or user secrets.
/// </summary>
public sealed class FlightPlanDatabaseOptions
{
    public const string SectionName = "FlightPlanDatabase";

    /// <summary>
    /// Flight Plan Database API key. Must NOT be empty at request time.
    /// Set via user secrets: dotnet user-secrets set "FlightPlanDatabase:ApiKey" "YOUR_KEY"
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Base URL for the Flight Plan Database API (no trailing slash).</summary>
    public string BaseUrl { get; set; } = "https://api.flightplandatabase.com";

    /// <summary>Server-side in-memory cache TTL in minutes. Default: 30.</summary>
    public int CacheTtlMinutes { get; set; } = 30;
}
