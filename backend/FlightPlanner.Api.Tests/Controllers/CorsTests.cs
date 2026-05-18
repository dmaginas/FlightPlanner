using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace FlightPlanner.Api.Tests.Controllers;

/// <summary>
/// Tests für CORS-Konfiguration.
/// Prüft, dass Access-Control-Allow-Origin nur für erlaubte Origins gesetzt wird.
/// </summary>
public sealed class CorsTests
{
    [Fact]
    public async Task HealthEndpoint_AllowedOrigin_HasCorsHeader()
    {
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Cors:AllowedOrigins:0"] = "http://localhost:5173",
                });
            });
        });
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", "http://localhost:5173");

        var response = await client.GetAsync("/api/health");

        Assert.True(
            response.Headers.Contains("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Origin sollte für erlaubten Origin gesetzt sein");
        Assert.Equal("http://localhost:5173",
            response.Headers.GetValues("Access-Control-Allow-Origin").FirstOrDefault());
    }

    [Fact]
    public async Task HealthEndpoint_DisallowedOrigin_HasNoCorsHeader()
    {
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Cors:AllowedOrigins:0"] = "http://localhost:5173",
                });
            });
        });
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("Origin", "http://evil.example.com");

        var response = await client.GetAsync("/api/health");

        Assert.False(
            response.Headers.Contains("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Origin darf nicht für nicht-erlaubte Origins gesetzt sein");
    }
}
