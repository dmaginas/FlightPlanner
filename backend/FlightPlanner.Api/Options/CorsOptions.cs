namespace FlightPlanner.Api.Options;

/// <summary>
/// Konfigurationsoptionen für CORS.
/// Wird aus "Cors"-Sektion in appsettings.json/appsettings.Development.json gelesen.
/// </summary>
public sealed class CorsOptions
{
    public const string SectionName = "Cors";

    /// <summary>
    /// Liste der erlaubten Origins für CORS.
    /// Beispiel: ["http://localhost:5173", "https://localhost:5173"]
    /// </summary>
    public string[] AllowedOrigins { get; set; } = [];
}
