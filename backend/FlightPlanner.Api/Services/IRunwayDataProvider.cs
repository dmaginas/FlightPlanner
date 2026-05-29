using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IRunwayDataProvider
{
    Task<IReadOnlyDictionary<string, List<RunwayDto>>> LoadAsync(CancellationToken ct = default);
}
