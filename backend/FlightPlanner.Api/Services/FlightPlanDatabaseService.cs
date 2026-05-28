using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FlightPlanner.Api.Options;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Calls the Flight Plan Database API (https://flightplandatabase.com) to search
/// for IFR routes between two airports. Results are cached in-memory for the
/// configured TTL (default: 30 minutes) to conserve API quota.
///
/// API documentation: https://flightplandatabase.com/dev/api
///
/// Strategy:
///   1. GET /search/plans?fromICAO=X&amp;toICAO=Y&amp;limit=5&amp;sort=popularity
///      → returns up to 5 plan summaries (no full waypoints)
///   2. GET /plan/{id} for the top result → returns full waypoints (route.nodes)
///   3. Remaining search results become alternatives (metadata only)
///
/// Aircraft type and cruising altitude are NOT query parameters supported by the
/// FPD API. They are accepted by our internal endpoint for client-side enrichment
/// and future extensibility, but are not forwarded to FPD.
/// </summary>
public sealed class FlightPlanDatabaseService : IFlightPlanDatabaseService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly FlightPlanDatabaseOptions _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<FlightPlanDatabaseService> _logger;

    public FlightPlanDatabaseService(
        HttpClient httpClient,
        FlightPlanDatabaseOptions options,
        IMemoryCache cache,
        ILogger<FlightPlanDatabaseService> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<FpdRouteResult> SearchRoutesAsync(
        string departure,
        string destination,
        CancellationToken cancellationToken = default)
    {
        // ── Config validation ────────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new FlightPlanDatabaseException(
                FpdErrorKind.ConfigurationMissing,
                "FlightPlanDatabase:ApiKey is not configured on this server. " +
                "Run: dotnet user-secrets set \"FlightPlanDatabase:ApiKey\" \"YOUR_KEY\"");
        }

        // ── Cache lookup ─────────────────────────────────────────────────────
        var cacheKey = $"fpd:{departure.ToUpperInvariant()}:{destination.ToUpperInvariant()}:IFR";
        if (_cache.TryGetValue(cacheKey, out FpdRouteResult? cached) && cached is not null)
        {
            _logger.LogInformation("FPD cache hit for {Dep}-{Arr}", departure, destination);
            return cached;
        }

        // ── Step 1: Search for plans ──────────────────────────────────────────
        var searchUrl = $"{_options.BaseUrl}/search/plans" +
                        $"?fromICAO={Uri.EscapeDataString(departure)}" +
                        $"&toICAO={Uri.EscapeDataString(destination)}" +
                        $"&limit=5&sort=popularity";

        _logger.LogInformation("FPD search: {Dep} → {Arr}", departure, destination);
        var summaries = await CallApiAsync<List<FpdApiPlan>>(searchUrl, cancellationToken);

        if (summaries is null || summaries.Count == 0)
        {
            throw new FlightPlanDatabaseException(
                FpdErrorKind.NoResults,
                $"No IFR flight plans found between {departure} and {destination}.");
        }

        // ── Step 2: Fetch full waypoints for the top plan ─────────────────────
        var topSummary = summaries[0];
        var planUrl = $"{_options.BaseUrl}/plan/{topSummary.Id}";

        _logger.LogInformation("FPD fetching full plan {Id}", topSummary.Id);
        var fullPlan = await CallApiAsync<FpdApiPlan>(planUrl, cancellationToken);

        if (fullPlan?.Route?.Nodes is null || fullPlan.Route.Nodes.Count == 0)
        {
            throw new FlightPlanDatabaseException(
                FpdErrorKind.NoResults,
                $"Flight plan {topSummary.Id} returned no waypoints.");
        }

        // ── Step 3: Map to internal model ─────────────────────────────────────
        var selected = new FpdPlan
        {
            Id          = fullPlan.Id,
            FromIcao    = fullPlan.FromIcao ?? departure,
            ToIcao      = fullPlan.ToIcao   ?? destination,
            DistanceNm  = fullPlan.Distance,
            MaxAltitude = fullPlan.MaxAltitude,
            Notes       = fullPlan.Notes,
            UpdatedAt   = fullPlan.UpdatedAt,
            Popularity  = fullPlan.Popularity,
            Nodes       = fullPlan.Route.Nodes
                .Select(n => new FpdNode
                {
                    Type  = n.Type  ?? string.Empty,
                    Ident = n.Ident ?? string.Empty,
                    Name  = n.Name,
                    Lat   = n.Lat,
                    Lon   = n.Lon,
                })
                .ToList(),
        };

        var alternatives = summaries
            .Skip(1)
            .Select(s => new FpdPlanSummary
            {
                Id         = s.Id,
                DistanceNm = s.Distance,
                Notes      = s.Notes,
                UpdatedAt  = s.UpdatedAt,
                Popularity = s.Popularity,
            })
            .ToList();

        var result = new FpdRouteResult { Selected = selected, Alternatives = alternatives };

        // ── Cache the result ──────────────────────────────────────────────────
        var ttl = TimeSpan.FromMinutes(Math.Max(1, _options.CacheTtlMinutes));
        _cache.Set(cacheKey, result, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });

        _logger.LogInformation(
            "FPD found {Count} plan(s) for {Dep}-{Arr}, top plan id={Id}",
            summaries.Count, departure, destination, selected.Id);

        return result;
    }

    /// <inheritdoc />
    public async Task<FpdPlan> FetchPlanByIdAsync(int planId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new FlightPlanDatabaseException(
                FpdErrorKind.ConfigurationMissing,
                "FlightPlanDatabase:ApiKey is not configured on this server.");
        }

        var planUrl  = $"{_options.BaseUrl}/plan/{planId}";
        var fullPlan = await CallApiAsync<FpdApiPlan>(planUrl, cancellationToken);

        if (fullPlan?.Route?.Nodes is null || fullPlan.Route.Nodes.Count == 0)
        {
            throw new FlightPlanDatabaseException(
                FpdErrorKind.NoResults,
                $"Flight plan {planId} returned no waypoints.");
        }

        return new FpdPlan
        {
            Id          = fullPlan.Id,
            FromIcao    = fullPlan.FromIcao ?? string.Empty,
            ToIcao      = fullPlan.ToIcao   ?? string.Empty,
            DistanceNm  = fullPlan.Distance,
            MaxAltitude = fullPlan.MaxAltitude,
            Notes       = fullPlan.Notes,
            UpdatedAt   = fullPlan.UpdatedAt,
            Popularity  = fullPlan.Popularity,
            Nodes       = fullPlan.Route.Nodes
                .Select(n => new FpdNode
                {
                    Type  = n.Type  ?? string.Empty,
                    Ident = n.Ident ?? string.Empty,
                    Name  = n.Name,
                    Lat   = n.Lat,
                    Lon   = n.Lon,
                })
                .ToList(),
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<T?> CallApiAsync<T>(string url, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);

        // HTTP Basic Auth: API key as username, empty password
        var credential = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ApiKey}:"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credential);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

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
            _logger.LogError(ex, "FPD network error for {Url}", url);
            throw new FlightPlanDatabaseException(
                FpdErrorKind.Network,
                "Unable to reach Flight Plan Database (network error). Please try again later.");
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("FPD HTTP {Status} for {Url}", (int)response.StatusCode, url);
            throw new FlightPlanDatabaseException(
                FpdErrorKind.Http,
                $"Flight Plan Database returned HTTP {(int)response.StatusCode}.",
                (int)response.StatusCode);
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<T>(body, JsonOptions);
    }

    // ── FPD API deserialization models (internal only) ─────────────────────────

    private sealed class FpdApiPlan
    {
        [JsonPropertyName("id")]          public int Id { get; set; }
        [JsonPropertyName("fromICAO")]    public string? FromIcao { get; set; }
        [JsonPropertyName("toICAO")]      public string? ToIcao { get; set; }
        [JsonPropertyName("distance")]    public double Distance { get; set; }
        [JsonPropertyName("maxAltitude")] public int MaxAltitude { get; set; }
        [JsonPropertyName("notes")]       public string? Notes { get; set; }
        [JsonPropertyName("updatedAt")]   public string? UpdatedAt { get; set; }
        [JsonPropertyName("popularity")]  public double Popularity { get; set; }
        [JsonPropertyName("route")]       public FpdApiRoute? Route { get; set; }
    }

    private sealed class FpdApiRoute
    {
        [JsonPropertyName("nodes")] public List<FpdApiNode>? Nodes { get; set; }
    }

    private sealed class FpdApiNode
    {
        [JsonPropertyName("type")]  public string? Type { get; set; }
        [JsonPropertyName("ident")] public string? Ident { get; set; }
        [JsonPropertyName("name")]  public string? Name { get; set; }
        [JsonPropertyName("lat")]   public double Lat { get; set; }
        [JsonPropertyName("lon")]   public double Lon { get; set; }
    }
}
