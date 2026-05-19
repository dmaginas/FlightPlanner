using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// IFR Route Lookup — GET /api/routes
///
/// Proxies route requests to the Flight Plan Database API, caches results
/// server-side (default 30 min), and maps the response into a stable
/// frontend-facing DTO.
///
/// The Flight Plan Database API key is read from server configuration only
/// and is never forwarded to or exposed in the frontend.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class RoutesController : ControllerBase
{
    private static readonly Regex IcaoPattern = new(@"^[A-Z0-9]{4}$", RegexOptions.Compiled);

    private readonly IFlightPlanDatabaseService _fpdService;
    private readonly ILogger<RoutesController> _logger;

    public RoutesController(IFlightPlanDatabaseService fpdService, ILogger<RoutesController> logger)
    {
        _fpdService = fpdService;
        _logger = logger;
    }

    /// <summary>
    /// Searches for IFR flight plans between two airports.
    /// Returns the best match as selectedRoute plus up to 4 alternatives.
    /// </summary>
    /// <param name="departure">Departure airport ICAO code (e.g. EDDF).</param>
    /// <param name="destination">Destination airport ICAO code (e.g. EGLL).</param>
    /// <param name="aircraftType">
    /// ICAO aircraft type code (e.g. A320). Accepted for enrichment and future use;
    /// not forwarded to the FPD API (not supported as a query parameter there).
    /// </param>
    /// <param name="cruisingAltitude">
    /// Requested cruising altitude in feet (e.g. 35000). Accepted for enrichment;
    /// not forwarded to the FPD API.
    /// </param>
    /// <param name="routeType">Currently only "IFR" is supported.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpGet]
    [Produces("application/json")]
    [ProducesResponseType(typeof(RouteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> GetRoutes(
        [FromQuery] string? departure,
        [FromQuery] string? destination,
        [FromQuery] string? aircraftType,
        [FromQuery] int? cruisingAltitude,
        [FromQuery] string? routeType,
        CancellationToken cancellationToken)
    {
        // ── Validate ICAO codes ──────────────────────────────────────────────
        var dep = departure?.Trim().ToUpperInvariant();
        var arr = destination?.Trim().ToUpperInvariant();

        if (string.IsNullOrEmpty(dep) || !IcaoPattern.IsMatch(dep))
        {
            return BadRequest(new ErrorResponse
            {
                Error   = "Invalid departure ICAO.",
                Details = "departure must be exactly 4 alphanumeric characters (e.g. EDDF).",
            });
        }

        if (string.IsNullOrEmpty(arr) || !IcaoPattern.IsMatch(arr))
        {
            return BadRequest(new ErrorResponse
            {
                Error   = "Invalid destination ICAO.",
                Details = "destination must be exactly 4 alphanumeric characters (e.g. EGLL).",
            });
        }

        if (dep == arr)
        {
            return BadRequest(new ErrorResponse
            {
                Error   = "departure and destination must be different airports.",
                Details = "departure and destination cannot be the same ICAO code.",
            });
        }

        // ── Route type validation (IFR only for now) ─────────────────────────
        var rType = (routeType ?? "IFR").ToUpperInvariant();
        if (rType != "IFR")
        {
            return BadRequest(new ErrorResponse
            {
                Error   = "Unsupported route type.",
                Details = "Only routeType=IFR is currently supported.",
            });
        }

        // ── Call FPD service ──────────────────────────────────────────────────
        try
        {
            var result = await _fpdService.SearchRoutesAsync(dep, arr, cancellationToken);
            var response = MapToResponse(result, dep, arr, aircraftType, cruisingAltitude);
            return Ok(response);
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.ConfigurationMissing)
        {
            _logger.LogError("FPD configuration error: {Message}", ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "configuration_error",
                Details = "The Flight Plan Database API key is not configured on this server. " +
                          "Please contact your system administrator.",
            });
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.NoResults)
        {
            _logger.LogInformation("FPD no results for {Dep}-{Arr}: {Message}", dep, arr, ex.Message);
            return NotFound(new ErrorResponse
            {
                Error   = "No routes found.",
                Details = ex.Message,
            });
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.Http)
        {
            _logger.LogWarning("FPD upstream HTTP error for {Dep}-{Arr}: {Message}", dep, arr, ex.Message);
            return StatusCode(StatusCodes.Status502BadGateway, new ErrorResponse
            {
                Error   = "Upstream error.",
                Details = "The Flight Plan Database returned an error. Please try again later.",
            });
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.Network)
        {
            _logger.LogError("FPD network error for {Dep}-{Arr}: {Message}", dep, arr, ex.Message);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Service unavailable.",
                Details = "Unable to reach the Flight Plan Database. Please try again later.",
            });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The route request was cancelled.",
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error for route {Dep}-{Arr}", dep, arr);
            return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
            {
                Error   = "Internal server error.",
                Details = "An unexpected error occurred while looking up the route.",
            });
        }
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────

    private static RouteResponse MapToResponse(
        FpdRouteResult result,
        string departure,
        string destination,
        string? aircraftType,
        int? cruisingAltitude)
    {
        var plan = result.Selected!;

        // Build route text from waypoint idents (excluding airports at start/end)
        var routeText = plan.Notes?.Trim();
        if (string.IsNullOrWhiteSpace(routeText))
        {
            var innerIdents = plan.Nodes
                .Where(n => !n.Type.Equals("APT", StringComparison.OrdinalIgnoreCase))
                .Select(n => n.Ident)
                .Where(id => !string.IsNullOrWhiteSpace(id));
            routeText = string.Join(" ", innerIdents);
        }

        // Altitude string from maxAltitude field
        var altString = plan.MaxAltitude > 0
            ? $"FL{plan.MaxAltitude / 100}"
            : (cruisingAltitude.HasValue ? $"FL{cruisingAltitude / 100}" : "IFR");

        var waypoints = plan.Nodes.Select(n => new WaypointDto
        {
            Id   = n.Ident,
            Name = n.Name,
            Lat  = n.Lat,
            Lon  = n.Lon,
            Type = NormaliseNodeType(n.Type),
        }).ToList();

        var selected = new SelectedRouteDto
        {
            Id              = plan.Id.ToString(),
            Departure       = departure,
            Destination     = destination,
            AircraftType    = aircraftType,
            CruisingAltitude= cruisingAltitude,
            RouteType       = "IFR",
            RouteText       = routeText,
            Waypoints       = waypoints,
            DistanceNm      = plan.DistanceNm,
            Source          = "flight-plan-database",
        };

        var alternatives = result.Alternatives.Select(a => new AlternativeRouteDto
        {
            Id         = a.Id.ToString(),
            RouteText  = a.Notes?.Trim(),
            DistanceNm = a.DistanceNm,
            UpdatedAt  = a.UpdatedAt,
            Popularity = a.Popularity,
        }).ToList();

        return new RouteResponse
        {
            SelectedRoute = selected,
            Alternatives  = alternatives,
        };
    }

    private static string NormaliseNodeType(string fpdType) => fpdType.ToUpperInvariant() switch
    {
        "APT" => "airport",
        "FIX" => "fix",
        "VOR" => "vor",
        "NDB" => "ndb",
        _     => "fix",
    };
}
