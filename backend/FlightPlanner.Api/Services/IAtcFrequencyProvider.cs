using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IAtcFrequencyProvider
{
    Task<IReadOnlyDictionary<string, List<AtcFrequencyDto>>> LoadAsync(CancellationToken ct = default);
}
