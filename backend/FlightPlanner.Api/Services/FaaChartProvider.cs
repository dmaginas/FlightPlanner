using System.Xml.Linq;
using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Chart provider for FAA d-TPP (US airports, no auth, cached per AIRAC cycle).
/// </summary>
public sealed class FaaChartProvider : IChartProvider
{
    private const string FaaCacheKey = "faa_dtpp_v2";
    private static readonly TimeSpan FaaCacheTtl = TimeSpan.FromHours(24);

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

    private readonly HttpClient             _http;
    private readonly IMemoryCache           _cache;
    private readonly ILogger<FaaChartProvider> _logger;

    public string SourceName => "faa";

    public FaaChartProvider(
        HttpClient http,
        IMemoryCache cache,
        ILogger<FaaChartProvider> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct)
    {
        try
        {
            var data = await LoadFaaMetadataAsync(ct);
            if (!data.Charts.TryGetValue(icao, out var records)) return [];
            return records
                .Select(r => new ChartDto(r.PdfName, r.ChartName, MapFaaCode(r.ChartCode), "faa"))
                .ToList();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "FAA chart metadata unavailable for {Icao}", icao);
            return [];
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "FAA chart lookup failed for {Icao}", icao);
            return [];
        }
    }

    public async Task<ChartFile> GetFileAsync(string id, CancellationToken ct)
    {
        // Use cached cycle if available, otherwise fall back to AIRAC table
        var cycle = _cache.TryGetValue(FaaCacheKey, out FaaCacheData? d) && d is not null
            ? d.Cycle
            : GetCurrentAiracCycle();
        var url    = $"https://aeronav.faa.gov/d-tpp/{cycle}/{Uri.EscapeDataString(id)}";
        var stream = await _http.GetStreamAsync(url, ct);
        return new ProxiedChartFile(stream, "application/pdf");
    }

    private async Task<FaaCacheData> LoadFaaMetadataAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(FaaCacheKey, out FaaCacheData? cached) && cached is not null)
            return cached;

        // Use the "current" alias — always points to the active AIRAC cycle, no cycle calc needed.
        // Fallback: aeronav.faa.gov/d-tpp/{cycle}/xml_data/d-TPP_Metafile.xml
        const string primaryUrl = "https://nfdc.faa.gov/webContent/dtpp/current.xml";
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

    private static string MapFaaCode(string code) => code switch
    {
        "APD" or "HOT" => "APT",
        "MIN"          => "APT",
        "DP"           => "DEP",
        "STAR"         => "ARR",
        "IAP"          => "APP",
        _              => "OTHER",
    };

    private sealed record FaaCacheData(string Cycle, Dictionary<string, List<FaaRecord>> Charts);
    private sealed record FaaRecord(string ChartCode, string ChartName, string PdfName);
}
