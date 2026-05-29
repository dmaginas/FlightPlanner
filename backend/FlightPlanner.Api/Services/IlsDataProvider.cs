using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

public sealed class IlsDataProvider : IIlsDataProvider
{
    private const string IlsCacheKey = "navdata_ils_v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly IMemoryCache               _cache;
    private readonly ILogger<IlsDataProvider>   _logger;

    public IlsDataProvider(IMemoryCache cache, ILogger<IlsDataProvider> logger)
    {
        _cache  = cache;
        _logger = logger;
    }

    public IReadOnlyDictionary<string, List<IlsDto>> Load()
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

            if (!CsvParser.TryParseDouble(parts[4], out var freqRaw)) continue;
            if (!CsvParser.TryParseDouble(parts[6], out var bearing)) continue;

            var freqMhz     = Math.Round(freqRaw / 100.0, 2);
            var ilsIdent    = parts[7];
            var airportIcao = parts[8];
            var rwyIdent    = parts[9];
            var category    = MapIlsCategory(parts[10]);

            var dto = new IlsDto(rwyIdent, ilsIdent, freqMhz, category, bearing);

            if (!dict.TryGetValue(airportIcao, out var list))
            {
                list              = new List<IlsDto>();
                dict[airportIcao] = list;
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
}
