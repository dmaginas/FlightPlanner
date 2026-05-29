using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IMapNavDataService
{
    bool IsAvailable { get; }
    NavDataBboxResult QueryBbox(
        double swLat, double swLon, double neLat, double neLon,
        IReadOnlySet<string> types);
}
