using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches active SIGMETs and AIRMETs from the AviationWeather.gov public API
/// (https://aviationweather.gov/api/data/airsigmet) and filters by bounding box.
///
/// Results are cached for 5 minutes. No API key required.
/// For flight simulation use only.
/// </summary>
public sealed class SigmetService : ISigmetService
{
    private const string AirSigmetUrl   = "https://aviationweather.gov/api/data/airsigmet?format=json&type=all";
    private const string AllCacheKey    = "sigmets_all";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
    private const double BufferDeg = 5;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient           _http;
    private readonly IMemoryCache         _cache;
    private readonly ILogger<SigmetService> _logger;

    public SigmetService(HttpClient http, IMemoryCache cache, ILogger<SigmetService> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<SigmetResponse> FetchSigmetsAsync(
        double minLat, double minLon,
        double maxLat, double maxLon,
        CancellationToken ct = default)
    {
        var all = await GetAllCachedAsync(ct);

        var bMinLat = minLat - BufferDeg;
        var bMinLon = minLon - BufferDeg;
        var bMaxLat = maxLat + BufferDeg;
        var bMaxLon = maxLon + BufferDeg;

        var items = all
            .Where(r => InBbox(r, bMinLat, bMinLon, bMaxLat, bMaxLon))
            .Select(Map)
            .OrderBy(i => i.Type)
            .ThenBy(i => i.Hazard)
            .ToList();

        return new SigmetResponse { Items = items, FetchedAt = DateTime.UtcNow.ToString("O") };
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async Task<List<RawItem>> GetAllCachedAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(AllCacheKey, out List<RawItem>? cached) && cached is not null)
            return cached;

        List<RawItem> result;
        try
        {
            var resp = await _http.GetAsync(AirSigmetUrl, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("AviationWeather airsigmet returned {Status}", (int)resp.StatusCode);
                return [];
            }
            var json = await resp.Content.ReadAsStringAsync(ct);
            result = JsonSerializer.Deserialize<List<RawItem>>(json, JsonOpts) ?? [];
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SigMet fetch failed");
            return [];
        }

        _cache.Set(AllCacheKey, result, CacheTtl);
        _logger.LogInformation("Fetched {Count} SigMets/AIRMETs from AviationWeather", result.Count);
        return result;
    }

    private static bool InBbox(RawItem r, double minLat, double minLon, double maxLat, double maxLon)
    {
        if (r.Area is null or { Count: 0 }) return false;
        return r.Area.Any(p =>
            p.Lat >= minLat && p.Lat <= maxLat &&
            p.Lon >= minLon && p.Lon <= maxLon);
    }

    private static SigmetItem Map(RawItem r) => new()
    {
        Id        = r.ISigmet?.ToString() ?? r.IcaoId ?? "",
        Type      = r.AirSigmetType ?? "SIGMET",
        Hazard    = r.Hazard        ?? "",
        Severity  = r.Severity,
        AltLowFt  = r.AltLow,
        AltHighFt = r.AltHigh,
        ValidTo   = r.ValidTimeTo,
        RawText   = r.RawSigmet     ?? "",
    };

    // ── AviationWeather JSON shapes ────────────────────────────────────────────

    private sealed class RawItem
    {
        [JsonPropertyName("isigmet")]       public int?         ISigmet       { get; set; }
        [JsonPropertyName("icaoId")]        public string?      IcaoId        { get; set; }
        [JsonPropertyName("airSigmetType")] public string?      AirSigmetType { get; set; }
        [JsonPropertyName("hazard")]        public string?      Hazard        { get; set; }
        [JsonPropertyName("severity")]      public string?      Severity      { get; set; }
        [JsonPropertyName("altLow")]        public int?         AltLow        { get; set; }
        [JsonPropertyName("altHigh")]       public int?         AltHigh       { get; set; }
        [JsonPropertyName("validTimeTo")]   public string?      ValidTimeTo   { get; set; }
        [JsonPropertyName("rawSigmet")]     public string?      RawSigmet     { get; set; }
        [JsonPropertyName("area")]          public List<AreaPt>? Area         { get; set; }
    }

    private sealed class AreaPt
    {
        [JsonPropertyName("lat")] public double Lat { get; set; }
        [JsonPropertyName("lon")] public double Lon { get; set; }
    }
}
