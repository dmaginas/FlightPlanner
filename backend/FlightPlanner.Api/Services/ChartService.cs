using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using System.Xml.Linq;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Options;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Aggregates airport charts from two sources:
///   - FAA d-TPP (US airports, no auth, cached per AIRAC cycle)
///   - ChartFox  (worldwide, requires Bearer token, cached 12 h)
///
/// Strategy: if FAA has charts for the requested ICAO, return those only.
/// Otherwise fall back to ChartFox (international airports).
/// </summary>
public sealed class ChartService : IChartService
{
    private const string FaaCacheKey      = "faa_dtpp_v2";
    private const string ChartFoxCacheKeyPrefix = "chartfox_charts_v1_";
    private static readonly TimeSpan FaaCacheTtl      = TimeSpan.FromHours(24);
    private static readonly TimeSpan ChartFoxCacheTtl = TimeSpan.FromHours(12);

    private readonly HttpClient              _http;
    private readonly ChartFoxOptions         _options;
    private readonly IMemoryCache            _cache;
    private readonly ILogger<ChartService>   _logger;

    // AIRAC effective dates — sorted descending so the first match wins
    private static readonly (string Cycle, DateOnly Start)[] AiracCycles =
    [
        ("2613", new DateOnly(2026, 12, 24)),
        ("2612", new DateOnly(2026, 11, 26)),
        ("2611", new DateOnly(2026, 10, 29)),
        ("2610", new DateOnly(2026, 10,  1)),
        ("2609", new DateOnly(2026,  9,  3)),
        ("2608", new DateOnly(2026,  8,  6)),
        ("2607", new DateOnly(2026,  7,  9)),
        ("2606", new DateOnly(2026,  6, 11)),
        ("2605", new DateOnly(2026,  5, 14)),
        ("2604", new DateOnly(2026,  4, 16)),
        ("2603", new DateOnly(2026,  3, 19)),
        ("2602", new DateOnly(2026,  2, 19)),
        ("2601", new DateOnly(2026,  1, 22)),
        ("2513", new DateOnly(2025, 12, 25)),
        ("2512", new DateOnly(2025, 11, 27)),
        ("2511", new DateOnly(2025, 10, 30)),
        ("2510", new DateOnly(2025, 10,  2)),
        ("2509", new DateOnly(2025,  9,  4)),
        ("2508", new DateOnly(2025,  8,  7)),
        ("2507", new DateOnly(2025,  7, 10)),
        ("2506", new DateOnly(2025,  6, 12)),
        ("2505", new DateOnly(2025,  5, 15)),
        ("2504", new DateOnly(2025,  4, 17)),
        ("2503", new DateOnly(2025,  3, 20)),
        ("2502", new DateOnly(2025,  2, 20)),
        ("2501", new DateOnly(2025,  1, 23)),
    ];

    public ChartService(
        HttpClient http,
        ChartFoxOptions options,
        IMemoryCache cache,
        ILogger<ChartService> logger)
    {
        _http    = http;
        _options = options;
        _cache   = cache;
        _logger  = logger;
    }

