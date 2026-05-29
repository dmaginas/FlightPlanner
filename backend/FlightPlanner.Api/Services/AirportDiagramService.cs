using System.Globalization;
using System.Text;
using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches airport runway data from the OurAirports public dataset
/// (https://ourairports.com/data/runways.csv, mirrored on GitHub).
///
/// The full CSV (~4 MB, ~44 000 rows) is downloaded on first use, parsed into
/// a dictionary keyed by ICAO code, and cached for 24 hours.  Subsequent
/// requests for any airport are served instantly from the in-memory dictionary.
/// </summary>
public sealed class AirportDiagramService : IAirportDiagramService
{
    private const string CsvUrl  = "https://davidmegginson.github.io/ourairports-data/runways.csv";
    private const string CacheKey = "ourairports_runways_v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient          _http;
    private readonly IMemoryCache        _cache;
    private readonly ILogger<AirportDiagramService> _logger;

    public AirportDiagramService(
        HttpClient http,
        IMemoryCache cache,
        ILogger<AirportDiagramService> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<AirportDiagramResponse?> GetDiagramAsync(string icao, CancellationToken ct = default)
    {
        var dict = await LoadDictionaryAsync(ct);
        var key  = icao.ToUpperInvariant();

        return dict.TryGetValue(key, out var runways) && runways.Count > 0
            ? new AirportDiagramResponse(key, runways)
            : null;
    }

    // ── Data loader ───────────────────────────────────────────────────────────

    private async Task<Dictionary<string, List<RunwayDto>>> LoadDictionaryAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(CacheKey, out Dictionary<string, List<RunwayDto>>? cached) && cached is not null)
            return cached;

        _logger.LogInformation("Downloading OurAirports runways.csv…");
        var csv = await _http.GetStringAsync(CsvUrl, ct);

        var dict = new Dictionary<string, List<RunwayDto>>(StringComparer.OrdinalIgnoreCase);

        using var reader  = new StringReader(csv);
        bool      header  = true;
        string?   line;

        while ((line = reader.ReadLine()) is not null)
        {
            if (header) { header = false; continue; }
            if (string.IsNullOrWhiteSpace(line)) continue;

            var f = ParseCsvLine(line);
            if (f.Length < 17) continue;

            var ident = f[2];
            if (string.IsNullOrWhiteSpace(ident)) continue;

            // Skip runways with missing threshold coordinates
            if (!TryParseDouble(f[9],  out var leLat)) continue;
            if (!TryParseDouble(f[10], out var leLon)) continue;
            if (!TryParseDouble(f[15], out var heLat)) continue;
            if (!TryParseDouble(f[16], out var heLon)) continue;

            int.TryParse(f[3], out var lengthFt);
            int.TryParse(f[4], out var widthFt);

            var rwy = new RunwayDto(
                LeIdent: f[8],
                LeLat:   leLat,
                LeLon:   leLon,
                HeIdent: f[14],
                HeLat:   heLat,
                HeLon:   heLon,
                LengthFt: lengthFt,
                WidthFt:  widthFt,
                Surface:  f[5],
                Lighted:  f[6] == "1",
                Closed:   f[7] == "1"
            );

            if (!dict.TryGetValue(ident, out var list))
            {
                list       = new List<RunwayDto>();
                dict[ident] = list;
            }
            list.Add(rwy);
        }

        _cache.Set(CacheKey, dict, CacheTtl);
        _logger.LogInformation("OurAirports runways cached: {Count} airports", dict.Count);
        return dict;
    }

    // ── CSV parser (handles double-quoted fields) ─────────────────────────────

    private static string[] ParseCsvLine(string line)
    {
        var    fields   = new List<string>();
        var    sb       = new StringBuilder();
        bool   inQuotes = false;

        foreach (var c in line)
        {
            if (inQuotes)
            {
                if (c == '"') inQuotes = false;
                else          sb.Append(c);
            }
            else
            {
                if      (c == '"') inQuotes = true;
                else if (c == ',') { fields.Add(sb.ToString()); sb.Clear(); }
                else               sb.Append(c);
            }
        }
        fields.Add(sb.ToString());
        return fields.ToArray();
    }

    private static bool TryParseDouble(string s, out double value) =>
        double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
}
