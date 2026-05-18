namespace FlightPlanner.Api.Services;

/// <summary>
/// Interface für den serverseitigen AviationWeather-METAR-Abruf.
/// Abstrahiert den HTTP-Aufruf für Dependency Injection und Testbarkeit.
/// </summary>
public interface IAviationWeatherService
{
    /// <summary>
    /// Ruft den rohen METAR-Text für den angegebenen ICAO-Code von AviationWeather ab.
    /// </summary>
    /// <param name="icao">Validierter, normalisierter ICAO-Code (4 alphanumerische Zeichen, Großbuchstaben).</param>
    /// <param name="cancellationToken">Abbruch-Token.</param>
    /// <returns>Den rohen METAR-Text (erste nicht-leere Zeile der Antwort).</returns>
    /// <exception cref="AviationWeatherException">
    /// Wird ausgelöst bei HTTP-Fehlern, Netzwerkfehlern oder leerer Antwort.
    /// </exception>
    Task<string> FetchRawMetarAsync(string icao, CancellationToken cancellationToken = default);
}

/// <summary>Art des Fehlers beim AviationWeather-Abruf.</summary>
public enum AviationWeatherErrorKind
{
    /// <summary>AviationWeather hat einen HTTP-Fehler-Statuscode zurückgegeben.</summary>
    Http,

    /// <summary>Es konnte keine Netzwerkverbindung zu AviationWeather hergestellt werden.</summary>
    Network,

    /// <summary>AviationWeather hat eine leere oder nur aus Whitespace bestehende Antwort geliefert.</summary>
    EmptyResponse,
}

/// <summary>
/// Exception die ausgelöst wird, wenn der AviationWeather-Abruf fehlschlägt.
/// </summary>
public sealed class AviationWeatherException : Exception
{
    public AviationWeatherErrorKind Kind { get; }
    public int? HttpStatusCode { get; }

    public AviationWeatherException(AviationWeatherErrorKind kind, string message, int? httpStatusCode = null)
        : base(message)
    {
        Kind = kind;
        HttpStatusCode = httpStatusCode;
    }
}
