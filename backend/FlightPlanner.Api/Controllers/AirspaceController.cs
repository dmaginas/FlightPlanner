using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// FIR/UIR boundary GeoJSON — GET /api/airspaces/boundaries
///
/// Proxies the VATSIM vatspy-data-project Boundaries.geojson file and caches it
/// for 24 hours. The response is a standard GeoJSON FeatureCollection where each
/// feature represents one FIR boundary polygon with a properties.id field
/// containing the ICAO FIR identifier (e.g. "EGTT", "EDGG").
///
/// No API key required. For flight simulation use only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class AirspaceController : ControllerBase
{
    private readonly IAirspaceService            _airspace;
    private readonly ILogger<AirspaceController> _logger;

    public AirspaceController(IAirspaceService airspace, ILogger<AirspaceController> logger)
    {
        _airspace = airspace;
        _logger   = logger;
    }

    /// <summary>Returns worldwide FIR/UIR boundaries as a GeoJSON FeatureCollection.</summary>
    [HttpGet("boundaries")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetBoundaries(CancellationToken cancellationToken)
    {
        try
        {
            var json = await _airspace.GetBoundariesGeoJsonAsync(cancellationToken);
            return Content(json, "application/json");
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error = "Request cancelled.", Details = "The airspace request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Airspace boundaries endpoint failed");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "FIR/UIR data unavailable.",
                Details = "Could not fetch boundary data from upstream source. Try again later.",
            });
        }
    }
}
