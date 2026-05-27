using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.NavData;

/// <summary>
/// Splices the waypoints of a current North Atlantic Track (NAT) into a
/// transatlantic route, replacing any existing oceanic fixes.
/// </summary>
public static class NatIntegration
{
    // MNPS airspace approximation
    private const double NatLonW       = -62;
    private const double NatLonE       =  -8;
    private const double NatLatS       =  40;
    private const double NatLatN       =  75;
    private const double OceanicGapNm  = 300;

    public static bool IsTransatlantic(double? depLon, double? arrLon)
    {
        if (depLon is null || arrLon is null) return false;
        static bool InAmericas(double l) => l is >= -100 and <= -20;
        static bool InEurope(double l)   => l is >= -20  and <=  40;
        return (InAmericas(depLon.Value) && InEurope(arrLon.Value))
            || (InEurope(depLon.Value)   && InAmericas(arrLon.Value));
    }

    /// <summary>
    /// Selects the best NAT track for the route direction and altitude, splices
    /// its waypoints into the waypoint list, and returns the new list together
    /// with the applied track ID and recalculated distance.
    /// Returns the original list unchanged when no suitable track is found.
    /// </summary>
    public static (IReadOnlyList<WaypointDto> Waypoints, string? NatTrackId, double DistanceNm)
        ApplyNatTrack(
            IReadOnlyList<WaypointDto> waypoints,
            double depLon,
            double arrLon,
            int? cruisingAltFt,
            IReadOnlyList<NatTrack> tracks)
    {
        var direction = (depLon >= -100 && depLon <= -20) ? "east" : "west";
        var track     = SelectBestTrack(tracks, direction, cruisingAltFt);

        if (track is null || track.Route.Count < 2)
            return (waypoints, null, CalculateDistNm(waypoints));

        var natWps  = BuildNatWaypoints(track);
        var spliced = SpliceNatWaypoints(waypoints, natWps);
        var distNm  = CalculateDistNm(spliced);

        return (spliced, track.Id, distNm);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static NatTrack? SelectBestTrack(
        IReadOnlyList<NatTrack> tracks, string direction, int? altFt)
    {
        var candidates = tracks
            .Where(t => direction == "east" ? t.IsEastbound : !t.IsEastbound)
            .ToList();

        if (candidates.Count == 0) return null;

        if (altFt.HasValue)
        {
            var fl = altFt.Value / 100;
            var byFl = candidates.FirstOrDefault(t =>
                t.FlightLevels.Any(f => int.TryParse(f, out var n) && n == fl));
            if (byFl is not null) return byFl;
        }

        return candidates[0];
    }

    private static bool IsInNatArea(double? lat, double? lon) =>
        lat is >= NatLatS and <= NatLatN && lon is >= NatLonW and <= NatLonE;

    private static IReadOnlyList<WaypointDto> SpliceNatWaypoints(
        IReadOnlyList<WaypointDto> waypoints,
        List<WaypointDto> natWps)
    {
        var result   = new List<WaypointDto>(waypoints.Count + natWps.Count);
        bool inserted = false;

        foreach (var w in waypoints)
        {
            if (w.Type != "airport" && IsInNatArea(w.Lat, w.Lon))
            {
                // Replace first oceanic fix with NAT waypoints; skip any further oceanic fixes
                if (!inserted) { result.AddRange(natWps); inserted = true; }
            }
            else
            {
                result.Add(w);
            }
        }

        // No existing oceanic fixes — insert at the largest gap (direct transatlantic)
        if (!inserted)
        {
            double maxGap      = 0;
            int    insertAfter = -1;
            for (int i = 0; i < result.Count - 1; i++)
            {
                var a = result[i]; var b = result[i + 1];
                if (a.Lat is not null && a.Lon is not null &&
                    b.Lat is not null && b.Lon is not null)
                {
                    var d = GeoMath.HaversineNm(a.Lat.Value, a.Lon.Value, b.Lat.Value, b.Lon.Value);
                    if (d > maxGap) { maxGap = d; insertAfter = i; }
                }
            }
            if (insertAfter >= 0 && maxGap >= OceanicGapNm)
                result.InsertRange(insertAfter + 1, natWps);
        }

        return result;
    }

    private static List<WaypointDto> BuildNatWaypoints(NatTrack track) =>
        track.Route.Select(p => new WaypointDto
        {
            Id     = NatPointId(p),
            Lat    = p.Latitude,
            Lon    = p.Longitude,
            Type   = "fix",
            Airway = $"NAT{track.Id}",
        }).ToList();

    private static string NatPointId(NatPoint p)
    {
        if (!string.IsNullOrWhiteSpace(p.Name)) return p.Name.Trim();
        var latDir = p.Latitude  >= 0 ? 'N' : 'S';
        var lonDir = p.Longitude >= 0 ? 'E' : 'W';
        return $"{Math.Abs((int)Math.Round(p.Latitude))}{latDir}" +
               $"{Math.Abs((int)Math.Round(p.Longitude))}{lonDir}";
    }

    private static double CalculateDistNm(IReadOnlyList<WaypointDto> wps)
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
