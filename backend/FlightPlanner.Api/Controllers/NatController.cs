using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// North Atlantic Tracks endpoint — GET /api/nat
///
/// Proxies the Gander Oceanic NAT API and returns current NAT track data
/// (track IDs, waypoint coordinates, flight levels, direction).
/// Results are cached server-side for 30 minutes.
///
/// No API key required. For flight simulation use only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class NatController : ControllerBase
{
    private readonly INatService _nat;
    private readonly ILogger<NatController> _logger;

    public NatController(INatService nat, ILogger<NatController> logger)
    {
        _nat    = nat;
        _logger = logger;
    }

    /// <summary>
    /// Returns current North Atlantic Track (NAT) data.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(NatResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetTracks(CancellationToken cancellationToken)
    {
        try
        {
            var result = await _nat.FetchTracksAsync(cancellationToken);
            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The NAT track request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch NAT tracks from Gander Oceanic");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "NAT track data unavailable.",
                Details = "Could not retrieve NAT tracks from Gander Oceanic. Try again later.",
            });
        }
    }
}
