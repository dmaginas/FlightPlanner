using Microsoft.Data.Sqlite;

namespace FlightPlanner.Api.NavData;

internal sealed record ProcFix(string Ident, double? Lat, double? Lon);

internal sealed record ProcedureEntry(
    string Type,    // "SID" or "STAR"
    string Name,
    string Runway,  // runway ID stripped of "RW" prefix by caller, or ""
    IReadOnlyList<ProcFix> Fixes);

internal static class ProcedureDatabase
{
    public static bool Exists(string dbPath) => File.Exists(dbPath);

    public static IReadOnlyList<ProcedureEntry> GetProcedures(string dbPath, string icao)
    {
        var legs = new List<(string type, string name, string rwy, int rt, int seq,
                              string fix, double? lat, double? lon)>(256);

        using var conn = new SqliteConnection($"Data Source={dbPath};Mode=ReadOnly");
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT proc_type, proc_name, runway, route_type, seq, fix_ident, fix_lat, fix_lon
            FROM   procedures
            WHERE  airport_icao = $icao
            ORDER  BY proc_type, proc_name, route_type, seq
            """;
        cmd.Parameters.AddWithValue("$icao", icao.ToUpperInvariant());

        using var rdr = cmd.ExecuteReader();
        while (rdr.Read())
        {
            legs.Add((
                rdr.GetString(0), rdr.GetString(1), rdr.GetString(2),
                rdr.GetInt32(3),  rdr.GetInt32(4),  rdr.GetString(5),
                rdr.IsDBNull(6) ? null : rdr.GetDouble(6),
                rdr.IsDBNull(7) ? null : rdr.GetDouble(7)
            ));
        }

        return GroupProcedures(legs);
    }

    // A leg belongs to a specific runway when the transition field starts with "RW".
    // "" and "ALL" mean the leg is part of the shared/common segment.
    // Named transitions (e.g. "BALTU") are also treated as common for display purposes.
    private static bool IsRunwayTransition(string runway) =>
        runway.StartsWith("RW", StringComparison.OrdinalIgnoreCase);

    private static IReadOnlyList<ProcedureEntry> GroupProcedures(
        List<(string type, string name, string rwy, int rt, int seq,
              string fix, double? lat, double? lon)> legs)
    {
        var result = new List<ProcedureEntry>();

        foreach (var group in legs.GroupBy(l => (l.type, l.name))
                                  .OrderBy(g => g.Key.type).ThenBy(g => g.Key.name))
        {
            var (procType, procName) = group.Key;

            var rwyLegs = group.Where(l =>  IsRunwayTransition(l.rwy)).ToList();
            var comLegs = group.Where(l => !IsRunwayTransition(l.rwy))
                               .OrderBy(l => l.seq)
                               .Select(l => new ProcFix(l.fix, l.lat, l.lon))
                               .ToList();

            var runways = rwyLegs.Select(l => l.rwy)
                                 .Where(r => !string.IsNullOrEmpty(r))
                                 .Distinct()
                                 .OrderBy(r => r)
                                 .ToList();

            if (runways.Count == 0)
            {
                if (comLegs.Count > 0)
                    result.Add(new ProcedureEntry(procType, procName, string.Empty, comLegs));
                continue;
            }

            foreach (var runway in runways)
            {
                var specific = rwyLegs.Where(l => l.rwy == runway)
                                      .OrderBy(l => l.seq)
                                      .Select(l => new ProcFix(l.fix, l.lat, l.lon))
                                      .ToList();

                IReadOnlyList<ProcFix> fixes = procType == "SID"
                    ? [.. specific, .. comLegs]   // SID: runway legs first, then common
                    : [.. comLegs,  .. specific];  // STAR: common first, then runway legs

                if (fixes.Count > 0)
                    result.Add(new ProcedureEntry(procType, procName, runway, fixes));
            }
        }

        return result;
    }
}
