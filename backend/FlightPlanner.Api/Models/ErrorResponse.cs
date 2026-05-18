namespace FlightPlanner.Api.Models;

/// <summary>
/// Standardisiertes JSON-Fehlerformat für API-Fehlerantworten.
/// </summary>
public sealed class ErrorResponse
{
    /// <summary>Kurze, maschinenlesbare Fehlerbeschreibung.</summary>
    public required string Error { get; init; }

    /// <summary>Ausführliche, benutzerlesbare Fehlerbeschreibung.</summary>
    public required string Details { get; init; }
}
