using System.Globalization;
using System.Text.Json;
using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches pressure-level weather data from the Open Meteo free API
/// (https://api.open-meteo.com) for GRAMET cross-section visualisation.
///
/// No API key required. Requests are throttled to 5 concurrent connections
/// to avoid HTTP 429 on the free tier. On any per-waypoint failure the
/// service returns zero-filled fallback data so the chart is always renderable.
/// </summary>
public sealed class GrametService : IGrametService
{
    private const string OpenMeteoUrl = "https://api.open-meteo.com/v1/forecast";

    // Limit concurrent Open Meteo requests to stay within free-tier rate limits.
    private static readonly SemaphoreSlim _throttle = new(5, 5);

    private static readonly int[] Pressures = [850, 700, 500, 300, 250, 200];

    private static readonly IReadOnlyDictionary<int, int> PressureToFt =
        new Dictionary<int, int>
        {
            [850] =  5_000,
            [700] = 10_000,
            [500] = 18_000,
            [300] = 30_000,
            [250] = 34_000,
            [200] = 39_000,
        };

    private readonly HttpClient _http;
    private readonly ILogger<GrametService> _logger;

    public GrametService(HttpClient http, ILogger<GrametService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<GrametResponse> FetchGrametAsync(
        IReadOnlyList<GrametWaypointInput> waypoints,
        CancellationToken ct = default)
    {
        var tasks = waypoints.Select(wp => FetchWaypointAsync(wp, ct));
        var results = await Task.WhenAll(tasks);

        return new GrametResponse
        {
            Waypoints    = results,
            GeneratedAt  = DateTime.UtcNow.ToString("O"),
        };
    }

    private async Task<GrametWaypointData> FetchWaypointAsync(
        GrametWaypointInput wp,
        CancellationToken ct)
    {
        await _throttle.WaitAsync(ct);
        try
        {
            return await FetchWaypointCoreAsync(wp, ct);
        }
        finally
        {
            _throttle.Release();
        }
    }

    private async Task<GrametWaypointData> FetchWaypointCoreAsync(
        GrametWaypointInput wp,
        CancellationToken ct)
    {
        var hourlyVars = Pressures.SelectMany(p => new[]
        {
            $"temperature_{p}hPa",
            $"wind_speed_{p}hPa",
            $"wind_direction_{p}hPa",
            $"cloud_cover_{p}hPa",
        });

        // Use InvariantCulture so decimal separator is always '.' regardless of server locale.
        var lat = wp.Lat.ToString("F4", CultureInfo.InvariantCulture);
        var lon = wp.Lon.ToString("F4", CultureInfo.InvariantCulture);
        var url = $"{OpenMeteoUrl}"
            + $"?latitude={lat}&longitude={lon}"
            + $"&hourly={string.Join(",", hourlyVars)}"
            + "&wind_speed_unit=kn&timezone=UTC&forecast_days=1";

        try
        {
            var response = await _http.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Open Meteo returned {Status} for waypoint {Id}",
                    (int)response.StatusCode, wp.Id);
                return Fallback(wp);
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            return Parse(wp, json);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Open Meteo fetch failed for waypoint {Id}", wp.Id);
            return Fallback(wp);
        }
    }

    private static GrametWaypointData Parse(GrametWaypointInput wp, string json)
    {
        using var doc  = JsonDocument.Parse(json);
        var hourly     = doc.RootElement.GetProperty("hourly");
        var hourIndex  = DateTime.UtcNow.Hour;

        var levels = Pressures.Select(p => new GrametLevelData
        {
            PressureHPa   = p,
            FlightLevelFt = PressureToFt[p],
            TempC         = Read(hourly, $"temperature_{p}hPa",    hourIndex) is { } t   ? Math.Round(t, 1)          : null,
            WindSpeedKt   = Read(hourly, $"wind_speed_{p}hPa",     hourIndex) is { } ws  ? Math.Round(ws, 0)         : null,
            WindDirDeg    = Read(hourly, $"wind_direction_{p}hPa", hourIndex) is { } wd  ? (int)Math.Round(wd)       : null,
            CloudCoverPct = Read(hourly, $"cloud_cover_{p}hPa",    hourIndex) is { } cc  ? (int)Math.Round(cc)       : 0,
        }).ToList();

        return new GrametWaypointData
        {
            Id         = wp.Id,
            Lat        = wp.Lat,
            Lon        = wp.Lon,
            DistanceNm = wp.DistanceNm,
            Levels     = levels,
        };
    }

    // Returns null when the JSON value is null or the key is absent.
    private static double? Read(JsonElement hourly, string key, int index)
    {
        if (!hourly.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return null;

        var len = arr.GetArrayLength();
        if (len == 0) return null;

        var el = arr[Math.Clamp(index, 0, len - 1)];
        return el.ValueKind == JsonValueKind.Number ? el.GetDouble() : null;
    }

    private static GrametWaypointData Fallback(GrametWaypointInput wp) => new()
    {
        Id         = wp.Id,
        Lat        = wp.Lat,
        Lon        = wp.Lon,
        DistanceNm = wp.DistanceNm,
        Levels     = Pressures.Select(p => new GrametLevelData
        {
            PressureHPa   = p,
            FlightLevelFt = PressureToFt[p],
            TempC         = null,
            WindSpeedKt   = null,
            WindDirDeg    = null,
        }).ToList(),
    };
}
