using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Winds aloft endpoint — POST /api/winds
///
/// Fetches wind speed and direction from Open Meteo at the pressure level
/// closest to the requested cruise altitude, then computes the average
/// headwind component along the route.
///
/// No API key required. For flight simulation use only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class WindsController : ControllerBase
{
    private const int MaxWaypoints = 50;

    private readonly IWindsService           _winds;
    private readonly ILogger<WindsController> _logger;

    public WindsController(IWindsService winds, ILogger<WindsController> logger)
    {
        _winds  = winds;
        _logger = logger;
    }

    /// <summary>Returns en-route wind data at cruise altitude for the supplied waypoints.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(WindsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetWinds(
        [FromBody] WindsRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Waypoints.Count == 0)
            return BadRequest(new ErrorResponse
            {
                Error   = "No waypoints provided.",
                Details = "Supply at least one waypoint.",
            });

        if (request.Waypoints.Count > MaxWaypoints)
            return BadRequest(new ErrorResponse
            {
                Error   = $"Too many waypoints (max {MaxWaypoints}).",
                Details = $"Reduce the waypoint list to at most {MaxWaypoints} entries.",
            });

        if (request.AltitudeFt is < 1_000 or > 60_000)
            return BadRequest(new ErrorResponse
            {
                Error   = "altitudeFt out of range.",
                Details = "altitudeFt must be between 1000 and 60000.",
            });

        try
        {
            var result = await _winds.FetchWindsAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The winds request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in winds endpoint");
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error   = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
