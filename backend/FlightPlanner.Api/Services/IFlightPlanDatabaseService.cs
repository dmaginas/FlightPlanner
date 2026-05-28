namespace FlightPlanner.Api.Services;

// ── Public return types ────────────────────────────────────────────────────────

/// <summary>Result returned by the Flight Plan Database service.</summary>
public sealed class FpdRouteResult
{
    /// <summary>First (best) plan with full waypoints. Null if nothing was found.</summary>
    public FpdPlan? Selected { get; init; }

    /// <summary>Additional candidate plans (metadata only — no full waypoints).</summary>
    public IReadOnlyList<FpdPlanSummary> Alternatives { get; init; } = [];
}

/// <summary>Full flight plan including waypoints from GET /plan/{id}.</summary>
public sealed class FpdPlan
{
    public int Id { get; init; }
    public string FromIcao { get; init; } = string.Empty;
    public string ToIcao { get; init; } = string.Empty;
    public double DistanceNm { get; init; }
    public int MaxAltitude { get; init; }
    public string? Notes { get; init; }
    public string? UpdatedAt { get; init; }
    public double Popularity { get; init; }
    public IReadOnlyList<FpdNode> Nodes { get; init; } = [];
}

/// <summary>Single waypoint node from the FPD route.</summary>
public sealed class FpdNode
{
    public string Type { get; init; } = string.Empty;   // APT, FIX, VOR, NDB
    public string Ident { get; init; } = string.Empty;
    public string? Name { get; init; }
    public double Lat { get; init; }
    public double Lon { get; init; }
}

/// <summary>Metadata-only summary (from search results — no full waypoints).</summary>
public sealed class FpdPlanSummary
{
    public int Id { get; init; }
    public double DistanceNm { get; init; }
    public string? Notes { get; init; }
    public string? UpdatedAt { get; init; }
    public double Popularity { get; init; }
}

// ── Error handling ─────────────────────────────────────────────────────────────

public enum FpdErrorKind
{
    /// <summary>API key is missing or empty in configuration.</summary>
    ConfigurationMissing,
    /// <summary>HTTP error from the FPD API.</summary>
    Http,
    /// <summary>Network / connectivity error.</summary>
    Network,
    /// <summary>No flight plans found for the given route.</summary>
    NoResults,
}

public sealed class FlightPlanDatabaseException : Exception
{
    public FpdErrorKind Kind { get; }
    public int? HttpStatusCode { get; }

    public FlightPlanDatabaseException(FpdErrorKind kind, string message, int? httpStatusCode = null)
        : base(message)
    {
        Kind = kind;
        HttpStatusCode = httpStatusCode;
    }
}

// ── Service interface ──────────────────────────────────────────────────────────

/// <summary>
/// Server-side proxy for the Flight Plan Database API.
/// Searches for IFR routes between two airports and caches results in memory.
/// </summary>
public interface IFlightPlanDatabaseService
{
    /// <summary>
    /// Searches for IFR flight plans between two airports.
    /// Returns the best match with full waypoints plus alternative summaries.
    /// </summary>
    /// <exception cref="FlightPlanDatabaseException">
    /// Thrown on config error, HTTP error, network error, or no results.
    /// </exception>
    Task<FpdRouteResult> SearchRoutesAsync(
        string departure,
        string destination,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches a single flight plan by its FPD numeric ID, including full waypoints.
    /// </summary>
    /// <exception cref="FlightPlanDatabaseException">
    /// Thrown on config error, HTTP error, network error, or no results.
    /// </exception>
    Task<FpdPlan> FetchPlanByIdAsync(
        int planId,
        CancellationToken cancellationToken = default);
}
