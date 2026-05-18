using System.Net;
using System.Net.Http.Json;
using FlightPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc.Testing;

namespace FlightPlanner.Api.Tests.Controllers;

/// <summary>
/// Integrationstests für GET /api/health.
/// Verwendet WebApplicationFactory — kein echter externer Aufruf.
/// </summary>
public sealed class HealthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_Returns200Ok()
    {
        var response = await _client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetHealth_ReturnsStatusOk()
    {
        var response = await _client.GetFromJsonAsync<HealthResponse>("/api/health");
        Assert.NotNull(response);
        Assert.Equal("ok", response.Status);
    }

    [Fact]
    public async Task GetHealth_ReturnsCorrectName()
    {
        var response = await _client.GetFromJsonAsync<HealthResponse>("/api/health");
        Assert.NotNull(response);
        Assert.Equal("FlightPlanner Backend", response.Name);
    }

    [Fact]
    public async Task GetHealth_ReturnsVersionString()
    {
        var response = await _client.GetFromJsonAsync<HealthResponse>("/api/health");
        Assert.NotNull(response);
        Assert.False(string.IsNullOrWhiteSpace(response.Version));
        // Muss semantische Versionierung enthalten (z. B. "0.1.0")
        Assert.Matches(@"^\d+\.\d+\.\d+", response.Version);
    }

    [Fact]
    public async Task GetHealth_ReturnsJsonContentType()
    {
        var response = await _client.GetAsync("/api/health");
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Contains("application/json", response.Content.Headers.ContentType.MediaType);
    }
}
