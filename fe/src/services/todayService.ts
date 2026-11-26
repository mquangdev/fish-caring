import { axiosClient } from "@/api/axiosClient";
import type { Today } from "@/types/api";

export async function getToday(): Promise<Today> {
  const { data } = await axiosClient.get<Today>("/api/today");
  return data;
}
