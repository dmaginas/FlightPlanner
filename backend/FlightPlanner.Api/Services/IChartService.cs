using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IChartService
{
    Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct = default);
    Task<ChartFile> GetChartFileAsync(string source, string id, CancellationToken ct = default);
}
