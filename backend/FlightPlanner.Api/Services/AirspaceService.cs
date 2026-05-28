using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches worldwide FIR/UIR boundary GeoJSON from the VATSIM vatspy-data-project
/// (https://github.com/vatsimnetwork/vatspy-data-project) and caches it for 24 hours.
/// No API key required. Boundaries change infrequently (AIRAC cycle ~28 days).
/// </summary>
public sealed class AirspaceService : IAirspaceService
{
    private const string SourceUrl =
        "https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/Boundaries.geojson";
    private const string CacheKey = "airspace_boundaries";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient            _http;
    private readonly IMemoryCache          _cache;
    private readonly ILogger<AirspaceService> _logger;

    public AirspaceService(HttpClient http, IMemoryCache cache, ILogger<AirspaceService> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<string> GetBoundariesGeoJsonAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out string? cached) && cached is not null)
            return cached;

        string json;
        try
        {
            var resp = await _http.GetAsync(SourceUrl, ct);
            resp.EnsureSuccessStatusCode();
            json = await resp.Content.ReadAsStringAsync(ct);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch FIR/UIR boundaries from {Url}", SourceUrl);
            throw;
        }

        _cache.Set(CacheKey, json, CacheTtl);
        _logger.LogInformation("Cached FIR/UIR boundaries ({Bytes:N0} bytes, 24 h TTL)", json.Length);
        return json;
    }
}
