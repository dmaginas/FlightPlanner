namespace FlightPlanner.Api.Services;

public interface IAirspaceService
{
    Task<string> GetBoundariesGeoJsonAsync(CancellationToken ct = default);
}
