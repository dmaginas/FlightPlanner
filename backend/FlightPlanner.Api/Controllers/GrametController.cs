using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// GRAMET cross-section endpoint — POST /api/gramet
///
/// Accepts a list of route waypoints and returns pressure-level weather data
/// (temperature, wind, cloud cover) for each waypoint fetched from Open Meteo.
/// Designed for GRAMET-style vertical cross-section visualisation.
///
/// No API key required. For flight simulation use only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class GrametController : ControllerBase
{
    private const int MaxWaypoints = 15;

    private readonly IGrametService _gramet;
    private readonly ILogger<GrametController> _logger;

    public GrametController(IGrametService gramet, ILogger<GrametController> logger)
    {
        _gramet = gramet;
        _logger = logger;
    }

    /// <summary>
    /// Returns GRAMET weather cross-section data for the given route waypoints.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(GrametResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetGramet(
        [FromBody] GrametRequest request,
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

        foreach (var wp in request.Waypoints)
        {
            if (wp.Lat is < -90 or > 90 || wp.Lon is < -180 or > 180)
                return BadRequest(new ErrorResponse
                {
                    Error   = $"Invalid coordinates for waypoint '{wp.Id}'.",
                    Details = "Latitude must be in [-90, 90], longitude in [-180, 180].",
                });
        }

        try
        {
            var result = await _gramet.FetchGrametAsync(request.Waypoints, cancellationToken);
            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The GRAMET request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in GRAMET endpoint");
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error   = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
