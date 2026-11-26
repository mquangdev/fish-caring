import { axiosClient } from "@/api/axiosClient";
import type { AppNotification } from "@/types/api";

/** Notification endpoints. The server keeps the newest first and limits the list (default 50). */

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } =
    await axiosClient.get<AppNotification[]>("/api/notifications");
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await axiosClient.get<{ count: number }>(
    "/api/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await axiosClient.post(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosClient.post("/api/notifications/read-all");
}
