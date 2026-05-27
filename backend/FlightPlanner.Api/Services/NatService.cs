using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Options;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches North Atlantic Track (NAT) data from the Flight Plan Database public NATS
/// endpoint (https://api.flightplandatabase.com/nav/NATS).
///
/// Tracks are published twice daily (eastbound ~01:00-08:00 UTC,
/// westbound ~11:30-19:00 UTC). Outside these windows the endpoint returns an
/// empty array, which is normal — no NAT tracks are applied to the route.
///
/// Results are cached server-side for 15 minutes.
/// No API key required; the FPD key is sent when configured to maximise quota.
///
/// For flight simulation use only.
/// </summary>
public sealed class NatService : INatService
{
    private const string CacheKey = "nat_tracks_fpd";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _http;
    private readonly FlightPlanDatabaseOptions _fpdOptions;
    private readonly IMemoryCache _cache;
    private readonly ILogger<NatService> _logger;

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

        var url = $"{_fpdOptions.BaseUrl}/nav/NATS";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        // Send API key if available — improves rate limits (endpoint is public without key)
        if (!string.IsNullOrWhiteSpace(_fpdOptions.ApiKey))
        {
            var credential = Convert.ToBase64String(
                Encoding.UTF8.GetBytes($"{_fpdOptions.ApiKey}:"));
            request.Headers.Authorization =
                new AuthenticationHeaderValue("Basic", credential);
        }

        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        var raw  = JsonSerializer.Deserialize<List<FpdNatTrack>>(json, JsonOptions) ?? [];

        var tracks = raw
            .Where(t => !string.IsNullOrWhiteSpace(t.Ident) && t.Route?.Nodes?.Count > 1)
            .Select(Map)
            .ToList();

        var result = new NatResponse
        {
            Tracks    = tracks,
            FetchedAt = DateTime.UtcNow.ToString("O"),
        };

        _cache.Set(CacheKey, result, CacheTtl);
        _logger.LogInformation(
            "Fetched {Count} NAT tracks from FPD NATS endpoint", tracks.Count);
        return result;
    }

    private static NatTrack Map(FpdNatTrack src)
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

    // ── FPD /nav/NATS JSON shapes ──────────────────────────────────────────────

    private sealed class FpdNatTrack
    {
        [JsonPropertyName("ident")]     public string?       Ident     { get; set; }
        [JsonPropertyName("route")]     public FpdNatRoute?  Route     { get; set; }
        [JsonPropertyName("validFrom")] public string?       ValidFrom { get; set; }
        [JsonPropertyName("validTo")]   public string?       ValidTo   { get; set; }
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
