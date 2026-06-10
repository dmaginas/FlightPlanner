using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FlightPlanner.Api.Options;

namespace FlightPlanner.Api.Services;

public sealed class ChartFoxTokenService : IChartFoxTokenService
{
    private const string AuthorizeUrl = "https://api.chartfox.org/oauth/authorize";
    private const string TokenUrl     = "https://api.chartfox.org/oauth/token";
    private const string Scopes       = "charts:index charts:view charts:files";

    private static readonly string TokenFilePath = Path.Combine(
        AppContext.BaseDirectory, "chartfox_token.json");

    private readonly HttpClient _http;
    private readonly ChartFoxOptions _options;
    private readonly ILogger<ChartFoxTokenService> _logger;

    // state → code_verifier for in-flight OAuth flows
    private readonly ConcurrentDictionary<string, string> _pendingFlows = new();

    private string? _accessToken;
    private string? _refreshToken;
    private DateTimeOffset _expiresAt = DateTimeOffset.MinValue;

    public bool IsAuthenticated => _accessToken is not null;

    public ChartFoxTokenService(
        IHttpClientFactory httpClientFactory,
        ChartFoxOptions options,
        ILogger<ChartFoxTokenService> logger)
    {
        _http    = httpClientFactory.CreateClient("ChartFoxAuth");
        _options = options;
        _logger  = logger;
        LoadFromFile();
    }

    public async Task<string?> GetTokenAsync(CancellationToken ct)
    {
        if (_accessToken is null) return null;

        if (DateTimeOffset.UtcNow < _expiresAt.AddSeconds(-30))
            return _accessToken;

        if (_refreshToken is not null)
            return await RefreshAsync(ct);

        return null;
    }

    public (string Url, string State) BuildAuthorizationUrl()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
            throw new InvalidOperationException("ChartFox ClientId is not configured.");
        if (string.IsNullOrWhiteSpace(_options.CallbackUrl))
            throw new InvalidOperationException("ChartFox CallbackUrl is not configured.");

        var state     = GenerateRandom();
        var verifier  = GenerateRandom();
        var challenge = ComputeCodeChallenge(verifier);

        _pendingFlows[state] = verifier;

        var url = $"{AuthorizeUrl}"
                + $"?client_id={Uri.EscapeDataString(_options.ClientId)}"
                + $"&redirect_uri={Uri.EscapeDataString(_options.CallbackUrl)}"
                + $"&response_type=code"
                + $"&scope={Uri.EscapeDataString(Scopes)}"
                + $"&state={state}"
                + $"&code_challenge={challenge}"
                + $"&code_challenge_method=S256";

        return (url, state);
    }

    public async Task ExchangeCodeAsync(string code, string state, CancellationToken ct)
    {
        if (!_pendingFlows.TryRemove(state, out var verifier))
            throw new InvalidOperationException("Unknown or expired OAuth state.");

        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "authorization_code",
            ["code"]          = code,
            ["redirect_uri"]  = _options.CallbackUrl!,
            ["client_id"]     = _options.ClientId!,
            ["code_verifier"] = verifier,
        });

        var resp = await _http.PostAsync(TokenUrl, body, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);

        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogError("ChartFox token exchange failed {Status}: {Body}", resp.StatusCode, json);
            throw new InvalidOperationException($"Token exchange failed ({resp.StatusCode}).");
        }

        ApplyTokenResponse(JsonDocument.Parse(json).RootElement);
    }

    public void Disconnect()
    {
        _accessToken  = null;
        _refreshToken = null;
        _expiresAt    = DateTimeOffset.MinValue;
        if (File.Exists(TokenFilePath)) File.Delete(TokenFilePath);
        _logger.LogInformation("ChartFox token cleared");
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<string?> RefreshAsync(CancellationToken ct)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "refresh_token",
            ["refresh_token"] = _refreshToken!,
            ["client_id"]     = _options.ClientId ?? "",
        });

        var resp = await _http.PostAsync(TokenUrl, body, ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("ChartFox token refresh failed {Status} — clearing token", resp.StatusCode);
            Disconnect();
            return null;
        }

        var json = await resp.Content.ReadAsStringAsync(ct);
        ApplyTokenResponse(JsonDocument.Parse(json).RootElement);
        return _accessToken;
    }

    private void ApplyTokenResponse(JsonElement doc)
    {
        _accessToken  = doc.GetProperty("access_token").GetString();
        _expiresAt    = DateTimeOffset.UtcNow.AddSeconds(
            doc.TryGetProperty("expires_in", out var exp) ? exp.GetDouble() : 7200);
        if (doc.TryGetProperty("refresh_token", out var rt))
            _refreshToken = rt.GetString();

        SaveToFile();
        _logger.LogInformation("ChartFox token stored, expires {At}", _expiresAt);
    }

    private void SaveToFile()
    {
        try
        {
            var data = JsonSerializer.Serialize(new
            {
                access_token  = _accessToken,
                refresh_token = _refreshToken,
                expires_at    = _expiresAt.ToString("O"),
            });
            File.WriteAllText(TokenFilePath, data);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not persist ChartFox token to disk");
        }
    }

    private void LoadFromFile()
    {
        try
        {
            if (!File.Exists(TokenFilePath)) return;
            var doc = JsonDocument.Parse(File.ReadAllText(TokenFilePath)).RootElement;
            _accessToken  = doc.GetProperty("access_token").GetString();
            _refreshToken = doc.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
            _expiresAt    = DateTimeOffset.Parse(doc.GetProperty("expires_at").GetString()!);
            _logger.LogInformation("ChartFox token loaded from disk, expires {At}", _expiresAt);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load ChartFox token from disk");
        }
    }

    private static string GenerateRandom()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static string ComputeCodeChallenge(string verifier)
    {
        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(verifier));
        return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
