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
    /// Returns service status and version.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        return Ok(new HealthResponse
        {
            Status  = "ok",
            Name    = "FlightPlanner Backend",
            Version = GetAssemblyVersion(),
        });
    }

    private static string GetAssemblyVersion()
    {
        var version = Assembly
            .GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
            ?? Assembly.GetExecutingAssembly().GetName().Version?.ToString()
            ?? "0.1.0";

        // Strip SourceLink commit hash suffix (e.g. "1.2.3+abc123").
        return version.Contains('+')
            ? version[..version.IndexOf('+')]
            : version;
    }
}
