namespace FlightPlanner.Api.NavData;

public interface IProcedureRepository
{
    bool IsAvailable { get; }
    IReadOnlyList<ProcedureEntry> GetProcedures(string icao);
}
