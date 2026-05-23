using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Health-check endpoint — GET /api/health
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class HealthController : ControllerBase
{
    /// <summary>
    /// Returns the service status, name, and version of the backend.
    /// </summary>
    /// <returns>200 OK with status, name, and version.</returns>
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
