namespace FlightPlanner.Api.Options;

/// <summary>
/// CORS configuration options.
/// Read from the "Cors" section in appsettings.json / appsettings.Development.json.
/// </summary>
public sealed class CorsOptions
{
    public const string SectionName = "Cors";

    /// <summary>
    /// Allowed origins for CORS.
    /// Example: ["http://localhost:5173", "https://localhost:5173"]
    /// </summary>
    public string[] AllowedOrigins { get; set; } = [];
}
