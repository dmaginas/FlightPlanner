namespace FlightPlanner.Api.Models;

public sealed record ChartDto(
    string Id,
    string Name,
    string Type,    // "APT" | "DEP" | "ARR" | "APP" | "REF" | "OTHER"
    string Source   // "faa" | "chartfox"
);

public sealed record ChartListResponse(
    string        Icao,
    List<ChartDto> Charts
);

/// <summary>
/// How a chart file reaches the browser. Providers choose the strategy:
/// proxy the bytes, or hand back a URL the browser loads itself.
/// </summary>
public abstract record ChartFile;

/// <summary>Chart bytes streamed through the backend (e.g. FAA — no hotlink protection).</summary>
public sealed record ProxiedChartFile(Stream Stream, string ContentType) : ChartFile;

/// <summary>
/// A URL the browser must load directly. Used for sources behind bot protection
/// (e.g. ChartFox's Akamai-fronted national AIS PDFs) that reject server-side
/// requests but serve real browsers.
/// </summary>
public sealed record RedirectChartFile(string Url) : ChartFile;
