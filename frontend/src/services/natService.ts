import { apiClient } from '../api/apiClient'

export interface NatPoint {
  name?: string
  latitude: number
  longitude: number
}

export interface NatTrack {
  id: string
  tmi?: string
  route: NatPoint[]
  flightLevels: string[]
  direction: 0 | 1 | 2
  isEastbound: boolean
}

export interface NatResponse {
  tracks: NatTrack[]
  fetchedAt?: string
}

export async function fetchNatTracks(signal?: AbortSignal): Promise<NatResponse> {
  return apiClient.get<NatResponse>('/api/nat', signal)
}
