using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IWindsService
{
    Task<WindsResponse> FetchWindsAsync(WindsRequest request, CancellationToken ct = default);
}
