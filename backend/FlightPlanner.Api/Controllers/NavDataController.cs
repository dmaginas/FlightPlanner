using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// NavData map layer API — GET /api/navdata
///
/// Returns VORs, NDBs, fixes, and airway segments within a geographic bounding box.
/// Data source: X-Plane AIRAC 2012.08 (earth_nav.dat + earth_awy.dat).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class NavDataController : ControllerBase
{
    private readonly INavDataService _navDataService;

    public NavDataController(INavDataService navDataService)
    {
        _navDataService = navDataService;
    }

    /// <summary>
    /// Returns navaid and airway data within the given bounding box.
    /// </summary>
    /// <param name="swLat">South-west corner latitude.</param>
    /// <param name="swLon">South-west corner longitude.</param>
    /// <param name="neLat">North-east corner latitude.</param>
    /// <param name="neLon">North-east corner longitude.</param>
    /// <param name="types">Comma-separated list of layer types: vor, ndb, fix, airway. Defaults to all.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(NavDataBboxResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public IActionResult GetNavData(
        [FromQuery] double? swLat,
        [FromQuery] double? swLon,
        [FromQuery] double? neLat,
        [FromQuery] double? neLon,
        [FromQuery] string? types)
    {
        if (swLat is null || swLon is null || neLat is null || neLon is null)
        {
            return BadRequest(new ErrorResponse
            {
                Error   = "Missing bbox parameters.",
                Details = "swLat, swLon, neLat, and neLon are required.",
            });
        }

        if (!_navDataService.IsAvailable)
            return Ok(new NavDataBboxResult());

        var typeSet = (types ?? "vor,ndb,fix,airway")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToLowerInvariant())
            .ToHashSet();

        var result = _navDataService.QueryBbox(swLat.Value, swLon.Value, neLat.Value, neLon.Value, typeSet);
        return Ok(result);
    }
}
