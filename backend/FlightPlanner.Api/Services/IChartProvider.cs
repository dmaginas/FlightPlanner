using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IChartProvider
{
    string SourceName { get; }
    Task<List<ChartDto>> GetChartsAsync(string icao, CancellationToken ct);
    Task<(Stream Stream, string ContentType)> GetFileAsync(string id, CancellationToken ct);
}
