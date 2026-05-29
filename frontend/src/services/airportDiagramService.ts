import { apiClient } from '../api/apiClient'

export interface RunwayInfo {
  leIdent:  string
  leLat:    number
  leLon:    number
  heIdent:  string
  heLat:    number
  heLon:    number
  lengthFt: number
  widthFt:  number
  surface:  string
  lighted:  boolean
  closed:   boolean
}

export interface AirportDiagramData {
  icao:    string
  runways: RunwayInfo[]
}

export async function fetchAirportDiagram(
  icao:    string,
  signal?: AbortSignal,
): Promise<AirportDiagramData> {
  return apiClient.get<AirportDiagramData>(`/api/airport/${icao}/diagram`, signal)
}
