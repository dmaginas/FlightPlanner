using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IAirportDiagramService
{
    Task<AirportDiagramResponse?> GetDiagramAsync(string icao, CancellationToken ct = default);
}
