using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Airport charts endpoints — GET /api/airport/{icao}/charts[/...]
///
/// Chart list uses FAA d-TPP for US airports (no key required) and falls back
/// to ChartFox for international airports (Bearer token required).
/// Chart files are proxied through the backend to avoid CORS restrictions.
/// </summary>
[ApiController]
[Route("api/airport")]
public sealed class ChartsController : ControllerBase
{
    private readonly IChartService                _service;
    private readonly ILogger<ChartsController>    _logger;

    public ChartsController(IChartService service, ILogger<ChartsController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Returns available charts for the given airport.
    /// US airports are sourced from FAA d-TPP; all others from ChartFox.
    /// </summary>
    [HttpGet("{icao}/charts")]
    [ProducesResponseType(typeof(ChartListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCharts(string icao, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(icao) || icao.Length is < 3 or > 5)
            return BadRequest(new ErrorResponse
            {
                Error   = "Invalid ICAO code.",
                Details = "Supply a 3–5 character ICAO code.",
            });

        try
        {
            var charts = await _service.GetChartsAsync(icao, ct);
            return Ok(new ChartListResponse(icao.ToUpperInvariant(), charts));
        }
        catch (OperationCanceledException) { return StatusCode(499); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chart list failed for {Icao}", icao);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Chart data temporarily unavailable.",
                Details = ex.Message,
            });
        }
    }

    /// <summary>
    /// Proxies the chart PDF from FAA or ChartFox to avoid browser CORS restrictions.
    /// </summary>
    [HttpGet("{icao}/charts/{source}/{id}/file")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetChartFile(
        string icao, string source, string id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new ErrorResponse { Error = "Missing chart id.", Details = "" });

        if (source is not ("faa" or "chartfox"))
            return BadRequest(new ErrorResponse
            {
                Error   = "Invalid source.",
                Details = "Source must be 'faa' or 'chartfox'.",
            });

        try
        {
            var (stream, contentType) = await _service.GetChartFileAsync(source, id, ct);
            Response.Headers.Append("Content-Disposition", "inline");
            return File(stream, contentType);
        }
        catch (OperationCanceledException) { return StatusCode(499); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chart file failed: source={Source} id={Id}", source, id);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Chart file temporarily unavailable.",
                Details = ex.Message,
            });
        }
    }
}
