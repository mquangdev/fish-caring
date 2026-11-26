import { axiosClient } from "@/api/axiosClient";
import type { AppNotification } from "@/types/api";

/** Notification endpoints. The server keeps the newest first and limits the list (default 50). */

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } =
    await axiosClient.get<AppNotification[]>("/notifications");
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await axiosClient.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await axiosClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosClient.post("/notifications/read-all");
}
