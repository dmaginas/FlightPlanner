using System.Globalization;
using System.Text.Json;
using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches en-route winds aloft from Open Meteo at the pressure level
/// closest to the requested cruise altitude, then computes the headwind
/// component per sampled waypoint based on track bearing.
///
/// No API key required. For flight simulation use only.
/// </summary>
public sealed class WindsService : IWindsService
{
    private const string OpenMeteoUrl = "https://api.open-meteo.com/v1/forecast";
    private const int    MaxSamples   = 8;

    // Pressure level → approximate altitude in feet
    private static readonly (int hPa, int altFt)[] PressureLevels =
    [
        (850,  5_000), (700, 10_000), (500, 18_000),
        (300, 30_000), (250, 34_000), (200, 39_000),
    ];

    private readonly HttpClient          _http;
    private readonly ILogger<WindsService> _logger;

    public WindsService(HttpClient http, ILogger<WindsService> logger)
    {
        _http   = http;
        _logger = logger;
    }

    public async Task<WindsResponse> FetchWindsAsync(WindsRequest request, CancellationToken ct = default)
    {
        var sampled     = Sample(request.Waypoints, MaxSamples);
        var pressureHPa = ClosestPressureLevel(request.AltitudeFt);

        if (sampled.Count == 0)
            return new WindsResponse { SampledPressureHPa = pressureHPa, FetchedAt = DateTime.UtcNow.ToString("O") };

        var windTasks = sampled.Select(wp => FetchPointAsync(wp, pressureHPa, ct));
        var rawWinds  = await Task.WhenAll(windTasks);

        var results = new List<WindWaypointResult>(sampled.Count);
        for (var i = 0; i < sampled.Count; i++)
        {
            var (speed, dir) = rawWinds[i];
            var bearing = i < sampled.Count - 1
                ? Bearing(sampled[i], sampled[i + 1])
                : i > 0 ? Bearing(sampled[i - 1], sampled[i]) : 0;

            results.Add(new WindWaypointResult
            {
                Lat          = sampled[i].Lat,
                Lon          = sampled[i].Lon,
                WindSpeedKts = Math.Round(speed),
                WindDirDeg   = (int)Math.Round(dir),
                HeadwindKts  = Math.Round(Headwind(speed, dir, bearing)),
            });
        }

        var avgHeadwind = results.Count > 0
            ? Math.Round(results.Average(r => r.HeadwindKts))
            : 0;

        _logger.LogInformation(
            "Winds: {N} samples at {hPa} hPa (~{Alt} ft), avg headwind {HW:+0;-0;0} kt",
            sampled.Count, pressureHPa, request.AltitudeFt, avgHeadwind);

        return new WindsResponse
        {
            AverageHeadwindKts = avgHeadwind,
            Waypoints          = results,
            SampledPressureHPa = pressureHPa,
            FetchedAt          = DateTime.UtcNow.ToString("O"),
        };
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static int ClosestPressureLevel(int altFt)
        => PressureLevels.MinBy(p => Math.Abs(p.altFt - altFt)).hPa;

    private async Task<(double speed, double dir)> FetchPointAsync(
        WindRequestWaypoint wp, int pressureHPa, CancellationToken ct)
    {
        var lat = wp.Lat.ToString("F4", CultureInfo.InvariantCulture);
        var lon = wp.Lon.ToString("F4", CultureInfo.InvariantCulture);
        var url = $"{OpenMeteoUrl}"
            + $"?latitude={lat}&longitude={lon}"
            + $"&hourly=wind_speed_{pressureHPa}hPa,wind_direction_{pressureHPa}hPa"
            + "&wind_speed_unit=kn&timezone=UTC&forecast_days=1";

        try
        {
            var resp = await _http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Open Meteo {Status} at ({Lat},{Lon})", (int)resp.StatusCode, lat, lon);
                return (0, 0);
            }
            var json = await resp.Content.ReadAsStringAsync(ct);
            return ParseWind(json, pressureHPa);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Wind fetch failed at ({Lat},{Lon})", lat, lon);
            return (0, 0);
        }
    }

    private static (double speed, double dir) ParseWind(string json, int pressureHPa)
    {
        using var doc  = JsonDocument.Parse(json);
        var hourly = doc.RootElement.GetProperty("hourly");
        var idx    = Math.Clamp(DateTime.UtcNow.Hour, 0, 23);
        return (Read(hourly, $"wind_speed_{pressureHPa}hPa",     idx) ?? 0,
                Read(hourly, $"wind_direction_{pressureHPa}hPa", idx) ?? 0);
    }

    private static double? Read(JsonElement hourly, string key, int idx)
    {
        if (!hourly.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return null;
        var len = arr.GetArrayLength();
        if (len == 0) return null;
        var el = arr[Math.Clamp(idx, 0, len - 1)];
        return el.ValueKind == JsonValueKind.Number ? el.GetDouble() : null;
    }

    // Great-circle bearing from → to, in degrees (-180 to 180).
    private static double Bearing(WindRequestWaypoint from, WindRequestWaypoint to)
    {
        var lat1 = from.Lat * Math.PI / 180;
        var lat2 = to.Lat   * Math.PI / 180;
        var dLon = (to.Lon - from.Lon) * Math.PI / 180;
        var y    = Math.Sin(dLon) * Math.Cos(lat2);
        var x    = Math.Cos(lat1) * Math.Sin(lat2) - Math.Sin(lat1) * Math.Cos(lat2) * Math.Cos(dLon);
        return Math.Atan2(y, x) * 180 / Math.PI;
    }

    // windDirDeg = meteorological FROM direction.
    // Returns positive for headwind (opposing track), negative for tailwind.
    private static double Headwind(double speedKts, double windDirDeg, double trackBearingDeg)
    {
        var angle = (windDirDeg - trackBearingDeg) * Math.PI / 180;
        return speedKts * Math.Cos(angle);
    }

    private static List<WindRequestWaypoint> Sample(List<WindRequestWaypoint> wps, int max)
    {
        if (wps.Count <= max) return wps;
        var result = new List<WindRequestWaypoint>(max);
        var step   = (double)(wps.Count - 1) / (max - 1);
        for (var i = 0; i < max; i++)
            result.Add(wps[(int)Math.Round(i * step)]);
        return result;
    }
}
