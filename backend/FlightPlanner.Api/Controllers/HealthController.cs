using Microsoft.AspNetCore.Mvc;
using System.Reflection;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Options;

namespace FlightPlanner.Api.Controllers;

/// <summary>
/// Health-check endpoint — GET /api/health
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class HealthController : ControllerBase
{
    private readonly FlightPlanDatabaseOptions _fpdOptions;
    private readonly ChartFoxOptions           _chartFoxOptions;

    public HealthController(FlightPlanDatabaseOptions fpdOptions, ChartFoxOptions chartFoxOptions)
    {
        _fpdOptions      = fpdOptions;
        _chartFoxOptions = chartFoxOptions;
    }

    /// <summary>
    /// Returns service status, version, and API key configuration status.
    /// </summary>
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

        bool fpdConfigured      = !string.IsNullOrWhiteSpace(_fpdOptions.ApiKey);
        bool chartFoxConfigured = !string.IsNullOrWhiteSpace(_chartFoxOptions.ApiKey);

        var apiServices = new List<ApiServiceStatus>
        {
            new()
            {
                Key        = "aviation_weather",
                Name       = "AviationWeather.gov",
                Status     = "no_key_required",
                Note       = "METAR & TAF — no API key required",
                KeyRequired = false,
            },
            new()
            {
                Key        = "open_meteo",
                Name       = "Open-Meteo",
                Status     = "no_key_required",
                Note       = "GRAMET pressure-level weather — no API key required",
                KeyRequired = false,
            },
            new()
            {
                Key        = "flight_plan_database",
                Name       = "Flight Plan Database",
                Status     = fpdConfigured ? "ok" : "not_configured",
                Note       = fpdConfigured
                    ? "IFR routes — API key configured"
                    : "IFR routes — set via: dotnet user-secrets set \"FlightPlanDatabase:ApiKey\" \"YOUR_KEY\"",
                KeyRequired = true,
            },
            new()
            {
                Key        = "openaip",
                Name       = "OpenAIP",
                Status     = "no_key_required",
                Note       = "Airport search — API key configured in frontend (.env)",
                KeyRequired = false,
            },
            new()
            {
                Key        = "our_airports",
                Name       = "OurAirports",
                Status     = "no_key_required",
                Note       = "Airport diagrams & ATC frequencies — no API key required",
                KeyRequired = false,
            },
            new()
            {
                Key        = "faa_charts",
                Name       = "FAA d-TPP Charts",
                Status     = "no_key_required",
                Note       = "US airport charts (approach, SID, STAR, taxi) — no API key required",
                KeyRequired = false,
            },
            new()
            {
                Key        = "chartfox",
                Name       = "ChartFox",
                Status     = chartFoxConfigured ? "ok" : "not_configured",
                Note       = chartFoxConfigured
                    ? "Worldwide airport charts — API key configured"
                    : "Worldwide airport charts — apply at chartfox.org, then: dotnet user-secrets set \"ChartFox:ApiKey\" \"YOUR_KEY\"",
                KeyRequired = true,
            },
        };

        return Ok(new HealthResponse
        {
            Status      = "ok",
            Name        = "FlightPlanner Backend",
            Version     = cleanVersion,
            ApiServices = apiServices,
        });
    }
}
