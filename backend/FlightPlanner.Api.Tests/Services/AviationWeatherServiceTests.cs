using System.Net;
using FlightPlanner.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace FlightPlanner.Api.Tests.Services;

/// <summary>
/// Unit-Tests für AviationWeatherService.
/// Verwendet einen Fake-HttpMessageHandler — kein echter Netzwerkaufruf.
/// </summary>
public sealed class AviationWeatherServiceTests
{
    private static AviationWeatherService CreateService(HttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        return new AviationWeatherService(httpClient, NullLogger<AviationWeatherService>.Instance);
    }

    [Fact]
    public async Task FetchRawMetar_ReturnsFirstNonEmptyLine()
    {
        var handler = new FakeHttpMessageHandler(
            "EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG\nSecond line");
        var service = CreateService(handler);

        var result = await service.FetchRawMetarAsync("EDDF");

        Assert.Equal("EDDF 181120Z 26005KT CAVOK 15/07 Q1013 NOSIG", result);
    }

    [Fact]
    public async Task FetchRawMetar_TrimsWhitespace()
    {
        var handler = new FakeHttpMessageHandler("  EDDF 181120Z AUTO  \n");
        var service = CreateService(handler);

        var result = await service.FetchRawMetarAsync("EDDF");

        Assert.Equal("EDDF 181120Z AUTO", result);
    }

    [Fact]
    public async Task FetchRawMetar_ThrowsEmptyResponse_WhenBodyIsEmpty()
    {
        var handler = new FakeHttpMessageHandler("");
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<AviationWeatherException>(
            () => service.FetchRawMetarAsync("EDDF"));

        Assert.Equal(AviationWeatherErrorKind.EmptyResponse, ex.Kind);
    }

    [Fact]
    public async Task FetchRawMetar_ThrowsEmptyResponse_WhenBodyIsOnlyWhitespace()
    {
        var handler = new FakeHttpMessageHandler("   \n  \n  ");
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<AviationWeatherException>(
            () => service.FetchRawMetarAsync("EDDF"));

        Assert.Equal(AviationWeatherErrorKind.EmptyResponse, ex.Kind);
    }

    [Fact]
    public async Task FetchRawMetar_ThrowsHttp_WhenStatusCode500()
    {
        var handler = new FakeHttpMessageHandler("Server Error", HttpStatusCode.InternalServerError);
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<AviationWeatherException>(
            () => service.FetchRawMetarAsync("EDDF"));

        Assert.Equal(AviationWeatherErrorKind.Http, ex.Kind);
        Assert.Equal(500, ex.HttpStatusCode);
    }

    [Fact]
    public async Task FetchRawMetar_ThrowsHttp_WhenStatusCode503()
    {
        var handler = new FakeHttpMessageHandler("Unavailable", HttpStatusCode.ServiceUnavailable);
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<AviationWeatherException>(
            () => service.FetchRawMetarAsync("EDDF"));

        Assert.Equal(AviationWeatherErrorKind.Http, ex.Kind);
        Assert.Equal(503, ex.HttpStatusCode);
    }

    [Fact]
    public async Task FetchRawMetar_ThrowsNetwork_WhenHttpRequestExceptionThrown()
    {
        var handler = new ThrowingHttpMessageHandler(new HttpRequestException("Connection refused"));
        var service = CreateService(handler);

        var ex = await Assert.ThrowsAsync<AviationWeatherException>(
            () => service.FetchRawMetarAsync("EDDF"));

        Assert.Equal(AviationWeatherErrorKind.Network, ex.Kind);
    }

    [Fact]
    public async Task FetchRawMetar_IncludesIcaoInUrl()
    {
        var handler = new CapturingHttpMessageHandler("EDDF 181120Z AUTO");
        var service = CreateService(handler);

        await service.FetchRawMetarAsync("EDDF");

        Assert.Contains("ids=EDDF", handler.LastRequestUri?.Query ?? "");
    }

    [Fact]
    public async Task FetchRawMetar_IncludesFormatRawInUrl()
    {
        var handler = new CapturingHttpMessageHandler("EDDF 181120Z AUTO");
        var service = CreateService(handler);

        await service.FetchRawMetarAsync("EDDF");

        Assert.Contains("format=raw", handler.LastRequestUri?.Query ?? "");
    }
}

// ── Hilfsmittel ──────────────────────────────────────────────────────────────

internal sealed class FakeHttpMessageHandler(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
    : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(body),
        });
    }
}

internal sealed class ThrowingHttpMessageHandler(Exception exception) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        throw exception;
    }
}

internal sealed class CapturingHttpMessageHandler(string body) : HttpMessageHandler
{
    public Uri? LastRequestUri { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequestUri = request.RequestUri;
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body),
        });
    }
}
