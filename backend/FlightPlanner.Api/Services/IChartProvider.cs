using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IChartProvider
{
    string SourceName { get; }
    Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct);
    Task<ChartFile> GetFileAsync(string id, CancellationToken ct);
}
