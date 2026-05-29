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

export interface IlsInfo {
  runwayIdent:  string
  ilsIdent:     string
  frequencyMhz: number
  category:     string
  bearingDeg:   number
}

export interface AtcFrequency {
  type:         string
  description:  string
  frequencyMhz: number
}

export interface AirportDiagramData {
  icao:           string
  runways:        RunwayInfo[]
  ilsApproaches:  IlsInfo[]
  atcFrequencies: AtcFrequency[]
}

export async function fetchAirportDiagram(
  icao:    string,
  signal?: AbortSignal,
): Promise<AirportDiagramData> {
  return apiClient.get<AirportDiagramData>(`/api/airport/${icao}/diagram`, signal)
}
