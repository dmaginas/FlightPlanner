using FlightPlanner.Api.Models;
using FlightPlanner.Api.NavData;

namespace FlightPlanner.Api.Services;

public sealed class NavDataService : IRouteNavDataService, IMapNavDataService
{
    private const int MaxAirwaySegs = 2000;
    private const int MaxFixes      = 1000;

    private readonly NavGraph?               _graph;
    private readonly IReadOnlyList<NavItem>? _navaids;
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

        // Load navaids first so VORs can be injected into the routing graph.
        var navPath = Path.Combine(AppContext.BaseDirectory, "NavData", "earth_nav.dat");
        if (File.Exists(navPath))
        {
            try
            {
                _navaids = NavDataParser.ParseNavaids(navPath);
                _logger.LogInformation("NavData navaids: {Count} VORs/NDBs loaded", _navaids.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load navaids from {Path}", navPath);
            }
        }

        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            _graph = NavDataParser.BuildGraph(awyPath, _navaids);
            sw.Stop();
            _logger.LogInformation(
                "NavData loaded: {Nodes} nodes, {Edges} edges in {Ms}ms (AIRAC 2012.08, VORs injected)",
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

    public NavDataBboxResult QueryBbox(
        double swLat, double swLon, double neLat, double neLon,
        IReadOnlySet<string> types)
    {
        var vors    = new List<VorDto>();
        var ndbs    = new List<NdbDto>();
        var fixes   = new List<FixDto>();
        var airways = new List<AirwaySegDto>();

        if ((types.Contains("vor") || types.Contains("ndb")) && _navaids is not null)
        {
            foreach (var item in _navaids)
            {
                if (!InBbox(item.Lat, item.Lon, swLat, swLon, neLat, neLon)) continue;
                if (item.RowCode == 3 && types.Contains("vor"))
                    vors.Add(new VorDto(item.Ident, item.Name, item.Lat, item.Lon, Math.Round(item.FreqRaw / 100.0, 2)));
                else if (item.RowCode == 2 && types.Contains("ndb"))
                    ndbs.Add(new NdbDto(item.Ident, item.Name, item.Lat, item.Lon, item.FreqRaw));
            }
        }

        if (types.Contains("fix") && _graph is not null)
        {
            foreach (var node in _graph.Nodes.Values)
            {
                if (!InBbox(node.Lat, node.Lon, swLat, swLon, neLat, neLon)) continue;
                fixes.Add(new FixDto(node.Ident, node.Lat, node.Lon));
                if (fixes.Count >= MaxFixes) break;
            }
        }

        if (types.Contains("airway") && _graph is not null)
        {
            foreach (var (fromKey, edges) in _graph.Adj)
            {
                if (airways.Count >= MaxAirwaySegs) break;
                if (!_graph.Nodes.TryGetValue(fromKey, out var fromNode)) continue;
                var fromIn = InBbox(fromNode.Lat, fromNode.Lon, swLat, swLon, neLat, neLon);

                foreach (var edge in edges)
                {
                    if (airways.Count >= MaxAirwaySegs) break;
                    if (!_graph.Nodes.TryGetValue(edge.ToKey, out var toNode)) continue;
                    if (!fromIn && !InBbox(toNode.Lat, toNode.Lon, swLat, swLon, neLat, neLon)) continue;
                    airways.Add(new AirwaySegDto(edge.Airway, fromNode.Lat, fromNode.Lon, toNode.Lat, toNode.Lon));
                }
            }
        }

        return new NavDataBboxResult { Vors = vors, Ndbs = ndbs, Fixes = fixes, Airways = airways };
    }

    private static bool InBbox(double lat, double lon, double swLat, double swLon, double neLat, double neLon)
    {
        if (lat < swLat || lat > neLat) return false;
        return swLon <= neLon
            ? lon >= swLon && lon <= neLon
            : lon >= swLon || lon <= neLon;
    }
}
