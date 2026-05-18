using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Health-Check-Endpunkt — GET /api/health
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class HealthController : ControllerBase
{
    /// <summary>
    /// Gibt den Servicestatus, den Namen und die Version des Backends zurück.
    /// </summary>
    /// <returns>200 OK mit Status, Name und Version.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        var version = Assembly
            .GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
            ?? Assembly.GetExecutingAssembly().GetName().Version?.ToString()
            ?? "0.1.0";

        // Entferne ggf. Build-Metadata (z. B. "+abc123") aus InformationalVersion
        var cleanVersion = version.Contains('+')
            ? version[..version.IndexOf('+')]
            : version;

        return Ok(new HealthResponse
        {
            Status = "ok",
            Name = "FlightPlanner Backend",
            Version = cleanVersion,
        });
    }
}
