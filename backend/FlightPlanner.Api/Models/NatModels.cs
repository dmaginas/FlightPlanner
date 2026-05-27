namespace FlightPlanner.Api.Models;

public sealed class NatTrack
{
    public string Id { get; set; } = string.Empty;
    public string? Tmi { get; set; }
    public IReadOnlyList<NatPoint> Route { get; set; } = [];
    public IReadOnlyList<string> FlightLevels { get; set; } = [];
    public NatDirection Direction { get; set; }
    public bool IsEastbound => Direction == NatDirection.Eastbound;
}

public sealed class NatPoint
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Name { get; set; }
}

public enum NatDirection
{
    Unknown   = 0,
    Westbound = 1,
    Eastbound = 2,
}

public sealed class NatResponse
{
    public IReadOnlyList<NatTrack> Tracks { get; set; } = [];
    public string? FetchedAt { get; set; }
}
