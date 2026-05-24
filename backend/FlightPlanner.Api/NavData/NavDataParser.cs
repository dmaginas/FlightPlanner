using System.Globalization;

namespace FlightPlanner.Api.NavData;

internal static class NavDataParser
{
    public static NavGraph BuildGraph(string awyFilePath)
    {
        var nodes = new Dictionary<string, NavNode>(80_000);
        var adj   = new Dictionary<string, List<NavEdge>>(80_000);

        foreach (var line in File.ReadLines(awyFilePath))
        {
            // skip header/footer/blank
            if (line.Length < 10) continue;
            var fc = line[0];
            if (fc == 'I' || fc == '6' || fc == '9') continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 10) continue;

            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat1)) continue;
            if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon1)) continue;
            if (!double.TryParse(parts[4], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat2)) continue;
            if (!double.TryParse(parts[5], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon2)) continue;
            if (!int.TryParse(parts[6], out var dir)) continue;

            var key1 = NodeKey(lat1, lon1);
            var key2 = NodeKey(lat2, lon2);
            var airway = parts[9];
            var dist = GeoMath.HaversineNm(lat1, lon1, lat2, lon2);

            nodes.TryAdd(key1, new NavNode(parts[0], lat1, lon1));
            nodes.TryAdd(key2, new NavNode(parts[3], lat2, lon2));

            AddEdge(adj, key1, new NavEdge(key2, airway, dist));
            if (dir == 2) AddEdge(adj, key2, new NavEdge(key1, airway, dist));
        }

        return new NavGraph(nodes, adj);
    }

    public static IReadOnlyList<NavItem> ParseNavaids(string navFilePath)
    {
        var items = new List<NavItem>(15_000);
        foreach (var line in File.ReadLines(navFilePath))
        {
            if (line.Length < 10) continue;
            var fc = line[0];
            if (fc == 'I' || fc == 'A' || fc == '8' || fc == '9') continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 9) continue;
            if (!int.TryParse(parts[0], out var rowCode)) continue;
            if (rowCode != 2 && rowCode != 3) continue;

            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon)) continue;
            if (!double.TryParse(parts[4], NumberStyles.Float, CultureInfo.InvariantCulture, out var freqRaw)) continue;
            if (!double.TryParse(parts[5], NumberStyles.Float, CultureInfo.InvariantCulture, out var range)) continue;

            var ident = parts[7];
            var name  = string.Join(" ", parts.Skip(8));
            items.Add(new NavItem(ident, name, lat, lon, rowCode, freqRaw, range));
        }
        return items;
    }

    internal static string NodeKey(double lat, double lon) =>
        $"{Math.Round(lat, 3).ToString("F3", CultureInfo.InvariantCulture)}_{Math.Round(lon, 3).ToString("F3", CultureInfo.InvariantCulture)}";

    private static void AddEdge(Dictionary<string, List<NavEdge>> adj, string from, NavEdge edge)
    {
        if (!adj.TryGetValue(from, out var list)) { list = new List<NavEdge>(4); adj[from] = list; }
        list.Add(edge);
    }
}
