using FlightPlanner.Api.Models;
using Microsoft.Extensions.Logging;

namespace FlightPlanner.Api.NavData;

internal static class AirwayRouter
{
    private const double DefaultHalfNm    = 280.0;  // corridor half-width
    private const double EndpointRadiusNm = 400.0;  // include fixes near dep/arr
    private const int    MaxConnections   = 10;      // virtual node connections

    public static List<WaypointDto>? FindRoute(
        NavGraph graph,
        string depIcao, double depLat, double depLon,
        string arrIcao, double arrLat, double arrLon,
        ILogger? logger = null)
    {
        var routeDistNm = GeoMath.HaversineNm(depLat, depLon, arrLat, arrLon);

        // Widen corridor for very short or disconnected routes
        double corridorNm = routeDistNm < 200 ? EndpointRadiusNm : DefaultHalfNm;

        var corridorSet = FilterCorridor(graph, depLat, depLon, arrLat, arrLon, routeDistNm, corridorNm);

        logger?.LogDebug("Navdata corridor: {Count} nodes for {RouteDist:F0}NM route ({Half}NM half-width)",
            corridorSet.Count, routeDistNm, corridorNm);

        // Try routing; widen corridor on first failure
        var result = TryRoute(graph, corridorSet, depIcao, depLat, depLon, arrIcao, arrLat, arrLon);
        if (result is not null) return result;

        // Retry with wider corridor
        corridorSet = FilterCorridor(graph, depLat, depLon, arrLat, arrLon, routeDistNm, corridorNm + 250);
        logger?.LogDebug("Navdata retry with wider corridor: {Count} nodes", corridorSet.Count);
        return TryRoute(graph, corridorSet, depIcao, depLat, depLon, arrIcao, arrLat, arrLon);
    }

    private static HashSet<string> FilterCorridor(
        NavGraph graph, double depLat, double depLon, double arrLat, double arrLon,
        double routeDistNm, double halfWidthNm)
    {
        var result = new HashSet<string>(8000);
        foreach (var (key, node) in graph.Nodes)
        {
            var dDep = GeoMath.HaversineNm(depLat, depLon, node.Lat, node.Lon);
            var dArr = GeoMath.HaversineNm(arrLat, arrLon, node.Lat, node.Lon);

            // Always include fixes near endpoints
            if (dDep <= EndpointRadiusNm || dArr <= EndpointRadiusNm)
            { result.Add(key); continue; }

            // Guard against NaN for very short routes (dep ≈ arr)
            if (routeDistNm < 1.0) continue;

            // Cross-track + along-track filter
            var xt = GeoMath.CrossTrackDistNm(node.Lat, node.Lon, depLat, depLon, arrLat, arrLon);
            if (xt > halfWidthNm) continue;

            var at = GeoMath.AlongTrackDistNm(node.Lat, node.Lon, depLat, depLon, arrLat, arrLon);
            if (at < -100 || at > routeDistNm + 100) continue;

            result.Add(key);
        }
        return result;
    }

