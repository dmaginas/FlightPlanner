using FlightPlanner.Api.Models;
using FlightPlanner.Api.NavData;

namespace FlightPlanner.Api.Services;

/// <summary>
/// Encapsulates the full route-resolution pipeline:
///   1. Flight Plan Database (external API)
///   2. Local AIRAC navdata fallback (airway routing)
///   3. Direct-route fallback
///   4. NAT track application for transatlantic routes
/// </summary>
public sealed class RouteOrchestrationService : IRouteOrchestrationService
{
    private readonly IFlightPlanDatabaseService       _fpdService;
    private readonly IRouteNavDataService             _navDataService;
    private readonly INatService                      _natService;
    private readonly ILogger<RouteOrchestrationService> _logger;

    public RouteOrchestrationService(
        IFlightPlanDatabaseService fpdService,
        IRouteNavDataService navDataService,
        INatService natService,
        ILogger<RouteOrchestrationService> logger)
    {
        _fpdService     = fpdService;
        _navDataService = navDataService;
        _natService     = natService;
        _logger         = logger;
    }

    public async Task<RouteOrchestrationResult> ResolveRouteAsync(
        RouteOrchestrationRequest request,
        CancellationToken ct)
    {
        var dep = request.Departure;
        var arr = request.Destination;

        // ── FPD call ──────────────────────────────────────────────────────────
        FpdErrorKind?  fpdFailKind = null;
        RouteResponse? response    = null;

        try
        {
            var result = await _fpdService.SearchRoutesAsync(dep, arr, ct);
            response = MapToResponse(result, dep, arr, request.AircraftType, request.CruisingAltitude);
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
            throw;
        }

        // ── NavData fallback ──────────────────────────────────────────────────
        if (response is null
            && _navDataService.IsAvailable
            && request.DepartureLat.HasValue && request.DepartureLon.HasValue
            && request.DestinationLat.HasValue && request.DestinationLon.HasValue)
        {
            var waypoints = _navDataService.FindRoute(
                dep, request.DepartureLat.Value, request.DepartureLon.Value,
                arr, request.DestinationLat.Value, request.DestinationLon.Value);

            if (waypoints is { Count: >= 2 })
            {
                var routeText = string.Join(" ", waypoints
                    .Where(w => w.Type != "airport").Select(w => w.Id));
                var warning = fpdFailKind == FpdErrorKind.ConfigurationMissing
                    ? "Flight Plan Database API key not configured. Route calculated from AIRAC 2012 navdata."
                    : "External route database unavailable. Route calculated from AIRAC 2012 navdata.";

                response = new RouteResponse
                {
                    SelectedRoute = new SelectedRouteDto
                    {
                        Departure        = dep,
                        Destination      = arr,
                        AircraftType     = request.AircraftType,
                        CruisingAltitude = request.CruisingAltitude,
                        RouteType        = "IFR",
                        RouteText        = routeText,
                        Waypoints        = waypoints,
                        DistanceNm       = CalculateTotalDistNm(waypoints),
                        Source           = "navdata-airac2012",
                    },
                    Alternatives = [],
                    Warning      = warning,
                };
            }
            else
            {
                _logger.LogWarning("Navdata routing also failed for {Dep}→{Arr}", dep, arr);
            }
        }

        // ── Direct-route fallback ─────────────────────────────────────────────
        if (response is null
            && request.DepartureLat.HasValue && request.DepartureLon.HasValue
            && request.DestinationLat.HasValue && request.DestinationLon.HasValue)
        {
            var directWps = new List<WaypointDto>
            {
                new() { Id = dep, Lat = request.DepartureLat.Value, Lon = request.DepartureLon.Value, Type = "airport" },
                new() { Id = arr, Lat = request.DestinationLat.Value, Lon = request.DestinationLon.Value, Type = "airport" },
            };
            _logger.LogInformation("Returning direct route for {Dep}→{Arr}", dep, arr);
            response = new RouteResponse
            {
                SelectedRoute = new SelectedRouteDto
                {
                    Departure        = dep,
                    Destination      = arr,
                    AircraftType     = request.AircraftType,
                    CruisingAltitude = request.CruisingAltitude,
                    RouteType        = "IFR",
                    RouteText        = "DCT",
                    Waypoints        = directWps,
                    DistanceNm       = CalculateTotalDistNm(directWps),
                    Source           = "navdata-airac2012",
                },
                Alternatives = [],
                Warning      = "No airway route found for this city pair. Showing direct route — consider selecting SID/STAR manually.",
            };
        }

        // ── Apply NAT track for transatlantic routes ───────────────────────────
        if (response is not null)
        {
            response = await ApplyNatIfNeededAsync(
                response, request.DepartureLon, request.DestinationLon,
                request.CruisingAltitude, ct);
            return new RouteOrchestrationResult(response, false, null);
        }

        // ── No coordinates + FPD config error ─────────────────────────────────
        if (fpdFailKind == FpdErrorKind.ConfigurationMissing)
            return new RouteOrchestrationResult(
                null,
                IsConfigError: true,
                "The Flight Plan Database API key is not configured on this server.");

        return new RouteOrchestrationResult(null, false, null);
    }

