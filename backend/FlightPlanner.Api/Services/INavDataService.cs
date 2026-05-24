using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface INavDataService
{
    bool IsAvailable { get; }

    List<WaypointDto>? FindRoute(
        string depIcao, double depLat, double depLon,
        string arrIcao, double arrLat, double arrLon);

    NavDataBboxResult QueryBbox(
        double swLat, double swLon, double neLat, double neLon,
        IReadOnlySet<string> types);
}
