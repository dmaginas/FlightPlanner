using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// SIGMET / AIRMET endpoint — GET /api/sigmets
///
/// Proxies the AviationWeather.gov airsigmet feed and filters results by
/// the bounding box of the given route (departure + arrival coords, plus a
/// 5° buffer). Results are cached for 5 minutes.
///
/// No API key required. For flight simulation use only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class SigmetController : ControllerBase
{
    private readonly ISigmetService           _sigmets;
    private readonly ILogger<SigmetController> _logger;

    public SigmetController(ISigmetService sigmets, ILogger<SigmetController> logger)
    {
        _sigmets = sigmets;
        _logger  = logger;
    }

    /// <summary>Returns active SIGMETs and AIRMETs within the route bounding box (+ 5° buffer).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SigmetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse),  StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse),  StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetSigmets(
        [FromQuery] double? depLat,
        [FromQuery] double? depLon,
        [FromQuery] double? arrLat,
        [FromQuery] double? arrLon,
        CancellationToken cancellationToken)
    {
        if (depLat is null || depLon is null || arrLat is null || arrLon is null)
            return BadRequest(new ErrorResponse
            {
                Error   = "Missing coordinates.",
                Details = "depLat, depLon, arrLat, and arrLon are required.",
            });

        var minLat = Math.Min(depLat.Value, arrLat.Value);
        var maxLat = Math.Max(depLat.Value, arrLat.Value);
        var minLon = Math.Min(depLon.Value, arrLon.Value);
        var maxLon = Math.Max(depLon.Value, arrLon.Value);

        try
        {
            var result = await _sigmets.FetchSigmetsAsync(minLat, minLon, maxLat, maxLon, cancellationToken);
            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The SigMet request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in sigmets endpoint");
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error   = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
