using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// METAR proxy endpoint — GET /api/metar?icao=EDDF
///
/// Fetches METAR data server-side from AviationWeather and returns it as
/// plain text. Browsers cannot call AviationWeather directly due to missing
/// CORS headers; this backend proxy works around that restriction.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class MetarController : ControllerBase
{
    private static readonly Regex IcaoPattern = new(@"^[A-Z0-9]{4}$", RegexOptions.Compiled);

    private readonly IAviationWeatherService _aviationWeatherService;
    private readonly ILogger<MetarController> _logger;

    public MetarController(IAviationWeatherService aviationWeatherService, ILogger<MetarController> logger)
    {
        _aviationWeatherService = aviationWeatherService;
        _logger = logger;
    }

    /// <summary>
    /// Returns the raw METAR string for the given airport.
    /// </summary>
    /// <param name="icao">
    /// ICAO airport code — exactly 4 alphanumeric characters, e.g. EDDF.
    /// Case-insensitive; normalised to upper-case internally.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// 200 OK — raw METAR string (text/plain), e.g. "EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG"
    /// </returns>
    [HttpGet]
    [Produces("text/plain", "application/json")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetMetar(
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
            var metar = await _aviationWeatherService.FetchRawMetarAsync(normalizedIcao, cancellationToken);
            return Content(metar, "text/plain");
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.EmptyResponse)
        {
            return NotFound(new ErrorResponse
            {
                Error = "No METAR available.",
                Details = "No METAR is currently available for this airport.",
            });
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.Http)
        {
            _logger.LogWarning("Upstream error for METAR {Icao}: {Message}", normalizedIcao, ex.Message);
            return StatusCode(StatusCodes.Status502BadGateway, new ErrorResponse
            {
                Error = "Upstream error.",
                Details = ex.Message,
            });
        }
        catch (AviationWeatherException ex) when (ex.Kind == AviationWeatherErrorKind.Network)
        {
            _logger.LogError("Network error for METAR {Icao}: {Message}", normalizedIcao, ex.Message);
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
                Details = "The METAR request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error for METAR {Icao}", normalizedIcao);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
