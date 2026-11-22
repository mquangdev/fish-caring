import { axiosClient } from '@/api/axiosClient'
import type { CareTask, TaskPayload } from '@/types/api'

/** Care task endpoints. Each function only calls the API and returns `response.data`. */

export async function getTask(id: number): Promise<CareTask> {
  const { data } = await axiosClient.get<CareTask>(`/tasks/${id}`)
  return data
}

/** The user's tasks that belong to no tank. */
export async function listGeneralTasks(): Promise<CareTask[]> {
  const { data } = await axiosClient.get<CareTask[]>('/tasks/general')
  return data
}

/** `payload.tankId` is the tank of the task, or null for a general task. */
export async function createTask(payload: TaskPayload): Promise<CareTask> {
  const { data } = await axiosClient.post<CareTask>('/tasks', payload)
  return data
}

export async function updateTask(id: number, payload: TaskPayload): Promise<CareTask> {
  const { data } = await axiosClient.put<CareTask>(`/tasks/${id}`, payload)
  return data
}

export async function setTaskEnabled(id: number, enabled: boolean): Promise<CareTask> {
  const { data } = await axiosClient.patch<CareTask>(`/tasks/${id}/enabled`, { enabled })
  return data
}

export async function deleteTask(id: number): Promise<void> {
  await axiosClient.delete(`/tasks/${id}`)
}
