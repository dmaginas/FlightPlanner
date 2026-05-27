using System.Globalization;
using Microsoft.Data.Sqlite;

namespace FlightPlanner.Api.NavData;

/// <summary>
/// Parses X-Plane CIFP .dat files and writes SID/STAR procedure legs
/// to a SQLite database at NavData/procedures.sqlite.
///
/// Run via: dotnet run --project FlightPlanner.Api -- import-cifp "&lt;cifp-dir&gt;"
/// </summary>
internal static class CifpImporter
{
    // ── Fix databases ─────────────────────────────────────────────────────────

    private static (
        Dictionary<(string ident, string region), (double lat, double lon)> byKey,
        Dictionary<string, (double lat, double lon)> byIdent)
        BuildFixDb(string fixFilePath)
    {
        var byKey   = new Dictionary<(string, string), (double, double)>(100_000);
        var byIdent = new Dictionary<string, (double, double)>(100_000);

        foreach (var line in File.ReadLines(fixFilePath))
        {
            if (line.Length < 10) continue;
            var fc = line[0];
            if (fc == 'I' || fc == '9') continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 3) continue;
            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon)) continue;

            var ident  = parts[2];
            // XP12 earth_fix.dat: "lat lon ident ENRT|AIRPORT region type name" (7 fields)
            // XP700 earth_fix.dat: "lat lon ident [region]" (3-4 fields)
            var region = parts.Length >= 7 ? parts[4]
                       : parts.Length >= 4  ? parts[3]
                       : string.Empty;
            byKey.TryAdd((ident, region), (lat, lon));
            byIdent.TryAdd(ident, (lat, lon));
        }
        return (byKey, byIdent);
    }

    private static (
        Dictionary<(string ident, string region), (double lat, double lon)> byKey,
        Dictionary<string, (double lat, double lon)> byIdent)
        BuildNavDb(string navFilePath)
    {
        var byKey   = new Dictionary<(string, string), (double, double)>(20_000);
        var byIdent = new Dictionary<string, (double, double)>(20_000);

        foreach (var line in File.ReadLines(navFilePath))
        {
            if (line.Length < 10) continue;
            var fc = line[0];
            if (fc == 'I' || fc == '9') continue;

            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 8) continue;
            if (!int.TryParse(parts[0], out var rowCode)) continue;
            if (rowCode != 2 && rowCode != 3) continue;

            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon)) continue;

            var ident = parts[7];
            // earth_nav.dat v700: no region code field; parts[8+] is the navaid name.
            // Use empty string as region key — CIFP region lookup falls through to byIdent.
            byKey.TryAdd((ident, string.Empty), (lat, lon));
            byIdent.TryAdd(ident, (lat, lon));
        }
        return (byKey, byIdent);
    }

    // ── Coordinate helpers ────────────────────────────────────────────────────

    // Parses X-Plane CIFP coordinate strings:
    //   N39363202  → N 39°36'32.02" → 39.6089°N
    //   E019543720 → E 19°54'37.20" → 19.9103°E
    private static double? ParseCifpCoord(ReadOnlySpan<char> s)
    {
        if (s.Length < 9) return null;
        var hem = s[0];
        if (hem != 'N' && hem != 'S' && hem != 'E' && hem != 'W') return null;

        var digits = s[1..];
        double dd;

        if (digits.Length == 8) // latitude: DDMMSShh
        {
            if (!int.TryParse(digits[..2], out var deg)) return null;
            if (!int.TryParse(digits[2..4], out var min)) return null;
            if (!int.TryParse(digits[4..],  out var secHundredths)) return null;
            dd = deg + min / 60.0 + secHundredths / 100.0 / 3600.0;
        }
        else if (digits.Length == 9) // longitude: DDDMMSShh
        {
            if (!int.TryParse(digits[..3], out var deg)) return null;
            if (!int.TryParse(digits[3..5], out var min)) return null;
            if (!int.TryParse(digits[5..],  out var secHundredths)) return null;
            dd = deg + min / 60.0 + secHundredths / 100.0 / 3600.0;
        }
        else return null;

        return (hem == 'S' || hem == 'W') ? -dd : dd;
    }

    // Great-circle point at (distNm, bearingDeg) from (lat, lon)
    private static (double lat, double lon) OffsetPosition(
        double lat, double lon, double bearingDeg, double distNm)
    {
        const double R = 3440.065; // Earth radius in NM
        var d    = distNm / R;
        var b    = bearingDeg * Math.PI / 180.0;
        var phi1 = lat * Math.PI / 180.0;
        var lam1 = lon * Math.PI / 180.0;
        var phi2 = Math.Asin(Math.Sin(phi1) * Math.Cos(d)
                           + Math.Cos(phi1) * Math.Sin(d) * Math.Cos(b));
        var lam2 = lam1 + Math.Atan2(Math.Sin(b) * Math.Sin(d) * Math.Cos(phi1),
                                      Math.Cos(d) - Math.Sin(phi1) * Math.Sin(phi2));
        return (phi2 * 180.0 / Math.PI, lam2 * 180.0 / Math.PI);
    }

    // ── CIFP record parsing ───────────────────────────────────────────────────

    private sealed record ProcLeg(
        string ProcType,    // SID or STAR
        int    RouteType,   // 1-6 (see grouping logic in ProcedureDatabase)
        string ProcName,
        string Transition,  // runway ID ("RW07C") or "" or "ALL" for common
        int    Seq,
        string FixIdent,
        string FixRegion,
        string FixSection,  // D=VOR, E=enroute, P=proc-fix, G=runway, B=NDB
        string PathTerm,    // IF, TF, CF, DF, etc.
        string RecNavId,    // reference navaid for P-type fixes
        string RecNavReg,
        int    Theta,       // bearing ×0.1° from rec navaid
        int    Rho);        // distance ×0.1 NM from rec navaid

    private static List<ProcLeg> ParseCifpLegs(string filePath)
    {
        var legs = new List<ProcLeg>(256);
        foreach (var line in File.ReadLines(filePath))
        {
            if (line.Length < 20) continue;

            string procType;
            int    colon;
            if      (line.StartsWith("SID:",  StringComparison.Ordinal)) { procType = "SID";  colon = 3; }
            else if (line.StartsWith("STAR:", StringComparison.Ordinal)) { procType = "STAR"; colon = 4; }
            else continue;

            var f = line[(colon + 1)..].Split(',');
            if (f.Length < 20) continue;
            if (!int.TryParse(f[0].Trim(), out var seq))       continue;
            if (!int.TryParse(f[1].Trim(), out var routeType)) continue;

            var procName   = f[2].Trim();
            var transition = f[3].Trim();
            var fixIdent   = f[4].Trim();
            if (string.IsNullOrEmpty(procName) || string.IsNullOrEmpty(fixIdent)) continue;

            var fixRegion  = f[5].Trim();
            var fixSection = f[6].Trim();
            var pathTerm   = f[11].Trim();
            var recNavId   = f[13].Trim();
            var recNavReg  = f.Length > 14 ? f[14].Trim() : string.Empty;

            int.TryParse(f[18].Trim(), out var theta);
            int.TryParse(f[19].Trim(), out var rho);

            legs.Add(new ProcLeg(procType, routeType, procName, transition, seq,
                fixIdent, fixRegion, fixSection, pathTerm, recNavId, recNavReg, theta, rho));
        }
        return legs;
    }

    private static Dictionary<string, (double lat, double lon)> ParseRwyRecords(string filePath)
    {
        var rwys = new Dictionary<string, (double, double)>(8, StringComparer.OrdinalIgnoreCase);
        foreach (var line in File.ReadLines(filePath))
        {
            if (!line.StartsWith("RWY:", StringComparison.Ordinal)) continue;

            // Format: RWY:RW16 ,…;N39363202,E019543720,1345;
            var semi = line.IndexOf(';');
            if (semi < 0) continue;
            var coordSpan = line.AsSpan()[(semi + 1)..];
            var c1 = coordSpan.IndexOf(',');
            if (c1 < 0) continue;
            var latStr = coordSpan[..c1].Trim();
            var rest   = coordSpan[(c1 + 1)..];
            var c2     = rest.IndexOf(',');
            var lonStr = c2 >= 0 ? rest[..c2].Trim() : rest.Trim();

            var lat = ParseCifpCoord(latStr);
            var lon = ParseCifpCoord(lonStr);
            if (lat is null || lon is null) continue;

            // "RWY:RW16 ,…" → take everything between "RWY:" and first ","
            var rwyId = line[4..].Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(rwyId))
                rwys[rwyId] = (lat.Value, lon.Value);
        }
        return rwys;
    }

    // ── Fix coordinate resolution ─────────────────────────────────────────────

    private static (double? lat, double? lon) ResolveFix(
        ProcLeg leg,
        Dictionary<(string, string), (double, double)> fixByKey,
        Dictionary<string,           (double, double)> fixByIdent,
        Dictionary<(string, string), (double, double)> navByKey,
        Dictionary<string,           (double, double)> navByIdent,
        Dictionary<string,           (double, double)> rwyDb)
    {
        (double lat, double lon) pos;

        switch (leg.FixSection.ToUpperInvariant())
        {
            case "E": // enroute fix → earth_fix.dat
                if (fixByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (fixByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                return (null, null);

            case "D": case "V": // VOR/DME → earth_nav.dat
                if (navByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (navByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                return (null, null);

            case "B": // NDB → earth_nav.dat
                if (navByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (navByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                return (null, null);

            case "P": // procedure fix — either theta/rho offset from navaid, or named fix in earth_fix.dat
                if (leg.Rho > 0 && !string.IsNullOrEmpty(leg.RecNavId))
                {
                    (double lat, double lon) navPos;
                    var foundNav = navByKey.TryGetValue((leg.RecNavId, leg.RecNavReg), out navPos)
                                || navByIdent.TryGetValue(leg.RecNavId, out navPos);
                    if (foundNav)
                        return OffsetPosition(navPos.lat, navPos.lon, leg.Theta / 10.0, leg.Rho / 10.0);
                }
                // No rho or navaid — look up as named fix in earth_fix / nav databases
                if (fixByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (navByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (fixByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                if (navByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                return (null, null);

            case "G": // runway threshold → RWY record
                if (rwyDb.TryGetValue(leg.FixIdent, out pos)) return pos;
                return (null, null);

            default: // unknown section — try both databases
                if (fixByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (navByKey.TryGetValue((leg.FixIdent, leg.FixRegion), out pos)) return pos;
                if (fixByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                if (navByIdent.TryGetValue(leg.FixIdent, out pos))                return pos;
                return (null, null);
        }
    }

    // ── Database creation ─────────────────────────────────────────────────────

    public static void ImportAll(
        string cifpDirectory, string fixFilePath, string navFilePath,
        string dbPath, Action<string> log)
    {
        log("Loading fix databases…");
        var (fixByKey, fixByIdent) = BuildFixDb(fixFilePath);
        var (navByKey, navByIdent) = BuildNavDb(navFilePath);
        log($"  {fixByKey.Count:N0} enroute fixes, {navByKey.Count:N0} navaids loaded");

        if (File.Exists(dbPath)) File.Delete(dbPath);

        using var conn = new SqliteConnection($"Data Source={dbPath}");
        conn.Open();

        using (var pragma = conn.CreateCommand())
        {
            pragma.CommandText = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";
            pragma.ExecuteNonQuery();
        }

        using (var ddl = conn.CreateCommand())
        {
            ddl.CommandText = """
                CREATE TABLE procedures (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    airport_icao TEXT    NOT NULL,
                    proc_type    TEXT    NOT NULL,
                    proc_name    TEXT    NOT NULL,
                    runway       TEXT    NOT NULL,
                    route_type   INTEGER NOT NULL,
                    seq          INTEGER NOT NULL,
                    fix_ident    TEXT    NOT NULL,
                    fix_lat      REAL,
                    fix_lon      REAL,
                    path_term    TEXT    NOT NULL
                );
                CREATE INDEX idx_proc_airport ON procedures(airport_icao);
                """;
            ddl.ExecuteNonQuery();
        }

        var files = Directory.GetFiles(cifpDirectory, "*.dat", SearchOption.TopDirectoryOnly);
        log($"Processing {files.Length:N0} CIFP files…");

        using var tx  = conn.BeginTransaction();
        using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            INSERT INTO procedures
                (airport_icao, proc_type, proc_name, runway, route_type, seq, fix_ident, fix_lat, fix_lon, path_term)
            VALUES
                ($icao, $type, $name, $rwy, $rt, $seq, $fix, $lat, $lon, $pt)
            """;

        var pIcao = cmd.Parameters.Add("$icao", SqliteType.Text);
        var pType = cmd.Parameters.Add("$type", SqliteType.Text);
        var pName = cmd.Parameters.Add("$name", SqliteType.Text);
        var pRwy  = cmd.Parameters.Add("$rwy",  SqliteType.Text);
        var pRt   = cmd.Parameters.Add("$rt",   SqliteType.Integer);
        var pSeq  = cmd.Parameters.Add("$seq",  SqliteType.Integer);
        var pFix  = cmd.Parameters.Add("$fix",  SqliteType.Text);
        var pLat  = cmd.Parameters.Add("$lat",  SqliteType.Real);
        var pLon  = cmd.Parameters.Add("$lon",  SqliteType.Real);
        var pPt   = cmd.Parameters.Add("$pt",   SqliteType.Text);

        int filesDone  = 0;
        int totalLegs  = 0;
        int resolvedLegs = 0;

        foreach (var filePath in files)
        {
            var icao = Path.GetFileNameWithoutExtension(filePath).ToUpperInvariant();
            try
            {
                var rwyDb = ParseRwyRecords(filePath);
                var legs  = ParseCifpLegs(filePath);

                foreach (var leg in legs)
                {
                    var (lat, lon) = ResolveFix(
                        leg, fixByKey, fixByIdent, navByKey, navByIdent, rwyDb);

                    pIcao.Value = icao;
                    pType.Value = leg.ProcType;
                    pName.Value = leg.ProcName;
                    pRwy.Value  = leg.Transition;
                    pRt.Value   = leg.RouteType;
                    pSeq.Value  = leg.Seq;
                    pFix.Value  = leg.FixIdent;
                    pLat.Value  = (object?)lat ?? DBNull.Value;
                    pLon.Value  = (object?)lon ?? DBNull.Value;
                    pPt.Value   = leg.PathTerm;
                    cmd.ExecuteNonQuery();

                    totalLegs++;
                    if (lat is not null) resolvedLegs++;
                }
            }
            catch (Exception ex)
            {
                log($"  Warning: {icao}: {ex.Message}");
            }

            filesDone++;
            if (filesDone % 1000 == 0)
                log($"  {filesDone:N0}/{files.Length:N0} files…");
        }

        tx.Commit();
        log($"Import complete: {filesDone:N0} airports, {totalLegs:N0} legs ({resolvedLegs:N0} with coordinates).");
    }
}
