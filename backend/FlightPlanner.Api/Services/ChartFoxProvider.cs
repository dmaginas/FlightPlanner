using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Options;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Chart provider for ChartFox (worldwide airports, requires Bearer token, cached 12 h).
/// </summary>
public sealed class ChartFoxProvider : IChartProvider
{
    private const string ChartFoxCacheKeyPrefix = "chartfox_charts_v1_";
    private static readonly TimeSpan ChartFoxCacheTtl = TimeSpan.FromHours(12);

    private readonly HttpClient              _http;
    private readonly ChartFoxOptions         _options;
    private readonly IMemoryCache            _cache;
    private readonly ILogger<ChartFoxProvider> _logger;

    public string SourceName => "chartfox";

    public ChartFoxProvider(
        HttpClient http,
        ChartFoxOptions options,
        IMemoryCache cache,
        ILogger<ChartFoxProvider> logger)
    {
        _http    = http;
        _options = options;
        _cache   = cache;
        _logger  = logger;
    }

    public async Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey)) return [];

        var cacheKey = ChartFoxCacheKeyPrefix + icao;
        if (_cache.TryGetValue(cacheKey, out List<ChartDto>? cachedCharts) && cachedCharts is not null)
            return cachedCharts;

        var charts  = new List<ChartDto>();
        string? nextUrl = $"https://api.chartfox.org/v2/airports/{icao}/charts/grouped";

        try
        {
            while (nextUrl is not null)
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, nextUrl);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

                using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseContentRead, ct);
                if (!resp.IsSuccessStatusCode) break;

                var page = await resp.Content.ReadFromJsonAsync<ChartFoxPageResponse>(cancellationToken: ct);
                if (page is null) break;

                charts.AddRange(page.Data.Select(c =>
                    new ChartDto(c.Id, c.Name, MapChartFoxType(c.Type), "chartfox")));

                nextUrl = page.Meta?.NextPageUrl;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ChartFox lookup failed for {Icao}", icao);
        }

        _cache.Set(cacheKey, charts, ChartFoxCacheTtl);
        return charts;
    }

    public async Task<(Stream Stream, string ContentType)> GetFileAsync(string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException("ChartFox API key not configured.");

        using var req = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.chartfox.org/v2/charts/{Uri.EscapeDataString(id)}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseContentRead, ct);
        resp.EnsureSuccessStatusCode();

        var detail = await resp.Content.ReadFromJsonAsync<ChartFoxDetailResponse>(cancellationToken: ct);
        if (string.IsNullOrWhiteSpace(detail?.Url))
            throw new InvalidOperationException("ChartFox returned no download URL.");

        var fileUrl    = Uri.UnescapeDataString(detail.Url);
        var fileStream = await _http.GetStreamAsync(fileUrl, ct);
        return (fileStream, "application/pdf");
    }

    private static string MapChartFoxType(int type) => type switch
    {
        1 or 2 => "REF",
        3      => "APT",
        4      => "DEP",
        5      => "ARR",
        6 or 7 => "APP",
        _      => "OTHER",
    };

    private sealed class ChartFoxPageResponse
    {
        [JsonPropertyName("data")] public List<ChartFoxItem> Data { get; init; } = [];
        [JsonPropertyName("meta")] public ChartFoxPageMeta? Meta { get; init; }
    }

    private sealed class ChartFoxItem
    {
        [JsonPropertyName("id")]   public string Id   { get; init; } = "";
        [JsonPropertyName("name")] public string Name { get; init; } = "";
        [JsonPropertyName("type")] public int    Type { get; init; }
    }

    private sealed class ChartFoxPageMeta
    {
        [JsonPropertyName("next_page_url")] public string? NextPageUrl { get; init; }
    }

    private sealed class ChartFoxDetailResponse
    {
        [JsonPropertyName("url")] public string? Url { get; init; }
    }
}
