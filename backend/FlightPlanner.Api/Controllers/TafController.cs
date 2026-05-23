using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// TAF-Proxy-Endpunkt — GET /api/taf?icao=EDDF
///
/// Ruft TAF-Daten serverseitig von AviationWeather ab und liefert sie
/// als rohen Text zurück (CORS-Proxy-Muster, identisch mit MetarController).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class TafController : ControllerBase
{
    private static readonly Regex IcaoPattern = new(@"^[A-Z0-9]{4}$", RegexOptions.Compiled);

    private readonly IAviationWeatherService _aviationWeatherService;
    private readonly ILogger<TafController> _logger;

    public TafController(IAviationWeatherService aviationWeatherService, ILogger<TafController> logger)
    {
        _aviationWeatherService = aviationWeatherService;
        _logger = logger;
    }

    [HttpGet]
    [Produces("text/plain", "application/json")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetTaf(
        [FromQuery] string? icao,
        CancellationToken cancellationToken)
    {
        var normalizedIcao = icao?.Trim().ToUpperInvariant();

        if (string.IsNullOrEmpty(normalizedIcao) || !IcaoPattern.IsMatch(normalizedIcao))
        {
            return BadRequest(new ErrorResponse
            {
                Error = "Invalid ICAO code.",
                Details = "ICAO must be exactly 4 alphanumeric characters (e.g. EDDF).",
            });
        }

        try
        {
            var taf = await _aviationWeatherService.FetchRawTafAsync(normalizedIcao, cancellationToken);
            return Content(taf, "text/plain");
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.EmptyResponse)
        {
            return NotFound(new ErrorResponse
            {
                Error = "No TAF available.",
                Details = "No TAF is currently available for this airport.",
            });
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.Http)
        {
            _logger.LogWarning("Upstream-Fehler TAF für {Icao}: {Message}", normalizedIcao, ex.Message);
            return StatusCode(StatusCodes.Status502BadGateway, new ErrorResponse
            {
                Error = "Upstream error.",
                Details = ex.Message,
            });
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.Network)
        {
            _logger.LogError("Netzwerkfehler TAF für {Icao}: {Message}", normalizedIcao, ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error = "Service unavailable.",
                Details = ex.Message,
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error = "Request cancelled.",
                Details = "The TAF request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unerwarteter Fehler TAF {Icao}", normalizedIcao);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
