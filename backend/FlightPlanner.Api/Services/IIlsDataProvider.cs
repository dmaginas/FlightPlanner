using FlightPlanner.Api.Models;

namespace FlightPlanner.Api.Services;

public interface IIlsDataProvider
{
    IReadOnlyDictionary<string, List<IlsDto>> Load();
}