    // ── NAT integration ────────────────────────────────────────────────────────

    private async Task<RouteResponse> ApplyNatIfNeededAsync(
        RouteResponse response,
        double? depLon,
        double? arrLon,
        int? cruisingAltFt,
        CancellationToken ct)
    {
        if (response.SelectedRoute is null) return response;
        if (!NatIntegration.IsTransatlantic(depLon, arrLon)) return response;

        try
        {
            var natResult = await _natService.FetchTracksAsync(ct);
            var (natWps, natId, natDist) = NatIntegration.ApplyNatTrack(
                response.SelectedRoute.Waypoints,
                depLon!.Value, arrLon!.Value,
                cruisingAltFt,
                natResult.Tracks);

            if (natId is null) return response;

            _logger.LogInformation(
                "Applied NAT {Track} to {Dep}→{Arr} ({Nm:F0} NM)",
                natId, response.SelectedRoute.Departure, response.SelectedRoute.Destination, natDist);

            return new RouteResponse
            {
                SelectedRoute = new SelectedRouteDto
                {
                    Id               = response.SelectedRoute.Id,
                    Departure        = response.SelectedRoute.Departure,
                    Destination      = response.SelectedRoute.Destination,
                    AircraftType     = response.SelectedRoute.AircraftType,
                    CruisingAltitude = response.SelectedRoute.CruisingAltitude,
                    RouteType        = response.SelectedRoute.RouteType,
                    RouteText        = response.SelectedRoute.RouteText,
                    Waypoints        = natWps,
                    DistanceNm       = natDist,
                    Source           = response.SelectedRoute.Source,
                    NatTrackId       = natId,
                },
                Alternatives = response.Alternatives,
                Warning      = response.Warning,
            };
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "NAT track application failed — returning route without NAT");
            return response;
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

        var routeText = plan.Notes?.Trim();
        if (string.IsNullOrWhiteSpace(routeText))
        {
            var innerIdents = plan.Nodes
                .Where(n => !n.Type.Equals("APT", StringComparison.OrdinalIgnoreCase))
                .Select(n => n.Ident)
                .Where(id => !string.IsNullOrWhiteSpace(id));
            routeText = string.Join(" ", innerIdents);
        }

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
            Id               = plan.Id.ToString(),
            Departure        = departure,
            Destination      = destination,
            AircraftType     = aircraftType,
            CruisingAltitude = cruisingAltitude,
            RouteType        = "IFR",
            RouteText        = routeText,
            Waypoints        = waypoints,
            DistanceNm       = plan.DistanceNm,
            Source           = "flight-plan-database",
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
