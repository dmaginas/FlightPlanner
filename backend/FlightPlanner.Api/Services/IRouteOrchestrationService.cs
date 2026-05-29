using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public sealed record RouteOrchestrationRequest(
    string Departure,
    string Destination,
    string? AircraftType,
    int? CruisingAltitude,
    double? DepartureLat,
    double? DepartureLon,
    double? DestinationLat,
    double? DestinationLon);

public sealed record RouteOrchestrationResult(
    RouteResponse? Response,
    bool IsConfigError,
    string? ConfigErrorDetail);

public interface IRouteOrchestrationService
{
    Task<RouteOrchestrationResult> ResolveRouteAsync(
        RouteOrchestrationRequest request,
        CancellationToken ct);
}
