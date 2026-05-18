using System.Net;
using System.Net.Http.Json;
using FlightPlanner.Api.Models;
using FlightPlanner.Api.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace FlightPlanner.Api.Tests.Controllers;

/// <summary>
/// Integrationstests für GET /api/metar.
///
/// AviationWeather wird durch Moq gemockt — es finden keine echten externen Netzwerkaufrufe statt.
/// METAR-Daten werden nur in Tests gemockt, nie im Produktivcode.
/// </summary>
public sealed class MetarControllerTests
{
    private static WebApplicationFactory<Program> CreateFactory(
        Mock<IAviationWeatherService> mockService)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Echten AviationWeatherService durch Mock ersetzen
                services.AddSingleton(mockService.Object);
            });
        });
    }

    // ── ICAO-Validierung ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetMetar_WithoutIcao_Returns400()
    {
        var mock = new Mock<IAviationWeatherService>();
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetMetar_WithoutIcao_ReturnsErrorJson()
    {
        var mock = new Mock<IAviationWeatherService>();
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar");
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();

        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Error));
        Assert.False(string.IsNullOrWhiteSpace(error.Details));
    }

    [Theory]
    [InlineData("EDD")]       // zu kurz
    [InlineData("EDDFX")]    // zu lang
    [InlineData("ED-F")]     // Sonderzeichen
    [InlineData("")]          // leer
    [InlineData("   ")]       // nur Whitespace
    public async Task GetMetar_WithInvalidIcao_Returns400(string icao)
    {
        var mock = new Mock<IAviationWeatherService>();
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/metar?icao={Uri.EscapeDataString(icao)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Erfolgreicher Abruf ─────────────────────────────────────────────────

    [Fact]
    public async Task GetMetar_WithValidIcao_Returns200()
    {
        const string ExpectedMetar = "EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG";
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()))
            .ReturnsAsync(ExpectedMetar);
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=EDDF");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(ExpectedMetar, body);
    }

    [Fact]
    public async Task GetMetar_Returns_PlainTextContentType()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("EDDF 181120Z AUTO 00000KT");
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=EDDF");

        Assert.Contains("text/plain", response.Content.Headers.ContentType?.MediaType ?? "");
    }

    [Fact]
    public async Task GetMetar_NormalizesLowercaseIcao()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()))
            .ReturnsAsync("EDDF 181120Z AUTO");
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=eddf");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        // Bestätigt: normalisierter ICAO-Code (Großbuchstaben) wurde genutzt
        mock.Verify(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMetar_TrimsWhitespaceFromIcao()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()))
            .ReturnsAsync("EDDF 181120Z AUTO");
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=%20EDDF%20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        mock.Verify(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMetar_AcceptsAlphanumericIcao()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync("K1L0", It.IsAny<CancellationToken>()))
            .ReturnsAsync("K1L0 181120Z AUTO 00000KT");
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=K1L0");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Fehlerszenarien ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetMetar_WhenEmptyResponse_Returns404()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "Für diesen Flughafen ist aktuell kein METAR verfügbar."));
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=XXXX");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Error));
        Assert.False(string.IsNullOrWhiteSpace(error.Details));
    }

    [Fact]
    public async Task GetMetar_WhenHttpError_Returns502()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AviationWeatherException(
                AviationWeatherErrorKind.Http,
                "AviationWeather hat HTTP 500 zurückgegeben.", 500));
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=EDDF");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task GetMetar_WhenNetworkError_Returns503()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AviationWeatherException(
                AviationWeatherErrorKind.Network,
                "AviationWeather ist nicht erreichbar."));
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=EDDF");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task GetMetar_ErrorResponse_HasErrorAndDetailsFields()
    {
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AviationWeatherException(
                AviationWeatherErrorKind.EmptyResponse,
                "Keine METAR-Daten."));
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/metar?icao=EDDF");
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();

        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Error));
        Assert.False(string.IsNullOrWhiteSpace(error.Details));
    }

    // ── Kein echter AviationWeather-Aufruf ─────────────────────────────────

    [Fact]
    public async Task GetMetar_NoRealExternalCallsMade()
    {
        // Dieser Test stellt sicher, dass der Mock verwendet wird und kein echter
        // HTTP-Request zu AviationWeather ausgeführt wird.
        var mock = new Mock<IAviationWeatherService>();
        mock.Setup(s => s.FetchRawMetarAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("EDDF 181120Z AUTO MOCKED");
        using var factory = CreateFactory(mock);
        var client = factory.CreateClient();

        await client.GetAsync("/api/metar?icao=EDDF");

        // Verifiziert: genau ein Aufruf über Mock, keiner über echten HttpClient
        mock.Verify(s => s.FetchRawMetarAsync("EDDF", It.IsAny<CancellationToken>()), Times.Once);
    }
}
