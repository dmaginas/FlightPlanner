using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Aggregates airport charts from all registered <see cref="IChartProvider"/> implementations.
///
/// Strategy: try each provider in registration order; return the first non-empty result.
/// This keeps the FAA-first, ChartFox-fallback behaviour while making the set of providers
/// open for extension without modifying this class (OCP).
/// </summary>
public sealed class ChartService : IChartService
{
    private readonly IEnumerable<IChartProvider> _providers;

    public ChartService(IEnumerable<IChartProvider> providers)
    {
        _providers = providers;
    }

    public async Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct = default)
    {
        var upper = icao.ToUpperInvariant();
        foreach (var provider in _providers)
        {
            var charts = await provider.GetChartsAsync(upper, ct);
            if (charts.Count > 0) return charts;
        }
        return [];
    }

    public async Task<(Stream Stream, string ContentType)> GetChartFileAsync(
        string source, string id, CancellationToken ct = default)
    {
        var provider = _providers.FirstOrDefault(p => p.SourceName == source)
            ?? throw new ArgumentException($"Unknown chart source: {source}", nameof(source));
        return await provider.GetFileAsync(id, ct);
    }
}
