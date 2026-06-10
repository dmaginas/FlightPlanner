using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FlightPlanner.Api.Options;
using Microsoft.AspNetCore.DataProtection;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Manages ChartFox OAuth tokens per browser session (a <c>cf_session</c> cookie),
/// not globally — so each user links their own ChartFox account, as ChartFox requires.
/// Tokens are persisted encrypted at rest via the ASP.NET Core Data Protection API.
/// </summary>
public sealed class ChartFoxTokenService : IChartFoxTokenService
{
    private const string AuthorizeUrl      = "https://api.chartfox.org/oauth/authorize";
    private const string TokenUrl          = "https://api.chartfox.org/oauth/token";
    private const string Scopes            = "charts:index charts:view charts:files";
    private const string SessionCookieName = "cf_session";

    private static readonly string TokenFilePath = Path.Combine(
        AppContext.BaseDirectory, "chartfox_tokens.dat");

    private readonly HttpClient            _http;
    private readonly ChartFoxOptions       _options;
    private readonly IHttpContextAccessor  _httpContext;
    private readonly IDataProtector        _protector;
    private readonly ILogger<ChartFoxTokenService> _logger;

    // sessionId → token set
    private readonly ConcurrentDictionary<string, TokenSet> _tokens = new();
    // OAuth state → in-flight flow (PKCE verifier + the session it belongs to)
    private readonly ConcurrentDictionary<string, PendingFlow> _pendingFlows = new();

    public ChartFoxTokenService(
        IHttpClientFactory httpClientFactory,
        ChartFoxOptions options,
        IHttpContextAccessor httpContext,
        IDataProtectionProvider dataProtection,
        ILogger<ChartFoxTokenService> logger)
    {
        _http        = httpClientFactory.CreateClient("ChartFoxAuth");
        _options     = options;
        _httpContext = httpContext;
        _protector   = dataProtection.CreateProtector("ChartFox.Tokens.v1");
        _logger      = logger;
        LoadFromFile();
    }

    public bool IsAuthenticated
    {
        get
        {
            var sessionId = GetSessionId();
            return sessionId is not null && _tokens.ContainsKey(sessionId);
        }
    }

    public async Task<string?> GetTokenAsync(CancellationToken ct)
    {
        var sessionId = GetSessionId();
        if (sessionId is null || !_tokens.TryGetValue(sessionId, out var token))
            return null;

        if (DateTimeOffset.UtcNow < token.ExpiresAt.AddSeconds(-30))
            return token.AccessToken;

        if (token.RefreshToken is not null)
            return await RefreshAsync(sessionId, token.RefreshToken, ct);

        return null;
    }

    public (string Url, string State) BuildAuthorizationUrl()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
            throw new InvalidOperationException("ChartFox ClientId is not configured.");
        if (string.IsNullOrWhiteSpace(_options.CallbackUrl))
            throw new InvalidOperationException("ChartFox CallbackUrl is not configured.");

        var sessionId = EnsureSessionId();
        var state     = GenerateRandom();
        var verifier  = GenerateRandom();
        var challenge = ComputeCodeChallenge(verifier);

        _pendingFlows[state] = new PendingFlow(verifier, sessionId);

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
        if (!_pendingFlows.TryRemove(state, out var flow))
            throw new InvalidOperationException("Unknown or expired OAuth state.");

        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "authorization_code",
            ["code"]          = code,
            ["redirect_uri"]  = _options.CallbackUrl!,
            ["client_id"]     = _options.ClientId!,
            ["code_verifier"] = flow.Verifier,
        });

        var resp = await _http.PostAsync(TokenUrl, body, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);

        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogError("ChartFox token exchange failed {Status}: {Body}", resp.StatusCode, json);
            throw new InvalidOperationException($"Token exchange failed ({resp.StatusCode}).");
        }

        ApplyTokenResponse(flow.SessionId, JsonDocument.Parse(json).RootElement);
    }

    public void Disconnect()
    {
        var sessionId = GetSessionId();
        if (sessionId is not null && _tokens.TryRemove(sessionId, out _))
        {
            SaveToFile();
            _logger.LogInformation("ChartFox token cleared for session");
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<string?> RefreshAsync(string sessionId, string refreshToken, CancellationToken ct)
    {
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"]    = "refresh_token",
            ["refresh_token"] = refreshToken,
            ["client_id"]     = _options.ClientId ?? "",
        });

        var resp = await _http.PostAsync(TokenUrl, body, ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("ChartFox token refresh failed {Status} — clearing session token", resp.StatusCode);
            if (_tokens.TryRemove(sessionId, out _)) SaveToFile();
            return null;
        }

        var json = await resp.Content.ReadAsStringAsync(ct);
        ApplyTokenResponse(sessionId, JsonDocument.Parse(json).RootElement);
        return _tokens.TryGetValue(sessionId, out var token) ? token.AccessToken : null;
    }

    private void ApplyTokenResponse(string sessionId, JsonElement doc)
    {
        var accessToken  = doc.GetProperty("access_token").GetString();
        if (accessToken is null) return;

        var expiresAt    = DateTimeOffset.UtcNow.AddSeconds(
            doc.TryGetProperty("expires_in", out var exp) ? exp.GetDouble() : 7200);
        var refreshToken = doc.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;

        _tokens[sessionId] = new TokenSet(accessToken, refreshToken, expiresAt);
        SaveToFile();
        _logger.LogInformation("ChartFox token stored for session, expires {At}", expiresAt);
    }

    private string? GetSessionId() =>
        _httpContext.HttpContext?.Request.Cookies[SessionCookieName];

    private string EnsureSessionId()
    {
        var context = _httpContext.HttpContext
            ?? throw new InvalidOperationException("No HTTP context for ChartFox authentication.");

        var existing = context.Request.Cookies[SessionCookieName];
        if (!string.IsNullOrEmpty(existing)) return existing;

        var sessionId = GenerateRandom();
        context.Response.Cookies.Append(SessionCookieName, sessionId, new CookieOptions
        {
            HttpOnly = true,
            // Lax so the cookie rides along on the top-level OAuth callback redirect.
            SameSite = SameSiteMode.Lax,
            // Not marked Secure: the dev proxy and the prod TLS-terminating nginx both
            // talk plain HTTP to this backend, so a Secure cookie would be dropped.
            // Transport is still encrypted browser-side (HTTPS) in production.
            Secure   = false,
            MaxAge   = TimeSpan.FromDays(90),
            Path     = "/",
        });
        return sessionId;
    }

    private void SaveToFile()
    {
        try
        {
            var snapshot = new Dictionary<string, TokenSet>(_tokens);
            var plaintext = JsonSerializer.Serialize(snapshot);
            File.WriteAllText(TokenFilePath, _protector.Protect(plaintext));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not persist ChartFox tokens to disk");
        }
    }

    private void LoadFromFile()
    {
        try
        {
            if (!File.Exists(TokenFilePath)) return;
            var plaintext = _protector.Unprotect(File.ReadAllText(TokenFilePath));
            var loaded = JsonSerializer.Deserialize<Dictionary<string, TokenSet>>(plaintext);
            if (loaded is null) return;
            foreach (var (sessionId, token) in loaded)
                _tokens[sessionId] = token;
            _logger.LogInformation("ChartFox tokens loaded from disk ({Count} sessions)", _tokens.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load ChartFox tokens from disk");
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

    private sealed record TokenSet(string AccessToken, string? RefreshToken, DateTimeOffset ExpiresAt);
    private sealed record PendingFlow(string Verifier, string SessionId);
}
