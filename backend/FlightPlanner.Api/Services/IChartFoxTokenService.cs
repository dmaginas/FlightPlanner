namespace FlightPlanner.Api.Services;

public interface IChartFoxTokenService
{
    bool IsAuthenticated { get; }
    Task<string?> GetTokenAsync(CancellationToken ct);
    (string Url, string State) BuildAuthorizationUrl();
    Task ExchangeCodeAsync(string code, string state, CancellationToken ct);
    void Disconnect();
}
