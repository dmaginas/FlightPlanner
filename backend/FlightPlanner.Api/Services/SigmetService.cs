using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches SIGMETs and AIRMETs from two AviationWeather.gov endpoints in parallel:
///   - airsigmet (US domestic SIGMETs + AIRMETs)
///   - isigmet   (international ICAO SIGMETs worldwide)
/// Results from both are merged and cached for 5 minutes. No API key required.
/// For flight simulation use only.
/// </summary>
public sealed class SigmetService : ISigmetService
{
    private const string DomUrl  = "https://aviationweather.gov/api/data/airsigmet?format=json&type=all";
    private const string IntlUrl = "https://aviationweather.gov/api/data/isigmet?format=json";
    private const string DomCacheKey  = "sigmets_domestic";
    private const string IntlCacheKey = "sigmets_intl";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
    private const double BufferDeg = 5;

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient             _http;
    private readonly IMemoryCache           _cache;
    private readonly ILogger<SigmetService> _logger;

    public SigmetService(HttpClient http, IMemoryCache cache, ILogger<SigmetService> logger)
    {
        _http = http; _cache = cache; _logger = logger;
    }

    public async Task<SigmetResponse> FetchAllSigmetsAsync(CancellationToken ct = default)
    {
        var (dom, intl) = await FetchBothAsync(ct);
        var items = dom .Where(r => r.Coords is { Count: > 0 }).Select(MapDom)
            .Concat(intl.Where(r => r.Coords is { Count: > 0 }).Select(MapIntl))
            .OrderBy(i => i.Type).ThenBy(i => i.Hazard).ToList();
        return new SigmetResponse { Items = items, FetchedAt = DateTime.UtcNow.ToString("O") };
    }

    public async Task<SigmetResponse> FetchSigmetsAsync(
        double minLat, double minLon,
        double maxLat, double maxLon,
        CancellationToken ct = default)
    {
        var (dom, intl) = await FetchBothAsync(ct);

        var bMinLat = minLat - BufferDeg;
        var bMinLon = minLon - BufferDeg;
        var bMaxLat = maxLat + BufferDeg;
        var bMaxLon = maxLon + BufferDeg;

        var items = dom .Where(r => InBbox(r.Coords, bMinLat, bMinLon, bMaxLat, bMaxLon)).Select(MapDom)
            .Concat(intl.Where(r => InBbox(r.Coords, bMinLat, bMinLon, bMaxLat, bMaxLon)).Select(MapIntl))
            .OrderBy(i => i.Type).ThenBy(i => i.Hazard).ToList();
        return new SigmetResponse { Items = items, FetchedAt = DateTime.UtcNow.ToString("O") };
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private async Task<(List<RawDom> dom, List<RawIntl> intl)> FetchBothAsync(CancellationToken ct)
    {
        var domTask  = GetCachedAsync<RawDom> (DomCacheKey,  DomUrl,  ct);
        var intlTask = GetCachedAsync<RawIntl>(IntlCacheKey, IntlUrl, ct);
        await Task.WhenAll(domTask, intlTask);
        return (domTask.Result, intlTask.Result);
    }

    private async Task<List<T>> GetCachedAsync<T>(string cacheKey, string url, CancellationToken ct)
    {
        if (_cache.TryGetValue(cacheKey, out List<T>? cached) && cached is not null)
            return cached;

        List<T> result;
        try
        {
            var resp = await _http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("AviationWeather {Url} returned {Status}", url, (int)resp.StatusCode);
                return [];
            }
            var json = await resp.Content.ReadAsStringAsync(ct);
            result = JsonSerializer.Deserialize<List<T>>(json, JsonOpts) ?? [];
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SIGMET fetch failed for {Url}", url);
            return [];
        }

        _cache.Set(cacheKey, result, CacheTtl);
        _logger.LogInformation("Fetched {Count} items from {Url}", result.Count, url);
        return result;
    }

    private static bool InBbox(List<AreaPt>? coords, double minLat, double minLon, double maxLat, double maxLon)
    {
        if (coords is null or { Count: 0 }) return false;
        return coords.Any(p =>
            p.Lat >= minLat && p.Lat <= maxLat &&
            p.Lon >= minLon && p.Lon <= maxLon);
    }

    private static SigmetItem MapDom(RawDom r) => new()
    {
        Id        = r.SeriesId ?? r.IcaoId ?? "",
        Type      = r.AirSigmetType ?? "SIGMET",
        Hazard    = r.Hazard   ?? "",
        Severity  = r.Severity?.ToString(),
        AltLowFt  = r.AltLow,
        AltHighFt = r.AltHigh,
        ValidTo   = ToIso(r.ValidTimeTo),
        RawText   = r.RawSigmet ?? "",
        Coords    = ToCoords(r.Coords),
    };

