namespace FlightPlanner.Api.NavData;

internal sealed record NavNode(string Ident, double Lat, double Lon);
internal sealed record NavEdge(string ToKey, string Airway, double DistNm);

/// <summary>Row 2 = NDB (freq in kHz), Row 3 = VOR/VOR-DME/VORTAC (freq raw = MHz * 100).</summary>
internal sealed record NavItem(string Ident, string Name, double Lat, double Lon, int RowCode, double FreqRaw, double Range);

internal sealed class NavGraph
{
    public Dictionary<string, NavNode> Nodes { get; }
    public Dictionary<string, List<NavEdge>> Adj { get; }
    public int NodeCount => Nodes.Count;
    public int EdgeCount => Adj.Values.Sum(e => e.Count);

    public NavGraph(Dictionary<string, NavNode> nodes, Dictionary<string, List<NavEdge>> adj)
    {
        Nodes = nodes;
        Adj = adj;
    }
}
