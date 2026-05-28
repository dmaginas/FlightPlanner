using System.Text.Json.Serialization;

namespace FlightPlanner.Api.Models;

public sealed class WindsRequest
{
    [JsonPropertyName("waypoints")]
    public List<WindRequestWaypoint> Waypoints { get; init; } = [];

    [JsonPropertyName("altitudeFt")]
    public int AltitudeFt { get; init; } = 35_000;
}

public sealed class WindRequestWaypoint
{
    [JsonPropertyName("lat")] public double Lat { get; init; }
    [JsonPropertyName("lon")] public double Lon { get; init; }
}

public sealed class WindsResponse
{
    public double AverageHeadwindKts  { get; init; }
    public List<WindWaypointResult> Waypoints { get; init; } = [];
    public int    SampledPressureHPa  { get; init; }
    public string FetchedAt           { get; init; } = "";
}

public sealed class WindWaypointResult
{
    public double Lat          { get; init; }
    public double Lon          { get; init; }
    public double WindSpeedKts { get; init; }
    public int    WindDirDeg   { get; init; }
    public double HeadwindKts  { get; init; }
}
