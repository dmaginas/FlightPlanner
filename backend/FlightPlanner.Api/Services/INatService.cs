using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface INatService
{
    Task<NatResponse> FetchTracksAsync(CancellationToken ct = default);
}
