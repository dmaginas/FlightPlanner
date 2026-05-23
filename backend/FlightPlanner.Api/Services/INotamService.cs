namespace FlightPlanner.Api.Services;

public interface INotamService
{
    /// <summary>
    /// Fetches active NOTAMs for the given ICAO code from the FAA NOTAM API.
    /// </summary>
    Task<NotamResult> FetchNotamsAsync(string icao, CancellationToken cancellationToken = default);
}

public sealed record NotamItem(
    string Id,
    string Number,
    string Text,
    string EffectiveStart,
    string? EffectiveEnd,
    string Classification);

public sealed record NotamResult(IReadOnlyList<NotamItem> Notams, int Total);

public enum NotamErrorKind { ConfigurationMissing, Http, Network, EmptyResponse }

public sealed class NotamException : Exception
{
    public NotamErrorKind Kind { get; }
    public int? HttpStatusCode { get; }

    public NotamException(NotamErrorKind kind, string message, int? httpStatusCode = null)
        : base(message)
    {
        Kind = kind;
        HttpStatusCode = httpStatusCode;
    }
}
