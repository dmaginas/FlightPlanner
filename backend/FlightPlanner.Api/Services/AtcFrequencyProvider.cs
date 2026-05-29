using FlightPlanner.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FlightPlanner.Api.Services;

public sealed class AtcFrequencyProvider : IAtcFrequencyProvider
{
    private const string AtcCsvUrl   = "https://davidmegginson.github.io/ourairports-data/airport-frequencies.csv";
    private const string AtcCacheKey = "ourairports_atc_v1";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private static readonly HashSet<string> AtcTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ATIS", "TWR", "GND", "APP", "DEP", "CTAF", "UNIC", "UNICOM", "AFIS", "INFO", "RDO",
    };

    private readonly HttpClient                     _http;
    private readonly IMemoryCache                   _cache;
    private readonly ILogger<AtcFrequencyProvider>  _logger;

    public AtcFrequencyProvider(
        HttpClient http,
        IMemoryCache cache,
        ILogger<AtcFrequencyProvider> logger)
    {
        _http   = http;
        _cache  = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<string, List<AtcFrequencyDto>>> LoadAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(AtcCacheKey, out Dictionary<string, List<AtcFrequencyDto>>? cached) && cached is not null)
            return cached;

        _logger.LogInformation("Downloading OurAirports airport-frequencies.csv…");
        var csv  = await _http.GetStringAsync(AtcCsvUrl, ct);
        var dict = new Dictionary<string, List<AtcFrequencyDto>>(StringComparer.OrdinalIgnoreCase);

        using var reader = new StringReader(csv);
        bool    header = true;
        string? line;

        // Columns: id,airport_ref,airport_ident,type,description,frequency_mhz
        while ((line = reader.ReadLine()) is not null)
        {
            if (header) { header = false; continue; }
            if (string.IsNullOrWhiteSpace(line)) continue;

            var f = CsvParser.ParseLine(line);
            if (f.Length < 6) continue;

            var airportIdent = f[2];
            var type         = f[3];
            var description  = f[4];

            if (string.IsNullOrWhiteSpace(airportIdent)) continue;
            if (!AtcTypes.Contains(type))                continue;
            if (!CsvParser.TryParseDouble(f[5], out var freq)) continue;

            var dto = new AtcFrequencyDto(type.ToUpperInvariant(), description, freq);

            if (!dict.TryGetValue(airportIdent, out var list))
            {
                list               = new List<AtcFrequencyDto>();
                dict[airportIdent] = list;
            }
            list.Add(dto);
        }

        _cache.Set(AtcCacheKey, dict, CacheTtl);
        _logger.LogInformation("OurAirports ATC frequencies cached: {Count} airports", dict.Count);
        return dict;
    }
}
