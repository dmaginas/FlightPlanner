using System.Text.Json.Serialization;

namespace FlightPlanner.Api.Models;

public sealed record ProcFixDto(
    [property: JsonPropertyName("ident")] string  Ident,
    [property: JsonPropertyName("lat")]   double? Lat,
    [property: JsonPropertyName("lon")]   double? Lon);

public sealed record ProcedureDto(
    [property: JsonPropertyName("name")]   string Name,
    [property: JsonPropertyName("runway")] string Runway,
    [property: JsonPropertyName("fixes")]  IReadOnlyList<ProcFixDto> Fixes);

public sealed record ProceduresResponse(
    [property: JsonPropertyName("sids")]  IReadOnlyList<ProcedureDto> Sids,
    [property: JsonPropertyName("stars")] IReadOnlyList<ProcedureDto> Stars);
