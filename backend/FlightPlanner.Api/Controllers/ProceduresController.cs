using Microsoft.AspNetCore.Mvc;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.NavData;

namespace FlightPlanner.Api.Controllers;

/// <summary>SID/STAR procedure data from the locally-imported CIFP database.</summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class ProceduresController : ControllerBase
{
    private static readonly string DbPath =
        Path.Combine(AppContext.BaseDirectory, "NavData", "procedures.sqlite");

    /// <summary>
    /// Returns SID and STAR procedures for the given airport ICAO code.
    /// Requires running the CIFP importer first:
    /// dotnet run --project FlightPlanner.Api -- import-cifp "&lt;cifp-dir&gt;"
    /// </summary>
    [HttpGet("{icao}")]
    [ProducesResponseType(typeof(ProceduresResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status503ServiceUnavailable)]
    public IActionResult GetProcedures(string icao)
    {
        if (!ProcedureDatabase.Exists(DbPath))
            return StatusCode(503, new ErrorResponse
            {
                Error   = "procedures_unavailable",
                Details = "Procedure database not found. Run: dotnet run --project FlightPlanner.Api -- import-cifp <cifp-dir>",
            });

        icao = icao.Trim().ToUpperInvariant();

        var entries = ProcedureDatabase.GetProcedures(DbPath, icao);

        var sids = entries
            .Where(e => e.Type == "SID")
            .Select(ToDto)
            .ToList();

        var stars = entries
            .Where(e => e.Type == "STAR")
            .Select(ToDto)
            .ToList();

        return Ok(new ProceduresResponse(sids, stars));
    }

    private static ProcedureDto ToDto(ProcedureEntry e) => new(
        e.Name,
        // Strip "RW" prefix so the frontend gets "07C" instead of "RW07C"
        e.Runway.StartsWith("RW", StringComparison.OrdinalIgnoreCase) ? e.Runway[2..] : e.Runway,
        e.Fixes.Select(f => new ProcFixDto(f.Ident, f.Lat, f.Lon)).ToList()
    );
}
