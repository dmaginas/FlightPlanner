namespace FlightPlanner.Api.Options;

public sealed class NotamOptions
{
    public const string SectionName = "FaaNotam";

    public string ApiKey  { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = "https://api.faa.gov/notamSearch";
    public int    PageSize { get; init; } = 10;
}