    public async Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct = default)
    {
        var upper = icao.ToUpperInvariant();

        var faa = await GetFaaChartsAsync(upper, ct);
        if (faa.Count > 0) return faa;

        return await GetChartFoxChartsAsync(upper, ct);
    }

    public async Task<(Stream Stream, string ContentType)> GetChartFileAsync(
        string source, string id, CancellationToken ct = default)
    {
        switch (source)
        {
            case "faa":
            {
                // Use cached cycle if available, otherwise fall back to AIRAC table
                var cycle = _cache.TryGetValue(FaaCacheKey, out FaaCacheData? d) && d is not null
                    ? d.Cycle
                    : GetCurrentAiracCycle();
                var url    = $"https://aeronav.faa.gov/d-tpp/{cycle}/{Uri.EscapeDataString(id)}";
                var stream = await _http.GetStreamAsync(url, ct);
                return (stream, "application/pdf");
            }

            case "chartfox":
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

                var fileUrl = Uri.UnescapeDataString(detail.Url);
                var fileStream = await _http.GetStreamAsync(fileUrl, ct);
                return (fileStream, "application/pdf");
            }

            default:
                throw new ArgumentException($"Unknown chart source: {source}", nameof(source));
        }
    }

    // ── FAA d-TPP ─────────────────────────────────────────────────────────────

    private async Task<List<ChartDto>> GetFaaChartsAsync(string icao, CancellationToken ct)
    {
        try
        {
            var data = await LoadFaaMetadataAsync(ct);
            if (!data.Charts.TryGetValue(icao, out var records)) return [];

            return records
                .Select(r => new ChartDto(r.PdfName, r.ChartName, MapFaaCode(r.ChartCode), "faa"))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "FAA chart lookup failed for {Icao}", icao);
            return [];
        }
    }

    private async Task<FaaCacheData> LoadFaaMetadataAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(FaaCacheKey, out FaaCacheData? cached) && cached is not null)
            return cached;

        // Use the "current" alias — always points to the active AIRAC cycle, no cycle calc needed.
        // Fallback: aeronav.faa.gov/d-tpp/{cycle}/xml_data/d-TPP_Metafile.xml
        const string primaryUrl  = "https://nfdc.faa.gov/webContent/dtpp/current.xml";
        _logger.LogInformation("Downloading FAA d-TPP current.xml…");

        var xml = await _http.GetStringAsync(primaryUrl, ct);
        var doc = XDocument.Parse(xml);

        // Root element carries the cycle identifier, e.g. <digital_tpp cycle="2605" ...>
        var cycle = doc.Root?.Attribute("cycle")?.Value ?? GetCurrentAiracCycle();

        var dict = new Dictionary<string, List<FaaRecord>>(StringComparer.OrdinalIgnoreCase);

        foreach (var airport in doc.Descendants("airport_name"))
        {
            var icaoAttr = airport.Attribute("icao_ident")?.Value;
            if (string.IsNullOrWhiteSpace(icaoAttr)) continue;

            var records = airport.Elements("record")
                .Select(r => new FaaRecord(
                    r.Element("chart_code")?.Value ?? "",
                    r.Element("chart_name")?.Value ?? "",
                    r.Element("pdf_name")?.Value   ?? ""))
                .Where(r => !string.IsNullOrWhiteSpace(r.PdfName))
                .ToList();

            if (records.Count > 0)
                dict[icaoAttr] = records;
        }

        var data = new FaaCacheData(cycle, dict);
        _cache.Set(FaaCacheKey, data, FaaCacheTtl);
        _logger.LogInformation("FAA d-TPP cached: cycle={Cycle}, {Count} airports", cycle, dict.Count);
        return data;
    }

    private static string GetCurrentAiracCycle()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var (cycle, start) in AiracCycles)
        {
            if (start <= today) return cycle;
        }
        return AiracCycles[^1].Cycle;
    }

    private sealed record FaaCacheData(string Cycle, Dictionary<string, List<FaaRecord>> Charts);

    private static string MapFaaCode(string code) => code switch
    {
        "APD" or "HOT" => "APT",
        "MIN"          => "APT",
        "DP"           => "DEP",
        "STAR"         => "ARR",
        "IAP"          => "APP",
        _              => "OTHER",
    };

    // ── ChartFox ──────────────────────────────────────────────────────────────

    private async Task<List<ChartDto>> GetChartFoxChartsAsync(string icao, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey)) return [];

        var cacheKey = ChartFoxCacheKeyPrefix + icao;
        if (_cache.TryGetValue(cacheKey, out List<ChartDto>? cachedCharts) && cachedCharts is not null)
            return cachedCharts;

        var charts = new List<ChartDto>();
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

    private static string MapChartFoxType(int type) => type switch
    {
        1 or 2 => "REF",
        3      => "APT",
        4      => "DEP",
        5      => "ARR",
        6 or 7 => "APP",
        _      => "OTHER",
    };

    // ── Private records ───────────────────────────────────────────────────────

    private sealed record FaaRecord(string ChartCode, string ChartName, string PdfName);

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
