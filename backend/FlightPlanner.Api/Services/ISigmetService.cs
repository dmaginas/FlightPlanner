using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface ISigmetService
{
    /// <summary>Returns all active SIGMETs/AIRMETs without geographic filtering.</summary>
    Task<SigmetResponse> FetchAllSigmetsAsync(CancellationToken ct = default);

    /// <summary>Returns SIGMETs/AIRMETs within the route bounding box (+ buffer).</summary>
    Task<SigmetResponse> FetchSigmetsAsync(
        double minLat, double minLon,
        double maxLat, double maxLon,
        CancellationToken ct = default);
}
