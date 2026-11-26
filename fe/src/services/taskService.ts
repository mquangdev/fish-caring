import { axiosClient } from "@/api/axiosClient";
import type { CareTask, TaskPayload } from "@/types/api";

/** Care task endpoints. Each function only calls the API and returns `response.data`. */

export async function getTask(id: number): Promise<CareTask> {
  const { data } = await axiosClient.get<CareTask>(`/api/tasks/${id}`);
  return data;
}

/** The user's tasks that belong to no tank. */
export async function listGeneralTasks(): Promise<CareTask[]> {
  const { data } = await axiosClient.get<CareTask[]>("/api/tasks/general");
  return data;
}

/** `payload.tankId` is the tank of the task, or null for a general task. */
export async function createTask(payload: TaskPayload): Promise<CareTask> {
  const { data } = await axiosClient.post<CareTask>("/api/tasks", payload);
  return data;
}

export async function updateTask(
  id: number,
  payload: TaskPayload,
): Promise<CareTask> {
  const { data } = await axiosClient.put<CareTask>(`/api/tasks/${id}`, payload);
  return data;
}

export async function setTaskEnabled(
  id: number,
  enabled: boolean,
): Promise<CareTask> {
  const { data } = await axiosClient.patch<CareTask>(
    `/api/tasks/${id}/enabled`,
    { enabled },
  );
  return data;
}

export async function completeTask(id: number): Promise<CareTask> {
  const { data } = await axiosClient.post<CareTask>(
    `/api/tasks/${id}/complete`,
  );
  return data;
}

export async function snoozeTask(id: number): Promise<CareTask> {
  const { data } = await axiosClient.post<CareTask>(`/api/tasks/${id}/snooze`);
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await axiosClient.delete(`/api/tasks/${id}`);
}
