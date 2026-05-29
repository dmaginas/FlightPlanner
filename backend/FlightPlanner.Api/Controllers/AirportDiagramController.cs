using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Airport diagram endpoint — GET /api/airport/{icao}/diagram
///
/// Returns runway data (threshold coordinates, length, width, surface) sourced
/// from the OurAirports public dataset.  Data is cached 24 h server-side.
/// </summary>
[ApiController]
[Route("api/airport")]
public sealed class AirportDiagramController : ControllerBase
{
    private readonly IAirportDiagramService _service;
    private readonly ILogger<AirportDiagramController> _logger;

    public AirportDiagramController(
        IAirportDiagramService service,
        ILogger<AirportDiagramController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Returns runway data for the given ICAO airport code.
    /// </summary>
    [HttpGet("{icao}/diagram")]
    [ProducesResponseType(typeof(AirportDiagramResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetDiagram(
        string icao,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(icao) || icao.Length is < 3 or > 5)
            return BadRequest(new ErrorResponse { Error = "Invalid ICAO code.", Details = "Supply a 3–5 character ICAO code." });

        try
        {
            var result = await _service.GetDiagramAsync(icao, cancellationToken);

            if (result is null)
                return NotFound(new ErrorResponse
                {
                    Error   = $"Airport '{icao.ToUpperInvariant()}' not found.",
                    Details = "No runway data available for this airport.",
                });

            return Ok(result);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error = "Request cancelled.", Details = "The diagram request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load airport diagram for {Icao}", icao);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Airport data temporarily unavailable.",
                Details = "Could not load runway data from OurAirports.",
            });
        }
    }
}
