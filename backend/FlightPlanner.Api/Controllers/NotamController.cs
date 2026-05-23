using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// NOTAM-Endpunkt — GET /api/notam?icao=EDDF
///
/// Ruft aktive NOTAMs von der FAA NOTAM API ab und gibt sie als JSON zurück.
/// Erfordert FaaNotam:ApiKey in der Server-Konfiguration (user secrets).
/// Kostenlose Registrierung: https://api.faa.gov/
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class NotamController : ControllerBase
{
    private static readonly Regex IcaoPattern = new(@"^[A-Z0-9]{4}$", RegexOptions.Compiled);

    private readonly INotamService _notamService;
    private readonly ILogger<NotamController> _logger;

    public NotamController(INotamService notamService, ILogger<NotamController> logger)
    {
        _notamService = notamService;
        _logger = logger;
    }

    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(NotamResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> GetNotams(
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
            var result = await _notamService.FetchNotamsAsync(normalizedIcao, cancellationToken);

            var response = new NotamResponse
            {
                Total = result.Total,
                Notams = result.Notams.Select(n => new NotamDto
                {
                    Id             = n.Id,
                    Number         = n.Number,
                    Text           = n.Text,
                    EffectiveStart = n.EffectiveStart,
                    EffectiveEnd   = n.EffectiveEnd,
                    Classification = n.Classification,
                }).ToList(),
            };

            return Ok(response);
        }
        catch (NotamException ex) when (ex.Kind == NotamErrorKind.ConfigurationMissing)
        {
            _logger.LogWarning("NOTAM API-Key fehlt: {Message}", ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "configuration_error",
                Details = ex.Message,
            });
        }
        catch (NotamException ex) when (ex.Kind == NotamErrorKind.Http)
        {
            _logger.LogWarning("NOTAM upstream HTTP error für {Icao}: {Message}", normalizedIcao, ex.Message);
            return StatusCode(StatusCodes.Status502BadGateway, new ErrorResponse
            {
                Error   = "Upstream error.",
                Details = "FAA NOTAM API hat einen Fehler zurückgegeben. Bitte später erneut versuchen.",
            });
        }
        catch (NotamException ex) when (ex.Kind == NotamErrorKind.Network)
        {
            _logger.LogError("NOTAM Netzwerkfehler für {Icao}: {Message}", normalizedIcao, ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Service unavailable.",
                Details = "FAA NOTAM API ist nicht erreichbar. Bitte später erneut versuchen.",
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error = "Request cancelled.",
                Details = "The NOTAM request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unerwarteter Fehler NOTAM {Icao}", normalizedIcao);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error = "Internal server error.",
                Details = "An unexpected error occurred.",
            });
        }
    }
}
