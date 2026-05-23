namespace FlightPlanner.Api.Services;

/// <summary>
/// Server-side AviationWeather proxy using HttpClientFactory.
///
/// Fetches https://aviationweather.gov/api/data/metar?ids={icao}&amp;format=raw
/// and https://aviationweather.gov/api/data/taf?ids={icao}&amp;format=raw.
/// No API key required. Raw text is returned as-is.
///
/// This class works around the browser CORS restriction by making the HTTP
/// request from the backend rather than from the browser.
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
            _logger.LogError(ex, "Network error fetching METAR from AviationWeather for ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Network,
                "AviationWeather is unreachable (network error). Please try again later.");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "AviationWeather returned HTTP {StatusCode} for ICAO {Icao}",
                (int)response.StatusCode, icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Http,
                $"AviationWeather returned HTTP {(int)response.StatusCode}.",
                (int)response.StatusCode);
        }

        var body = (await response.Content.ReadAsStringAsync(cancellationToken)).Trim();

        var firstLine = body
            .Split('\n', StringSplitOptions.None)
            .Select(l => l.Trim())
            .FirstOrDefault(l => !string.IsNullOrEmpty(l));

        if (firstLine is null)
        {
            _logger.LogInformation("AviationWeather returned an empty response for ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "No METAR is currently available for this airport.");
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
            _logger.LogError(ex, "Network error fetching TAF from AviationWeather for ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Network,
                "AviationWeather is unreachable (network error). Please try again later.");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("AviationWeather TAF HTTP {StatusCode} for ICAO {Icao}", (int)response.StatusCode, icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.Http,
                $"AviationWeather returned HTTP {(int)response.StatusCode}.",
                (int)response.StatusCode);
        }

        var body = (await response.Content.ReadAsStringAsync(cancellationToken)).Trim();

        if (string.IsNullOrWhiteSpace(body))
        {
            _logger.LogInformation("AviationWeather TAF: empty response for ICAO {Icao}", icao);
            throw new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "No TAF is currently available for this airport.");
        }

        return body;
    }
}
