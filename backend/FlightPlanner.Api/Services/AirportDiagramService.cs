using System.Globalization;
using System.Text;
using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Fetches airport runway, ILS, and ATC frequency data.
/// Runway and ATC data come from the OurAirports public dataset (cached 24 h).
/// ILS data is parsed once from the local earth_nav.dat file.
/// </summary>
public sealed class AirportDiagramService : IAirportDiagramService
{
    private const string RunwayCsvUrl  = "https://davidmegginson.github.io/ourairports-data/runways.csv";
    private const string AtcCsvUrl     = "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";
    private const string RunwayCacheKey = "ourairports_runways_v1";
    private const string AtcCacheKey    = "ourairports_atc_v1";
    private const string IlsCacheKey    = "navdata_ils_v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient                      _http;
    private readonly IMemoryCache                    _cache;
    private readonly ILogger<AirportDiagramService>  _logger;

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
        var key = icao.ToUpperInvariant();

        var runwayTask = LoadRunwaysAsync(ct);
        var atcTask    = LoadAtcAsync(ct);
        await Task.WhenAll(runwayTask, atcTask);

        var runwayDict = runwayTask.Result;
        var atcDict    = atcTask.Result;
        var ilsDict    = LoadIls();

        if (!runwayDict.TryGetValue(key, out var runways) || runways.Count == 0)
            return null;

        ilsDict.TryGetValue(key, out var ils);
        atcDict.TryGetValue(key, out var atc);

