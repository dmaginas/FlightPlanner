namespace FlightPlanner.Api.Options;

public sealed class ChartFoxOptions
{
    public const string SectionName = "ChartFox";
    public string? ApiKey      { get; init; }  // Legacy static Bearer token (optional)
    public string? ClientId    { get; init; }  // OAuth client_id from ChartFox portal
    public string? CallbackUrl { get; init; }  // OAuth redirect_uri (must match portal registration)
}
