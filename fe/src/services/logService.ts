import { axiosClient } from "@/api/axiosClient";
import type { CareLog } from "@/types/api";

/** Care history endpoints. The server keeps the newest first and limits the list (default 50). */

export async function getTankLogs(tankId: number): Promise<CareLog[]> {
  const { data } = await axiosClient.get<CareLog[]>(
    `/tanks/${tankId}/logs`,
  );
  return data;
}

/** Logs of the tasks that belong to no tank. */
export async function getGeneralLogs(): Promise<CareLog[]> {
  const { data } = await axiosClient.get<CareLog[]>("/tasks/general/logs");
  return data;
}
