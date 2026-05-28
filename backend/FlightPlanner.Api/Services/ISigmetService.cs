using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface ISigmetService
{
    Task<SigmetResponse> FetchSigmetsAsync(
        double minLat, double minLon,
        double maxLat, double maxLon,
        CancellationToken ct = default);
}
