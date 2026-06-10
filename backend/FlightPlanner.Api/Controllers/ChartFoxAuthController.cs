using FlightPlanner.Api.Options;
using FlightPlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FlightPlanner.Api.Controllers;

[ApiController]
[Route("api/chartfox")]
public sealed class ChartFoxAuthController : ControllerBase
{
    private readonly IChartFoxTokenService _tokens;
    private readonly ChartFoxOptions       _options;

    public ChartFoxAuthController(IChartFoxTokenService tokens, ChartFoxOptions options)
    {
        _tokens  = tokens;
        _options = options;
    }

    [HttpGet("status")]
    public IActionResult GetStatus() =>
        Ok(new
        {
            connected  = _tokens.IsAuthenticated,
            configured = !string.IsNullOrWhiteSpace(_options.ClientId),
        });

    [HttpGet("auth-url")]
    public IActionResult GetAuthUrl()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
            return StatusCode(503, "ChartFox ClientId not configured.");

        try
        {
            var (url, _) = _tokens.BuildAuthorizationUrl();
            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, ex.Message);
        }
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(error))
            return Redirect("/?chartfox=error");

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect("/?chartfox=error");

        try
        {
            await _tokens.ExchangeCodeAsync(code, state, ct);
            return Redirect("/?chartfox=connected");
        }
        catch
        {
            return Redirect("/?chartfox=error");
        }
    }

    [HttpPost("disconnect")]
    public IActionResult Disconnect()
    {
        _tokens.Disconnect();
        return Ok();
    }
}
