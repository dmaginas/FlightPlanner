import { apiClient } from '../api/apiClient'

export async function fetchAirspaceBoundaries(signal?: AbortSignal): Promise<unknown> {
  return apiClient.get<unknown>('/api/airspace/boundaries', signal)
}
