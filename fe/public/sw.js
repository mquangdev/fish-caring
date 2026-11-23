/*
 * Fish Caring service worker. It only shows Web Push notifications and opens the app when one is
 * tapped. There is no fetch handler and nothing is cached: the app always loads from the network.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const DEFAULT_TITLE = 'Fish Caring'
const DEFAULT_BODY = 'Có việc cần chăm.'

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {}
  } catch {
    return {}
  }
}

function text(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

// Only a path of this app can be opened: never another site, never "//host".
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event)
  const tag = typeof payload.tag === 'string' && payload.tag ? payload.tag : undefined
  const options = {
    body: text(payload.body, DEFAULT_BODY),
    icon: '/icons/icon-192.png',
    data: { url: safePath(payload.url) },
  }
  if (tag) {
    // a newer message about the same task replaces the older one, and still alerts the user
    options.tag = tag
    options.renotify = true
  }
  event.waitUntil(self.registration.showNotification(text(payload.title, DEFAULT_TITLE), options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safePath(event.notification.data && event.notification.data.url)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client)
      if (open) {
        return open.focus().then((focused) => {
          const target = focused || open
          return 'navigate' in target ? target.navigate(url) : undefined
        })
      }
      return self.clients.openWindow(url)
    }),
  )
})
