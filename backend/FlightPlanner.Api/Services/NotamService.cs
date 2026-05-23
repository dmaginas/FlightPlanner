using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Options;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches NOTAMs from the FAA NOTAM API (api.faa.gov).
/// Configuration: set FaaNotam:ApiKey in user secrets.
///   dotnet user-secrets set "FaaNotam:ApiKey" "YOUR_KEY"
/// Free registration: https://api.faa.gov/
/// </summary>
public sealed class NotamService : INotamService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly NotamOptions _options;
    private readonly ILogger<NotamService> _logger;

    public NotamService(HttpClient httpClient, NotamOptions options, ILogger<NotamService> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task<NotamResult> FetchNotamsAsync(string icao, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new NotamException(
                NotamErrorKind.ConfigurationMissing,
                "FaaNotam:ApiKey is not configured. " +
                "Free registration: https://api.faa.gov/ — then run: " +
                "dotnet user-secrets set \"FaaNotam:ApiKey\" \"YOUR_KEY\"");
        }

        var url = $"{_options.BaseUrl}/notams" +
                  $"?icaoLocation={Uri.EscapeDataString(icao)}" +
                  $"&pageSize={_options.PageSize}&pageNum=1";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Authorization", $"apikey {_options.ApiKey}");
        request.Headers.Add("Accept", "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Network error fetching NOTAMs for ICAO {Icao}", icao);
            throw new NotamException(NotamErrorKind.Network,
                "FAA NOTAM API is unreachable (network error).");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("FAA NOTAM API HTTP {Status} for ICAO {Icao}", (int)response.StatusCode, icao);
            throw new NotamException(NotamErrorKind.Http,
                $"FAA NOTAM API returned HTTP {(int)response.StatusCode}.",
                (int)response.StatusCode);
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var envelope = JsonSerializer.Deserialize<FaaNotamEnvelope>(body, JsonOptions);

        if (envelope?.Items is null || envelope.Items.Count == 0)
            return new NotamResult([], 0);

        var items = envelope.Items
            .Select(MapItem)
            .Where(n => n is not null)
            .Cast<NotamItem>()
            .ToList();

        return new NotamResult(items, envelope.TotalCount);
    }

    private static NotamItem? MapItem(FaaNotamFeature feature)
    {
        var notam = feature.Properties?.CoreNotamData?.Notam;
        if (notam is null) return null;

        return new NotamItem(
            Id:              notam.Id   ?? string.Empty,
            Number:          notam.Number ?? notam.Id ?? string.Empty,
            Text:            notam.Text ?? string.Empty,
            EffectiveStart:  notam.EffectiveStart ?? string.Empty,
            EffectiveEnd:    notam.EffectiveEnd,
            Classification:  notam.Classification ?? string.Empty);
    }

    // ── FAA API deserialization models ─────────────────────────────────────────

    private sealed class FaaNotamEnvelope
    {
        [JsonPropertyName("totalCount")] public int TotalCount { get; set; }
        [JsonPropertyName("items")]      public List<FaaNotamFeature>? Items { get; set; }
    }

    private sealed class FaaNotamFeature
    {
        [JsonPropertyName("properties")] public FaaNotamProperties? Properties { get; set; }
    }

    private sealed class FaaNotamProperties
    {
        [JsonPropertyName("coreNOTAMData")] public FaaCoreNotamData? CoreNotamData { get; set; }
    }

    private sealed class FaaCoreNotamData
    {
        [JsonPropertyName("notam")] public FaaNotam? Notam { get; set; }
    }

    private sealed class FaaNotam
    {
        [JsonPropertyName("id")]             public string? Id { get; set; }
        [JsonPropertyName("number")]         public string? Number { get; set; }
        [JsonPropertyName("text")]           public string? Text { get; set; }
        [JsonPropertyName("effectiveStart")] public string? EffectiveStart { get; set; }
        [JsonPropertyName("effectiveEnd")]   public string? EffectiveEnd { get; set; }
        [JsonPropertyName("classification")] public string? Classification { get; set; }
    }
}
