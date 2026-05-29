using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IChartService
{
    Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType)> GetChartFileAsync(string source, string id, CancellationToken ct = default);
}
