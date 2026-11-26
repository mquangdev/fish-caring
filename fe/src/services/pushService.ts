import { axiosClient } from "@/api/axiosClient";
import type { PushSubscriptionPayload } from "@/lib/browserPush";

/** Web Push endpoints. A 404 on the public key means the server has no VAPID keys (push is off). */

export async function getPublicKey(): Promise<string> {
  const { data } = await axiosClient.get<{ publicKey: string }>(
    "/push/public-key",
  );
  return data.publicKey;
}

export async function subscribe(
  payload: PushSubscriptionPayload,
): Promise<void> {
  await axiosClient.post("/push/subscribe", payload);
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await axiosClient.delete("/push/subscribe", { data: { endpoint } });
}
