using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.NavData;
using FlightPlanner.Api.Services;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// IFR Route Lookup — GET /api/routes
///
/// Proxies route requests to the Flight Plan Database API, caches results
/// server-side (default 30 min), and maps the response into a stable
/// frontend-facing DTO.
///
/// When FPD is unavailable or has no API key, falls back to local AIRAC 2012
/// navdata routing (earth_awy.dat) if departure/destination coordinates are supplied.
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
    private readonly INavDataService _navDataService;
    private readonly ILogger<RoutesController> _logger;

    public RoutesController(
        IFlightPlanDatabaseService fpdService,
        INavDataService navDataService,
        ILogger<RoutesController> logger)
    {
        _fpdService = fpdService;
        _navDataService = navDataService;
        _logger = logger;
    }

    /// <summary>
    /// Searches for IFR flight plans between two airports.
    /// Returns the best match as selectedRoute plus up to 4 alternatives.
    /// Falls back to local AIRAC 2012 navdata routing when coordinates are provided
    /// and the external Flight Plan Database is unavailable.
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
    /// <param name="departureLat">Departure airport latitude (decimal degrees). Required for navdata fallback.</param>
    /// <param name="departureLon">Departure airport longitude (decimal degrees). Required for navdata fallback.</param>
    /// <param name="destinationLat">Destination airport latitude (decimal degrees). Required for navdata fallback.</param>
    /// <param name="destinationLon">Destination airport longitude (decimal degrees). Required for navdata fallback.</param>
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
        [FromQuery] double? departureLat,
        [FromQuery] double? departureLon,
        [FromQuery] double? destinationLat,
        [FromQuery] double? destinationLon,
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
        FpdErrorKind? fpdFailKind = null;

        try
        {
            var result = await _fpdService.SearchRoutesAsync(dep, arr, cancellationToken);
            return Ok(MapToResponse(result, dep, arr, aircraftType, cruisingAltitude));
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.ConfigurationMissing)
        {
            fpdFailKind = ex.Kind;
            _logger.LogInformation("FPD key not configured — trying navdata for {Dep}→{Arr}", dep, arr);
        }
        catch (FlightPlanDatabaseException ex) when (ex.Kind == FpdErrorKind.NoResults)
        {
            fpdFailKind = ex.Kind;
            _logger.LogInformation("FPD no results for {Dep}→{Arr} — trying navdata fallback", dep, arr);
        }
        catch (FlightPlanDatabaseException ex)
        {
            fpdFailKind = ex.Kind;
            _logger.LogWarning("FPD error ({Kind}) for {Dep}→{Arr} — trying navdata fallback", ex.Kind, dep, arr);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Request cancelled.",
                Details = "The route request was cancelled.",
            });
        }

        // ── NavData fallback ──────────────────────────────────────────────────
        if (_navDataService.IsAvailable
            && departureLat.HasValue && departureLon.HasValue
            && destinationLat.HasValue && destinationLon.HasValue)
        {
            var waypoints = _navDataService.FindRoute(
                dep, departureLat.Value, departureLon.Value,
                arr, destinationLat.Value, destinationLon.Value);

            if (waypoints is { Count: >= 2 })
            {
                var routeText = string.Join(" ", waypoints
                    .Where(w => w.Type != "airport")
                    .Select(w => w.Id));
                var distNm = CalculateTotalDistNm(waypoints);
                var warning = fpdFailKind == FpdErrorKind.ConfigurationMissing
                    ? "Flight Plan Database API key not configured. Route calculated from AIRAC 2012 navdata."
                    : "External route database unavailable. Route calculated from AIRAC 2012 navdata.";

                return Ok(new RouteResponse
                {
                    SelectedRoute = new SelectedRouteDto
                    {
                        Departure        = dep,
                        Destination      = arr,
                        AircraftType     = aircraftType,
                        CruisingAltitude = cruisingAltitude,
                        RouteType        = "IFR",
                        RouteText        = routeText,
                        Waypoints        = waypoints,
                        DistanceNm       = distNm,
                        Source           = "navdata-airac2012",
                    },
                    Alternatives = [],
                    Warning      = warning,
                });
            }

            _logger.LogWarning("Navdata routing also failed for {Dep}→{Arr}", dep, arr);
        }

        // ── Both FPD and NavData failed — return error ────────────────────────
        return fpdFailKind switch
        {
            FpdErrorKind.ConfigurationMissing => StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "configuration_error",
                Details = "The Flight Plan Database API key is not configured. " +
                          "Navdata routing also failed (coordinates not provided or routing error). " +
                          "Please configure the API key.",
            }),
            FpdErrorKind.NoResults => NotFound(new ErrorResponse
            {
                Error   = "No routes found.",
                Details = $"No IFR routes found between {dep} and {arr}.",
            }),
            _ => StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse
            {
                Error   = "Service unavailable.",
                Details = "Route calculation failed. Please try again later.",
            }),
        };
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

    private static double CalculateTotalDistNm(IReadOnlyList<WaypointDto> wps)
    {
        double total = 0;
        for (var i = 1; i < wps.Count; i++)
        {
            var p = wps[i - 1]; var c = wps[i];
            if (p.Lat.HasValue && p.Lon.HasValue && c.Lat.HasValue && c.Lon.HasValue)
                total += GeoMath.HaversineNm(p.Lat.Value, p.Lon.Value, c.Lat.Value, c.Lon.Value);
        }
        return Math.Round(total);
    }
}
