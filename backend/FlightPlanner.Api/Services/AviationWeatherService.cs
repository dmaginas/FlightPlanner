namespace FlightPlanner.Api.Services;

/// <summary>
/// Serverseitiger AviationWeather-METAR-Abruf über HttpClientFactory.
///
/// Ruft https://aviationweather.gov/api/data/metar?ids={icao}&amp;format=raw ab.
/// Kein API-Key erforderlich. METAR-Daten werden als roher Text zurückgegeben.
///
/// Diese Klasse löst den Browser-CORS-Fehler, da der HTTP-Request vom Backend
/// (nicht vom Browser) ausgeht und daher nicht der CORS-Richtlinie unterliegt.
/// </summary>
public sealed class AviationWeatherService : IAviationWeatherService
{
    private const string MetarBaseUrl = "https://aviationweather.gov/api/data/metar";
    private const string TafBaseUrl   = "https://aviationweather.gov/api/data/taf";
    private readonly HttpClient _httpClient;
    private readonly ILogger<AviationWeatherService> _logger;

    public AviationWeatherService(HttpClient httpClient, ILogger<AviationWeatherService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string> FetchRawMetarAsync(string icao, CancellationToken cancellationToken = default)
    {
        var url = $"{MetarBaseUrl}?ids={Uri.EscapeDataString(icao)}&format=raw";

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync(url, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Netzwerkfehler beim Abruf von AviationWeather für ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Network,
                "AviationWeather ist nicht erreichbar (Netzwerkfehler). Bitte später erneut versuchen.");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "AviationWeather hat HTTP {StatusCode} für ICAO {Icao} zurückgegeben",
                (int)response.StatusCode, icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Http,
                $"AviationWeather hat HTTP {(int)response.StatusCode} zurückgegeben.",
                (int)response.StatusCode);
        }

        var body = (await response.Content.ReadAsStringAsync(cancellationToken)).Trim();

        var firstLine = body
            .Split('\n', StringSplitOptions.None)
            .Select(l => l.Trim())
            .FirstOrDefault(l => !string.IsNullOrEmpty(l));

        if (firstLine is null)
        {
            _logger.LogInformation("AviationWeather hat eine leere Antwort für ICAO {Icao} geliefert", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "Für diesen Flughafen ist aktuell kein METAR verfügbar.");
        }

        return firstLine;
    }

    /// <inheritdoc />
    public async Task<string> FetchRawTafAsync(string icao, CancellationToken cancellationToken = default)
    {
        var url = $"{TafBaseUrl}?ids={Uri.EscapeDataString(icao)}&format=raw";

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync(url, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Netzwerkfehler beim TAF-Abruf für ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Network,
                "AviationWeather ist nicht erreichbar (Netzwerkfehler). Bitte später erneut versuchen.");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("AviationWeather TAF HTTP {StatusCode} für ICAO {Icao}", (int)response.StatusCode, icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Http,
                $"AviationWeather hat HTTP {(int)response.StatusCode} zurückgegeben.",
                (int)response.StatusCode);
        }

        var body = (await response.Content.ReadAsStringAsync(cancellationToken)).Trim();

        if (string.IsNullOrWhiteSpace(body))
        {
            _logger.LogInformation("AviationWeather TAF: leere Antwort für ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "Für diesen Flughafen ist aktuell kein TAF verfügbar.");
        }

        return body;
    }
}
