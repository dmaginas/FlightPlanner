using System.Net.Http.Headers;
using System.Text.Json;
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
    private readonly IChartFoxTokenService   _tokenService;
    private readonly IMemoryCache            _cache;
    private readonly ILogger<ChartFoxProvider> _logger;

    public string SourceName => "chartfox";

    public ChartFoxProvider(
        HttpClient http,
        ChartFoxOptions options,
        IChartFoxTokenService tokenService,
        IMemoryCache cache,
        ILogger<ChartFoxProvider> logger)
    {
        _http         = http;
        _options      = options;
        _tokenService = tokenService;
        _cache        = cache;
        _logger       = logger;
    }

    public async Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct)
    {
        var token = await ResolveTokenAsync(ct);
        if (token is null) return [];

        var cacheKey = ChartFoxCacheKeyPrefix + icao;
        if (_cache.TryGetValue(cacheKey, out List<ChartDto>? cachedCharts) && cachedCharts is not null)
            return cachedCharts;

        var charts = new List<ChartDto>();
        var url = $"https://api.chartfox.org/v2/airports/{icao}/charts/grouped";

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseContentRead, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("ChartFox returned {Status} for {Icao}", resp.StatusCode, icao);
            }
            else
            {
                await using var stream = await resp.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                charts.AddRange(ReadGroupedCharts(doc.RootElement));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ChartFox lookup failed for {Icao}", icao);
        }

        _cache.Set(cacheKey, charts, ChartFoxCacheTtl);
        return charts;
    }

    public async Task<ChartFile> GetFileAsync(string id, CancellationToken ct)
    {
        var token = await ResolveTokenAsync(ct)
            ?? throw new InvalidOperationException("ChartFox is not authenticated.");

        using var req = new HttpRequestMessage(HttpMethod.Get,
            $"https://api.chartfox.org/v2/charts/{Uri.EscapeDataString(id)}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseContentRead, ct);
        resp.EnsureSuccessStatusCode();

        var detail = await resp.Content.ReadFromJsonAsync<ChartFoxDetailResponse>(cancellationToken: ct);
        if (string.IsNullOrWhiteSpace(detail?.Url))
            throw new InvalidOperationException("ChartFox returned no download URL.");

        // The source PDF must be fetched by the browser, not the backend: national AIS
        // servers (e.g. behind Akamai) reject server-side requests with 403 but serve
        // real browsers. Hand the resolved URL back for the browser to load directly.
        return new RedirectChartFile(detail.Url);
    }

    // OAuth token takes priority; falls back to legacy static ApiKey.
    private async Task<string?> ResolveTokenAsync(CancellationToken ct)
    {
        var oauthToken = await _tokenService.GetTokenAsync(ct);
        return oauthToken ?? (_options.ApiKey is { Length: > 0 } k ? k : null);
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

    // ChartFox's /grouped endpoint returns "data" as an object keyed by chart type
    // (e.g. "0", "6") when charts exist, but as an empty array ([]) when there are
    // none. Only the object form carries charts; any other shape means no charts.
    private static IEnumerable<ChartDto> ReadGroupedCharts(JsonElement root)
    {
        if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            yield break;

        foreach (var group in data.EnumerateObject())
            foreach (var item in group.Value.EnumerateArray())
                yield return new ChartDto(
                    ReadString(item, "id"),
                    ReadString(item, "name"),
                    MapChartFoxType(item.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.Number ? t.GetInt32() : 0),
                    "chartfox");
    }

    private static string ReadString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) ? value.GetString() ?? "" : "";

    private sealed class ChartFoxDetailResponse
    {
        [JsonPropertyName("url")] public string? Url { get; init; }
    }
}
