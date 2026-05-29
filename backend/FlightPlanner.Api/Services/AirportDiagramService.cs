using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Aggregates airport diagram data from three focused providers:
///   - IRunwayDataProvider  — OurAirports runways.csv (cached 24 h)
///   - IAtcFrequencyProvider — OurAirports airport-frequencies.csv (cached 24 h)
///   - IIlsDataProvider      — local earth_nav.dat (cached 24 h)
/// </summary>
public sealed class AirportDiagramService : IAirportDiagramService
{
    private readonly IRunwayDataProvider      _runways;
    private readonly IAtcFrequencyProvider    _atc;
    private readonly IIlsDataProvider         _ils;

    public AirportDiagramService(
        IRunwayDataProvider runways,
        IAtcFrequencyProvider atc,
        IIlsDataProvider ils)
    {
        _runways = runways;
        _atc     = atc;
        _ils     = ils;
    }

    public async Task<AirportDiagramResponse?> GetDiagramAsync(string icao, CancellationToken ct = default)
    {
        var key = icao.ToUpperInvariant();

        var runwayTask = _runways.LoadAsync(ct);
        var atcTask    = _atc.LoadAsync(ct);
        await Task.WhenAll(runwayTask, atcTask);

        var runwayDict = runwayTask.Result;
        var atcDict    = atcTask.Result;
        var ilsDict    = _ils.Load();

        if (!runwayDict.TryGetValue(key, out var runways) || runways.Count == 0)
            return null;

        ilsDict.TryGetValue(key, out var ils);
        atcDict.TryGetValue(key, out var atc);

        return new AirportDiagramResponse(key, runways.ToList(), ils ?? [], atc ?? []);
    }
}
