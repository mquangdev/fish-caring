import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexHtml from '../../index.html?raw'
import manifestText from '../../public/manifest.webmanifest?raw'
import SW_SOURCE from '../../public/sw.js?raw'

// the icon files that exist in public/icons (the PNG bytes themselves are not needed)
const ICON_FILES = Object.keys(import.meta.glob('../../public/icons/*.png', { query: '?url' })).map(
  (path) => `/icons/${path.split('/').pop()}`,
)

type Listener = (event: unknown) => void

/** Runs public/sw.js against a fake service worker scope and returns what it registered and did. */
function loadServiceWorker() {
  const listeners = new Map<string, Listener>()
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  const clients = {
    matchAll: vi.fn().mockResolvedValue([]),
    claim: vi.fn().mockResolvedValue(undefined),
    openWindow,
  }
  const scope = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration: { showNotification },
    clients,
    skipWaiting: vi.fn(),
  }
  new Function('self', SW_SOURCE)(scope)
  return { listeners, showNotification, clients, scope }
}

async function push(sw: ReturnType<typeof loadServiceWorker>, data: unknown) {
  const waits: Promise<unknown>[] = []
  sw.listeners.get('push')!({
    data: data === undefined ? null : { json: () => (typeof data === 'function' ? (data as () => unknown)() : data) },
    waitUntil: (promise: Promise<unknown>) => waits.push(promise),
  })
  await Promise.all(waits)
}

async function click(sw: ReturnType<typeof loadServiceWorker>, data: unknown) {
  const close = vi.fn()
  const waits: Promise<unknown>[] = []
  sw.listeners.get('notificationclick')!({
    notification: { close, data },
    waitUntil: (promise: Promise<unknown>) => waits.push(promise),
  })
  await Promise.all(waits)
  return close
}

describe('service worker: push', () => {
  let sw: ReturnType<typeof loadServiceWorker>
  beforeEach(() => {
    sw = loadServiceWorker()
  })

  it('shows the title, the text, the icon, the tag and the page to open', async () => {
    await push(sw, { title: 'Fish Caring', body: 'Bể 1: sắp đến giờ cho ăn (08:00)', url: '/', tag: 'task-7' })

    expect(sw.showNotification).toHaveBeenCalledWith('Fish Caring', {
      body: 'Bể 1: sắp đến giờ cho ăn (08:00)',
      icon: '/icons/icon-192.png',
      data: { url: '/' },
      tag: 'task-7',
      renotify: true,
    })
  })

  it('shows a default message when the payload is empty or broken', async () => {
    await push(sw, undefined)
    await push(sw, () => {
      throw new SyntaxError('not json')
    })
    await push(sw, { title: '   ', body: 42 })

    for (const call of sw.showNotification.mock.calls) {
      expect(call[0]).toBe('Fish Caring')
      expect(call[1].body).toBe('Có việc cần chăm.')
      expect(call[1].data).toEqual({ url: '/' })
      expect(call[1]).not.toHaveProperty('tag')
      expect(call[1]).not.toHaveProperty('renotify')
    }
    expect(sw.showNotification).toHaveBeenCalledTimes(3)
  })

  it('never opens another site or a protocol-relative address', async () => {
    await push(sw, { url: 'https://evil.example.com' })
    await push(sw, { url: '//evil.example.com' })
    await push(sw, { url: '/notifications' })

    expect(sw.showNotification.mock.calls.map((c) => c[1].data.url)).toEqual(['/', '/', '/notifications'])
  })

  it('takes over at once and without caching anything', () => {
    expect(sw.listeners.has('install')).toBe(true)
    expect(sw.listeners.has('activate')).toBe(true)
    expect(sw.listeners.has('fetch')).toBe(false)

    sw.listeners.get('install')!({})
    expect(sw.scope.skipWaiting).toHaveBeenCalled()
    const waits: Promise<unknown>[] = []
    sw.listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    expect(sw.clients.claim).toHaveBeenCalled()
  })
})

describe('service worker: tapping a notification', () => {
  it('closes it and focuses the open tab, sending it to the page', async () => {
    const sw = loadServiceWorker()
    const navigate = vi.fn().mockResolvedValue(undefined)
    const tab = { focus: vi.fn().mockResolvedValue(undefined), navigate }
    // focus() resolves with the focused client; here it gives the same tab back
    tab.focus.mockResolvedValue(tab)
    sw.clients.matchAll.mockResolvedValue([tab])

    const close = await click(sw, { url: '/' })

    expect(close).toHaveBeenCalled()
    expect(tab.focus).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/')
    expect(sw.clients.openWindow).not.toHaveBeenCalled()
  })

  it('opens the app when there is no tab', async () => {
    const sw = loadServiceWorker()

    const close = await click(sw, { url: '/' })

    expect(close).toHaveBeenCalled()
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/')
  })

  it('opens the home page when the notification has no data or a bad url', async () => {
    const sw = loadServiceWorker()

    await click(sw, undefined)
    await click(sw, { url: 'javascript:alert(1)' })

    expect(sw.clients.openWindow).toHaveBeenNthCalledWith(1, '/')
    expect(sw.clients.openWindow).toHaveBeenNthCalledWith(2, '/')
  })
})

describe('web app manifest', () => {
  const manifest = JSON.parse(manifestText)

  it('has what a browser needs to install the app', () => {
    expect(manifest.name).toBe('Fish Caring')
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.lang).toBe('vi')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('lists 192 and 512 pixel icons, one of them maskable, and every file exists', () => {
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true)
    for (const icon of manifest.icons as { src: string; type: string }[]) {
      expect(icon.type).toBe('image/png')
      expect(ICON_FILES).toContain(icon.src)
    }
  })

  it('has the icon for the iOS Home Screen and the one the notifications use', () => {
    expect(ICON_FILES).toContain('/icons/apple-touch-icon.png')
    expect(ICON_FILES).toContain('/icons/icon-192.png')
    expect(SW_SOURCE).toContain('/icons/icon-192.png')
  })

  it('is linked from the page together with the icon for iOS and a theme color', () => {
    const html = indexHtml
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"')
    expect(html).toContain('name="theme-color"')
  })
})
