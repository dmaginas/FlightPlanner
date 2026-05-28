namespace FlightPlanner.Api.Models;

public sealed class SigmetResponse
{
    public List<SigmetItem> Items { get; init; } = [];
    public string FetchedAt { get; init; } = "";
}

public sealed class SigmetItem
{
    public string  Id        { get; init; } = "";
    /// <summary>SIGMET or AIRMET</summary>
    public string  Type      { get; init; } = "";
    /// <summary>Hazard type: TS, TURB, ICE, IFR, MTN OBSCN, LLWS, etc.</summary>
    public string  Hazard    { get; init; } = "";
    public string? Severity  { get; init; }
    public int?    AltLowFt  { get; init; }
    public int?    AltHighFt { get; init; }
    public string? ValidTo   { get; init; }
    public string  RawText   { get; init; } = "";
    /// <summary>Polygon vertices as [lat, lon] pairs. Null if no area geometry available.</summary>
    public List<double[]>? Coords { get; init; }
}
