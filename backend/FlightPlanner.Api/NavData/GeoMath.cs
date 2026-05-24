namespace FlightPlanner.Api.NavData;

internal static class GeoMath
{
    private const double REarth = 3440.065; // Earth radius in nautical miles

    public static double HaversineNm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = Deg2Rad(lat2 - lat1);
        var dLon = Deg2Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(Deg2Rad(lat1)) * Math.Cos(Deg2Rad(lat2))
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return REarth * c;
    }

    public static double CrossTrackDistNm(
        double pLat, double pLon,
        double d1Lat, double d1Lon,
        double d2Lat, double d2Lon)
    {
        var d13 = HaversineNm(d1Lat, d1Lon, pLat, pLon);
        var theta13 = Deg2Rad(BearingDeg(d1Lat, d1Lon, pLat, pLon));
        var theta12 = Deg2Rad(BearingDeg(d1Lat, d1Lon, d2Lat, d2Lon));
        var dXt = Math.Asin(Math.Sin(d13 / REarth) * Math.Sin(theta13 - theta12)) * REarth;
        return Math.Abs(dXt);
    }

    public static double AlongTrackDistNm(
        double pLat, double pLon,
        double d1Lat, double d1Lon,
        double d2Lat, double d2Lon)
    {
        var d13 = HaversineNm(d1Lat, d1Lon, pLat, pLon);
        var dXt = CrossTrackDistNm(pLat, pLon, d1Lat, d1Lon, d2Lat, d2Lon);
        var cosXt = Math.Cos(dXt / REarth);
        if (Math.Abs(cosXt) < 1e-10) return 0;
        var dAt = Math.Acos(Math.Cos(d13 / REarth) / cosXt) * REarth;
        return dAt;
    }

    public static double BearingDeg(double lat1, double lon1, double lat2, double lon2)
    {
        var phi1 = Deg2Rad(lat1);
        var phi2 = Deg2Rad(lat2);
        var dLon = Deg2Rad(lon2 - lon1);
        var y = Math.Sin(dLon) * Math.Cos(phi2);
        var x = Math.Cos(phi1) * Math.Sin(phi2) - Math.Sin(phi1) * Math.Cos(phi2) * Math.Cos(dLon);
        return (Math.Atan2(y, x) * 180.0 / Math.PI + 360.0) % 360.0;
    }

    private static double Deg2Rad(double deg) => deg * Math.PI / 180.0;
}