    private static SigmetItem MapIntl(RawIntl r) => new()
    {
        Id        = string.IsNullOrEmpty(r.FirId) ? (r.IcaoId ?? "") : $"{r.FirId} {r.SeriesId}",
        Type      = "SIGMET",
        Hazard    = r.Hazard   ?? "",
        Severity  = null,
        AltLowFt  = r.Base,
        AltHighFt = r.Top,
        ValidTo   = ToIso(r.ValidTimeTo),
        RawText   = r.RawSigmet ?? "",
        Coords    = ToCoords(r.Coords),
    };

    private static string? ToIso(long? unixSeconds) =>
        unixSeconds.HasValue
            ? DateTimeOffset.FromUnixTimeSeconds(unixSeconds.Value).ToString("O")
            : null;

    private static List<double[]>? ToCoords(List<AreaPt>? pts) =>
        pts is { Count: > 0 }
            ? pts.Select(p => new double[] { p.Lat, p.Lon }).ToList()
            : null;

    // ── AviationWeather JSON shapes ────────────────────────────────────────────

    private sealed class RawDom
    {
        [JsonPropertyName("icaoId")]        public string?       IcaoId        { get; set; }
        [JsonPropertyName("seriesId")]      public string?       SeriesId      { get; set; }
        [JsonPropertyName("airSigmetType")] public string?       AirSigmetType { get; set; }
        [JsonPropertyName("hazard")]        public string?       Hazard        { get; set; }
        [JsonPropertyName("severity")]      public int?          Severity      { get; set; }
        [JsonPropertyName("altitudeLow1")]  public int?          AltLow        { get; set; }
        [JsonPropertyName("altitudeHi1")]   public int?          AltHigh       { get; set; }
        [JsonPropertyName("validTimeTo")]   public long?         ValidTimeTo   { get; set; }
        [JsonPropertyName("rawAirSigmet")]  public string?       RawSigmet     { get; set; }
        [JsonPropertyName("coords")]        public List<AreaPt>? Coords        { get; set; }
    }

    private sealed class RawIntl
    {
        [JsonPropertyName("icaoId")]      public string?       IcaoId      { get; set; }
        [JsonPropertyName("firId")]       public string?       FirId       { get; set; }
        [JsonPropertyName("seriesId")]    public string?       SeriesId    { get; set; }
        [JsonPropertyName("hazard")]      public string?       Hazard      { get; set; }
        [JsonPropertyName("base")]        public int?          Base        { get; set; }
        [JsonPropertyName("top")]         public int?          Top         { get; set; }
        [JsonPropertyName("validTimeTo")] public long?         ValidTimeTo { get; set; }
        [JsonPropertyName("rawSigmet")]   public string?       RawSigmet   { get; set; }
        // isigmet coords can be flat [{lat,lon}] OR nested [[{lat,lon}]] with occasional null values
        [JsonPropertyName("coords")]
        [JsonConverter(typeof(FlexibleCoordsConverter))]
        public List<AreaPt>? Coords { get; set; }
    }

    private sealed class AreaPt
    {
        [JsonPropertyName("lat")] public double Lat { get; set; }
        [JsonPropertyName("lon")] public double Lon { get; set; }
    }

    // Handles coords that are flat [{lat,lon}], nested [[{lat,lon},...]], or contain null lat/lon.
    private sealed class FlexibleCoordsConverter : JsonConverter<List<AreaPt>?>
    {
        public override List<AreaPt>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using var doc = JsonDocument.ParseValue(ref reader);
            var root = doc.RootElement;
            if (root.ValueKind is not JsonValueKind.Array) return null;

            var result = new List<AreaPt>();
            foreach (var el in root.EnumerateArray())
            {
                if (el.ValueKind == JsonValueKind.Object)
                    TryAdd(el, result);
                else if (el.ValueKind == JsonValueKind.Array)
                    foreach (var inner in el.EnumerateArray())
                        if (inner.ValueKind == JsonValueKind.Object)
                            TryAdd(inner, result);
            }
            return result.Count > 0 ? result : null;
        }

        private static void TryAdd(JsonElement el, List<AreaPt> list)
        {
            if (!el.TryGetProperty("lat", out var latEl) || !el.TryGetProperty("lon", out var lonEl)) return;
            if (latEl.ValueKind == JsonValueKind.Null || lonEl.ValueKind == JsonValueKind.Null) return;
            if (!latEl.TryGetDouble(out var lat) || !lonEl.TryGetDouble(out var lon)) return;
            list.Add(new AreaPt { Lat = lat, Lon = lon });
        }

        public override void Write(Utf8JsonWriter writer, List<AreaPt>? value, JsonSerializerOptions options)
            => JsonSerializer.Serialize(writer, value, options);
    }
}
