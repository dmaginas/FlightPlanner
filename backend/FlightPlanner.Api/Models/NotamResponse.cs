namespace FlightPlanner.Api.Models;

public sealed class NotamResponse
{
    public List<NotamDto> Notams { get; init; } = [];
    public int Total            { get; init; }
}

public sealed class NotamDto
{
    public string  Id             { get; init; } = string.Empty;
    public string  Number         { get; init; } = string.Empty;
    public string  Text           { get; init; } = string.Empty;
    public string  EffectiveStart { get; init; } = string.Empty;
    public string? EffectiveEnd   { get; init; }
    public string  Classification { get; init; } = string.Empty;
}
