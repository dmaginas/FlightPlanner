using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

public sealed class RunwayDataProvider : IRunwayDataProvider
{
    private const string RunwayCsvUrl   = "https://davidmegginson.github.io/ourairports-data/runways.csv";
    private const string RunwayCacheKey = "ourairports_runways_v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient                     _http;
    private readonly IMemoryCache                   _cache;
    private readonly ILogger<RunwayDataProvider>    _logger;

    public RunwayDataProvider(
        HttpClient http,
        IMemoryCache cache,
        ILogger<RunwayDataProvider> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<string, List<RunwayDto>>> LoadAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(RunwayCacheKey, out Dictionary<string, List<RunwayDto>>? cached) && cached is not null)
            return cached;

        _logger.LogInformation("Downloading OurAirports runways.csv…");
        var csv  = await _http.GetStringAsync(RunwayCsvUrl, ct);
        var dict = new Dictionary<string, List<RunwayDto>>(StringComparer.OrdinalIgnoreCase);

        using var reader = new StringReader(csv);
        bool    header = true;
        string? line;

        while ((line = reader.ReadLine()) is not null)
        {
            if (header) { header = false; continue; }
            if (string.IsNullOrWhiteSpace(line)) continue;

            var f = CsvParser.ParseLine(line);
            if (f.Length < 17) continue;

            var ident = f[2];
            if (string.IsNullOrWhiteSpace(ident)) continue;

            if (!CsvParser.TryParseDouble(f[9],  out var leLat)) continue;
            if (!CsvParser.TryParseDouble(f[10], out var leLon)) continue;
            if (!CsvParser.TryParseDouble(f[15], out var heLat)) continue;
            if (!CsvParser.TryParseDouble(f[16], out var heLon)) continue;

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
}
