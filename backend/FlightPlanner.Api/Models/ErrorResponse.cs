namespace FlightPlanner.Api.Models;

/// <summary>
/// Standardised JSON error format for API error responses.
/// </summary>
public sealed class ErrorResponse
{
    /// <summary>Short, machine-readable error code.</summary>
    public required string Error { get; init; }

    /// <summary>Human-readable error description.</summary>
    public required string Details { get; init; }
}
