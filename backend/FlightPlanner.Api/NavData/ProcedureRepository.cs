namespace FlightPlanner.Api.NavData;

public sealed class ProcedureRepository : IProcedureRepository
{
    private static readonly string DbPath =
        Path.Combine(AppContext.BaseDirectory, "NavData", "procedures.sqlite");

    public bool IsAvailable => ProcedureDatabase.Exists(DbPath);

    public IReadOnlyList<ProcedureEntry> GetProcedures(string icao) =>
        ProcedureDatabase.GetProcedures(DbPath, icao);
}
