import { axiosClient } from '@/api/axiosClient'
import type { Tank, TankPayload, TankSummary } from '@/types/api'

/** Tank endpoints. Each function only calls the API and returns `response.data`. */

export async function listTanks(): Promise<TankSummary[]> {
  const { data } = await axiosClient.get<TankSummary[]>('/tanks')
  return data
}

export async function getTank(id: number): Promise<Tank> {
  const { data } = await axiosClient.get<Tank>(`/tanks/${id}`)
  return data
}

export async function createTank(payload: TankPayload): Promise<Tank> {
  const { data } = await axiosClient.post<Tank>('/tanks', payload)
  return data
}

export async function updateTank(id: number, payload: TankPayload): Promise<Tank> {
  const { data } = await axiosClient.put<Tank>(`/tanks/${id}`, payload)
  return data
}

export async function deleteTank(id: number): Promise<void> {
  await axiosClient.delete(`/tanks/${id}`)
}
