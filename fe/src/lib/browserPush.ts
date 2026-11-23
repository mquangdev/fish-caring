/**
 * The browser side of Web Push, wrapped in small functions so the rest of the app (and the tests) never
 * touch `navigator`, `PushManager` or `Notification` directly.
 */

export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported'
export type PushPermission = 'default' | 'granted' | 'denied'

export interface PushSubscriptionPayload {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const SERVICE_WORKER_URL = '/sw.js'

/** iPhone, iPad (iPadOS reports itself as a Mac with a touch screen) and iPod. */
export function isIos(
  userAgent: string = navigator.userAgent,
  platform: string = navigator.platform,
  touchPoints: number = navigator.maxTouchPoints,
): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)
}

/** True when the app was opened from the Home Screen icon instead of a browser tab. */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Can this browser receive push? On iOS and iPadOS 16.4 or later the push APIs exist only after the app
 * was added to the Home Screen, so a plain Safari tab asks the user to install it first.
 */
export function pushSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    return 'supported'
  }
  return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported'
}

export function permission(): PushPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

export function requestPermission(): Promise<PushPermission> {
  return Notification.requestPermission()
}

/** The public key arrives as base64url text; the browser wants bytes. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL)
  return navigator.serviceWorker.ready
}

/** The push subscription of this browser, or null when there is none. */
export async function getSubscription(): Promise<PushSubscription | null> {
  return (await registration()).pushManager.getSubscription()
}

/** Reuses the existing subscription of the browser or creates one with the server's public key. */
export async function subscribe(publicKey: string): Promise<PushSubscription> {
  const pushManager = (await registration()).pushManager
  const existing = await pushManager.getSubscription()
  if (existing) return existing
  return pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
}

/** Cancels the browser subscription; returns whether there was one. */
export async function unsubscribe(): Promise<boolean> {
  const existing = await getSubscription()
  return existing ? existing.unsubscribe() : false
}

/** The JSON the backend wants: endpoint and the two keys. Throws when the browser gave no keys. */
export function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('The push subscription has no keys')
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth } }
}