    private static List<WaypointDto>? TryRoute(
        NavGraph graph,
        HashSet<string> corridorSet,
        string depIcao, double depLat, double depLon,
        string arrIcao, double arrLat, double arrLon)
    {
        const string DEP = "__DEP__";
        const string ARR = "__ARR__";

        if (corridorSet.Count < 2) return null;

        // Build local adjacency (corridor edges only)
        var localAdj = new Dictionary<string, List<(string key, string airway, double dist)>>(corridorSet.Count + 2);
        foreach (var fromKey in corridorSet)
        {
            if (!graph.Adj.TryGetValue(fromKey, out var edges)) continue;
            List<(string, string, double)>? filtered = null;
            foreach (var e in edges)
            {
                if (!corridorSet.Contains(e.ToKey)) continue;
                filtered ??= new List<(string, string, double)>(edges.Count);
                filtered.Add((e.ToKey, e.Airway, e.DistNm));
            }
            if (filtered is not null) localAdj[fromKey] = filtered;
        }

        // Connect virtual DEP node to K nearest corridor nodes
        var depConns = corridorSet
            .Select(k => (k, dist: GeoMath.HaversineNm(depLat, depLon, graph.Nodes[k].Lat, graph.Nodes[k].Lon)))
            .Where(x => x.dist <= EndpointRadiusNm)
            .OrderBy(x => x.dist)
            .Take(MaxConnections)
            .ToList();
        if (depConns.Count == 0) return null;
        localAdj[DEP] = depConns.Select(x => (x.k, "DCT", x.dist)).ToList();

        // Connect K nearest corridor nodes to virtual ARR node
        var arrConns = corridorSet
            .Select(k => (k, dist: GeoMath.HaversineNm(graph.Nodes[k].Lat, graph.Nodes[k].Lon, arrLat, arrLon)))
            .Where(x => x.dist <= EndpointRadiusNm)
            .OrderBy(x => x.dist)
            .Take(MaxConnections)
            .ToList();
        if (arrConns.Count == 0) return null;
        foreach (var (k, dist) in arrConns)
        {
            if (!localAdj.TryGetValue(k, out var lst)) { lst = new List<(string, string, double)>(2); localAdj[k] = lst; }
            lst.Add((ARR, "DCT", dist));
        }

        // A* from DEP to ARR
        var gScore   = new Dictionary<string, double>(corridorSet.Count) { [DEP] = 0 };
        var cameFrom = new Dictionary<string, (string prev, string airway)>(corridorSet.Count);
        var openSet  = new PriorityQueue<string, double>();
        var closed   = new HashSet<string>(corridorSet.Count);

        openSet.Enqueue(DEP, GeoMath.HaversineNm(depLat, depLon, arrLat, arrLon));

        while (openSet.Count > 0)
        {
            var cur = openSet.Dequeue();
            if (cur == ARR) break;
            if (!closed.Add(cur)) continue;
            if (!localAdj.TryGetValue(cur, out var neighbors)) continue;

            var (curLat, curLon) = NodeCoords(cur, graph, depLat, depLon, arrLat, arrLon, DEP, ARR);

            foreach (var (nextKey, airway, edgeDist) in neighbors)
            {
                if (closed.Contains(nextKey)) continue;
                var tentG = gScore[cur] + edgeDist;
                if (!gScore.TryGetValue(nextKey, out var existG) || tentG < existG)
                {
                    gScore[nextKey] = tentG;
                    cameFrom[nextKey] = (cur, airway);
                    var (nLat, nLon) = NodeCoords(nextKey, graph, depLat, depLon, arrLat, arrLon, DEP, ARR);
                    openSet.Enqueue(nextKey, tentG + GeoMath.HaversineNm(nLat, nLon, arrLat, arrLon));
                }
            }
        }

        if (!cameFrom.ContainsKey(ARR)) return null;

        // Reconstruct path
        var path = new List<(string key, string airway)>();
        var current = ARR;
        while (current != DEP)
        {
            if (!cameFrom.TryGetValue(current, out var prev)) return null;
            path.Add((current, prev.airway));
            current = prev.prev;
        }
        path.Reverse();

        // Build WaypointDto list
        var waypoints = new List<WaypointDto>(path.Count + 2);
        waypoints.Add(new WaypointDto { Id = depIcao, Lat = depLat, Lon = depLon, Type = "airport" });

        foreach (var (nodeKey, airway) in path)
        {
            if (nodeKey == ARR) break;
            if (!graph.Nodes.TryGetValue(nodeKey, out var node)) continue;
            waypoints.Add(new WaypointDto { Id = node.Ident, Lat = node.Lat, Lon = node.Lon, Type = "fix", Airway = airway });
        }

        waypoints.Add(new WaypointDto { Id = arrIcao, Lat = arrLat, Lon = arrLon, Type = "airport" });
        return waypoints;
    }

    private static (double lat, double lon) NodeCoords(
        string key, NavGraph graph,
        double depLat, double depLon,
        double arrLat, double arrLon,
        string depKey, string arrKey)
    {
        if (key == depKey) return (depLat, depLon);
        if (key == arrKey) return (arrLat, arrLon);
        var n = graph.Nodes[key];
        return (n.Lat, n.Lon);
    }
}
