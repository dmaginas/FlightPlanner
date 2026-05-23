namespace FlightPlanner.Api.Services;

/// <summary>
/// Server-side AviationWeather proxy interface.
/// Abstracts HTTP calls for dependency injection and testability.
/// </summary>
public interface IAviationWeatherService
{
    /// <summary>
    /// Fetches the raw METAR string for the given ICAO code from AviationWeather.
    /// </summary>
    /// <param name="icao">Validated, normalised ICAO code (4 alphanumeric characters, upper-case).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The raw METAR string (first non-empty line of the response).</returns>
    /// <exception cref="AviationWeatherException">
    /// Thrown on HTTP errors, network errors, or empty responses.
    /// </exception>
    Task<string> FetchRawMetarAsync(string icao, CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches the raw TAF string for the given ICAO code from AviationWeather.
    /// </summary>
    Task<string> FetchRawTafAsync(string icao, CancellationToken cancellationToken = default);
}

/// <summary>Error kind for AviationWeather fetch failures.</summary>
public enum AviationWeatherErrorKind
{
    /// <summary>AviationWeather returned an HTTP error status code.</summary>
    Http,

    /// <summary>No network connection could be established to AviationWeather.</summary>
    Network,

    /// <summary>AviationWeather returned an empty or whitespace-only response.</summary>
    EmptyResponse,
}

/// <summary>
/// Exception thrown when an AviationWeather fetch fails.
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
