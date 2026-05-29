using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Options;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches North Atlantic Track (NAT) data.
///
/// Sources tried in order:
///   1. Gander Oceanic public API  (tracks.ganderoceanic.ca/data)
///   2. Flight Plan Database NATS  (api.flightplandatabase.com/nav/NATS)
///
/// Results are cached 15 minutes when tracks are found, 2 minutes when
/// both sources return nothing (so the next request retries sooner).
///
/// For flight simulation use only.
/// </summary>
public sealed class NatService : INatService
{
    private const string CacheKey = "nat_tracks";
    private static readonly TimeSpan CacheTtlData  = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CacheTtlEmpty = TimeSpan.FromMinutes(2);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient                _http;
    private readonly FlightPlanDatabaseOptions _fpdOptions;
    private readonly IMemoryCache              _cache;
    private readonly ILogger<NatService>       _logger;

    public NatService(
        HttpClient http,
        FlightPlanDatabaseOptions fpdOptions,
        IMemoryCache cache,
        ILogger<NatService> logger)
    {
        _http       = http;
        _fpdOptions = fpdOptions;
        _cache      = cache;
        _logger     = logger;
    }

    public async Task<NatResponse> FetchTracksAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out NatResponse? cached) && cached is not null)
            return cached;

        var tracks = await FetchFromGanderAsync(ct)
                  ?? await FetchFromFpdAsync(ct)
                  ?? [];

        var result = new NatResponse
        {
            Tracks    = tracks,
            FetchedAt = DateTime.UtcNow.ToString("O"),
        };

        _cache.Set(CacheKey, result, tracks.Count > 0 ? CacheTtlData : CacheTtlEmpty);
        _logger.LogInformation("NAT tracks loaded: {Count}", tracks.Count);
        return result;
    }

    // ── Gander Oceanic source ─────────────────────────────────────────────────

    private async Task<List<NatTrack>?> FetchFromGanderAsync(CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync("https://tracks.ganderoceanic.ca/data", ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Gander Oceanic NAT returned {Status}", (int)response.StatusCode);
                return null;
            }

            var json   = await response.Content.ReadAsStringAsync(ct);
            var raw    = JsonSerializer.Deserialize<List<GanderNatTrack>>(json, JsonOptions);
            if (raw is null || raw.Count == 0) return null;

            var tracks = raw
                .Where(t => !string.IsNullOrWhiteSpace(t.Id) && t.Route?.Count > 1)
                .Select(MapGander)
                .ToList();

            _logger.LogInformation("Fetched {Count} NAT tracks from Gander Oceanic", tracks.Count);
            return tracks.Count > 0 ? tracks : null;
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning("Gander Oceanic NAT fetch failed: {Message}", ex.Message);
            return null;
        }
    }

    private static NatTrack MapGander(GanderNatTrack src) => new()
    {
        Id           = src.Id!,
        Tmi          = src.Tmi,
        Route        = (src.Route ?? []).Select(n => new NatPoint
        {
            Name      = n.Name,
            Latitude  = n.Latitude,
            Longitude = n.Longitude,
        }).ToList(),
        // Gander flight levels are in feet (34000 = FL340); convert to FL number strings.
        FlightLevels = (src.FlightLevels ?? [])
            .Select(fl => (fl / 100).ToString())
            .ToList(),
        Direction    = src.Direction switch
        {
            1 => NatDirection.Westbound,
            2 => NatDirection.Eastbound,
            _ => NatDirection.Unknown,
        },
    };

    // ── Flight Plan Database source (fallback) ────────────────────────────────

    private async Task<List<NatTrack>?> FetchFromFpdAsync(CancellationToken ct)
    {
        try
        {
            var url = $"{_fpdOptions.BaseUrl}/nav/NATS";
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            if (!string.IsNullOrWhiteSpace(_fpdOptions.ApiKey))
            {
                var credential = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{_fpdOptions.ApiKey}:"));
                request.Headers.Authorization =
                    new AuthenticationHeaderValue("Basic", credential);
            }

            var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("FPD NATS returned {Status}", (int)response.StatusCode);
                return null;
            }

            var json   = await response.Content.ReadAsStringAsync(ct);
            var raw    = JsonSerializer.Deserialize<List<FpdNatTrack>>(json, JsonOptions) ?? [];

            var tracks = raw
                .Where(t => !string.IsNullOrWhiteSpace(t.Ident) && t.Route?.Nodes?.Count > 1)
                .Select(MapFpd)
                .ToList();

            _logger.LogInformation("Fetched {Count} NAT tracks from FPD", tracks.Count);
            return tracks.Count > 0 ? tracks : null;
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning("FPD NAT fetch failed: {Message}", ex.Message);
            return null;
        }
    }

    private static NatTrack MapFpd(FpdNatTrack src)
    {
        var east = src.Route?.EastLevels is { Count: > 0 };
        var flightLevels = east
            ? (src.Route!.EastLevels ?? []).Select(fl => fl.ToString()).ToList()
            : (src.Route?.WestLevels ?? []).Select(fl => fl.ToString()).ToList();

        return new NatTrack
        {
            Id           = src.Ident!,
            Tmi          = null,
            Route        = (src.Route?.Nodes ?? []).Select(n => new NatPoint
            {
                Latitude  = n.Lat,
                Longitude = n.Lon,
                Name      = n.Ident,
            }).ToList(),
            FlightLevels = flightLevels,
            Direction    = east ? NatDirection.Eastbound : NatDirection.Westbound,
        };
    }

    // ── Gander Oceanic /data JSON shapes ──────────────────────────────────────

    private sealed class GanderNatTrack
    {
        [JsonPropertyName("id")]           public string?              Id           { get; set; }
        [JsonPropertyName("tmi")]          public string?              Tmi          { get; set; }
        [JsonPropertyName("route")]        public List<GanderNatPoint>? Route       { get; set; }
        [JsonPropertyName("flightLevels")] public List<int>?           FlightLevels { get; set; }
        [JsonPropertyName("direction")]    public int                  Direction    { get; set; }
    }

    private sealed class GanderNatPoint
    {
        [JsonPropertyName("name")]      public string? Name      { get; set; }
        [JsonPropertyName("latitude")]  public double  Latitude  { get; set; }
        [JsonPropertyName("longitude")] public double  Longitude { get; set; }
    }

    // ── FPD /nav/NATS JSON shapes ─────────────────────────────────────────────

    private sealed class FpdNatTrack
    {
        [JsonPropertyName("ident")]     public string?      Ident     { get; set; }
        [JsonPropertyName("route")]     public FpdNatRoute? Route     { get; set; }
        [JsonPropertyName("validFrom")] public string?      ValidFrom { get; set; }
        [JsonPropertyName("validTo")]   public string?      ValidTo   { get; set; }
    }

    private sealed class FpdNatRoute
    {
        [JsonPropertyName("nodes")]      public List<FpdNatNode>? Nodes      { get; set; }
        [JsonPropertyName("eastLevels")] public List<int>?        EastLevels { get; set; }
        [JsonPropertyName("westLevels")] public List<int>?        WestLevels { get; set; }
    }

    private sealed class FpdNatNode
    {
        [JsonPropertyName("ident")] public string? Ident { get; set; }
        [JsonPropertyName("lat")]   public double  Lat   { get; set; }
        [JsonPropertyName("lon")]   public double  Lon   { get; set; }
        [JsonPropertyName("type")]  public string? Type  { get; set; }
    }
}
