using FlightPlanner.Api.Models;
using FlightPlanner.Api.NavData;

namespace FlightPlanner.Api.Services;

public sealed class NavDataService : INavDataService
{
    private readonly NavGraph? _graph;
    private readonly ILogger<NavDataService> _logger;

    public bool IsAvailable => _graph is not null;

    public NavDataService(ILogger<NavDataService> logger)
    {
        _logger = logger;
        var awyPath = Path.Combine(AppContext.BaseDirectory, "NavData", "earth_awy.dat");
        if (!File.Exists(awyPath))
        {
            _logger.LogWarning("NavData file not found at {Path} — airway routing unavailable.", awyPath);
            return;
        }
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            _graph = NavDataParser.BuildGraph(awyPath);
            sw.Stop();
            _logger.LogInformation(
                "NavData loaded: {Nodes} nodes, {Edges} edges in {Ms}ms (AIRAC 2012.08)",
                _graph.NodeCount, _graph.EdgeCount, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load NavData from {Path}", awyPath);
        }
    }

    public List<WaypointDto>? FindRoute(
        string depIcao, double depLat, double depLon,
        string arrIcao, double arrLat, double arrLon)
    {
        if (_graph is null) return null;
        try
        {
            return AirwayRouter.FindRoute(_graph, depIcao, depLat, depLon, arrIcao, arrLat, arrLon, _logger);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Airway routing failed for {Dep}→{Arr}", depIcao, arrIcao);
            return null;
        }
    }
}
