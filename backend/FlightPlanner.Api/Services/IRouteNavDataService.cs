using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IRouteNavDataService
{
    bool IsAvailable { get; }
    List<WaypointDto>? FindRoute(
        string depIcao, double depLat, double depLon,
        string arrIcao, double arrLat, double arrLon);
}