        return new AirportDiagramResponse(
            key,
            runways,
            ils  ?? [],
            atc  ?? []
        );
    }

    // ── Runway loader ─────────────────────────────────────────────────────────

    private async Task<Dictionary<string, List<RunwayDto>>> LoadRunwaysAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(RunwayCacheKey, out Dictionary<string, List<RunwayDto>>? cached) && cached is not null)
            return cached;

        _logger.LogInformation("Downloading OurAirports runways.csv…");
        var csv  = await _http.GetStringAsync(RunwayCsvUrl, ct);
        var dict = new Dictionary<string, List<RunwayDto>>(StringComparer.OrdinalIgnoreCase);

        using var reader = new StringReader(csv);
        bool   header = true;
        string? line;

        while ((line = reader.ReadLine()) is not null)
        {
            if (header) { header = false; continue; }
            if (string.IsNullOrWhiteSpace(line)) continue;

            var f = ParseCsvLine(line);
            if (f.Length < 17) continue;

            var ident = f[2];
            if (string.IsNullOrWhiteSpace(ident)) continue;

            if (!TryParseDouble(f[9],  out var leLat)) continue;
            if (!TryParseDouble(f[10], out var leLon)) continue;
            if (!TryParseDouble(f[15], out var heLat)) continue;
            if (!TryParseDouble(f[16], out var heLon)) continue;

            int.TryParse(f[3], out var lengthFt);
            int.TryParse(f[4], out var widthFt);

            var rwy = new RunwayDto(
                LeIdent:  f[8],
                LeLat:    leLat,
                LeLon:    leLon,
                HeIdent:  f[14],
                HeLat:    heLat,
                HeLon:    heLon,
                LengthFt: lengthFt,
                WidthFt:  widthFt,
                Surface:  f[5],
                Lighted:  f[6] == "1",
                Closed:   f[7] == "1"
            );

            if (!dict.TryGetValue(ident, out var list))
            {
                list        = new List<RunwayDto>();
                dict[ident] = list;
            }
            list.Add(rwy);
        }

        _cache.Set(RunwayCacheKey, dict, CacheTtl);
        _logger.LogInformation("OurAirports runways cached: {Count} airports", dict.Count);
        return dict;
    }

    // ── ATC frequency loader ──────────────────────────────────────────────────

    private static readonly HashSet<string> AtcTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ATIS", "TWR", "GND", "APP", "DEP", "CTAF", "UNIC", "UNICOM", "AFIS", "INFO", "RDO",
    };

    private async Task<Dictionary<string, List<AtcFrequencyDto>>> LoadAtcAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(AtcCacheKey, out Dictionary<string, List<AtcFrequencyDto>>? cached) && cached is not null)
            return cached;

        _logger.LogInformation("Downloading OurAirports airport-frequencies.csv…");
        var csv  = await _http.GetStringAsync(AtcCsvUrl, ct);
        var dict = new Dictionary<string, List<AtcFrequencyDto>>(StringComparer.OrdinalIgnoreCase);

        using var reader = new StringReader(csv);
        bool   header = true;
        string? line;

        // Columns: id,airport_ref,airport_ident,type,description,frequency_mhz
        while ((line = reader.ReadLine()) is not null)
        {
            if (header) { header = false; continue; }
            if (string.IsNullOrWhiteSpace(line)) continue;

            var f = ParseCsvLine(line);
            if (f.Length < 6) continue;

            var airportIdent = f[2];
            var type         = f[3];
            var description  = f[4];

            if (string.IsNullOrWhiteSpace(airportIdent)) continue;
            if (!AtcTypes.Contains(type))                continue;
            if (!TryParseDouble(f[5], out var freq))     continue;

            var dto = new AtcFrequencyDto(type.ToUpperInvariant(), description, freq);

            if (!dict.TryGetValue(airportIdent, out var list))
            {
                list                  = new List<AtcFrequencyDto>();
                dict[airportIdent]    = list;
            }
            list.Add(dto);
        }

        _cache.Set(AtcCacheKey, dict, CacheTtl);
        _logger.LogInformation("OurAirports ATC frequencies cached: {Count} airports", dict.Count);
        return dict;
    }

    // ── ILS loader (local earth_nav.dat, type 4) ──────────────────────────────

    private Dictionary<string, List<IlsDto>> LoadIls()
    {
        if (_cache.TryGetValue(IlsCacheKey, out Dictionary<string, List<IlsDto>>? cached) && cached is not null)
            return cached;

        var path = Path.Combine(AppContext.BaseDirectory, "NavData", "earth_nav.dat");
        var dict = new Dictionary<string, List<IlsDto>>(StringComparer.OrdinalIgnoreCase);

        if (!File.Exists(path))
        {
            _logger.LogWarning("earth_nav.dat not found at {Path} — ILS data unavailable", path);
            _cache.Set(IlsCacheKey, dict, CacheTtl);
            return dict;
        }

        foreach (var line in File.ReadLines(path))
        {
            if (!line.StartsWith("4 ", StringComparison.Ordinal)) continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            // type lat lon elev freq*100 range bearing ident airport rwy category
            if (parts.Length < 11) continue;

            if (!TryParseDouble(parts[4], out var freqRaw)) continue;
            if (!TryParseDouble(parts[6], out var bearing)) continue;

            var freqMhz    = Math.Round(freqRaw / 100.0, 2);
            var ilsIdent   = parts[7];
            var airportIcao = parts[8];
            var rwyIdent   = parts[9];
            var category   = MapIlsCategory(parts[10]);

            var dto = new IlsDto(rwyIdent, ilsIdent, freqMhz, category, bearing);

            if (!dict.TryGetValue(airportIcao, out var list))
            {
                list               = new List<IlsDto>();
                dict[airportIcao]  = list;
            }
            list.Add(dto);
        }

        _cache.Set(IlsCacheKey, dict, CacheTtl);
        _logger.LogInformation("earth_nav.dat ILS entries cached: {Count} airports", dict.Count);
        return dict;
    }

    private static string MapIlsCategory(string raw) => raw switch
    {
        "ILS-cat-I"   => "CAT I",
        "ILS-cat-II"  => "CAT II",
        "ILS-cat-III" => "CAT III",
        "LOC-only"    => "LOC",
        _             => raw,
    };

    // ── CSV parser (handles double-quoted fields) ─────────────────────────────

    private static string[] ParseCsvLine(string line)
    {
        var  fields   = new List<string>();
        var  sb       = new StringBuilder();
        bool inQuotes = false;

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
