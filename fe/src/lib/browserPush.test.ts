import { afterEach, describe, expect, it, vi } from 'vitest'
import { isIos, pushSupport, toPayload, urlBase64ToUint8Array } from './browserPush'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Version/17.2 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'

function setApis(on: boolean) {
  if (on) {
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', { permission: 'default' })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
  } else {
    vi.stubGlobal('PushManager', undefined)
    delete (window as unknown as Record<string, unknown>).PushManager
    delete (window as unknown as Record<string, unknown>).Notification
    delete (navigator as unknown as Record<string, unknown>).serviceWorker
  }
}

function setUserAgent(userAgent: string, standalone = false) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: standalone })
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (navigator as unknown as Record<string, unknown>).standalone
})

describe('isIos', () => {
  it('recognises iPhone, iPad and iPadOS (a Mac with a touch screen)', () => {
    expect(isIos(IPHONE, 'iPhone', 5)).toBe(true)
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)', 'iPad', 5)).toBe(true)
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
  })

  it('does not take a Mac, Android or Windows for iOS', () => {
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false)
    expect(isIos(ANDROID, 'Linux armv81', 5)).toBe(false)
    expect(isIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0)).toBe(false)
  })
})

describe('pushSupport', () => {
  it('is supported when the browser has service workers, push and notifications', () => {
    setApis(true)
    setUserAgent(ANDROID)

    expect(pushSupport()).toBe('supported')
  })

  it('asks an iPhone in a Safari tab to install the app first', () => {
    setApis(false)
    setUserAgent(IPHONE, false)

    expect(pushSupport()).toBe('ios-needs-install')
  })

  it('is unsupported on an iPhone app that still has no push (older iOS) and on other browsers without push', () => {
    setApis(false)
    setUserAgent(IPHONE, true)
    expect(pushSupport()).toBe('unsupported')

    setUserAgent(ANDROID)
    expect(pushSupport()).toBe('unsupported')
  })
})

describe('urlBase64ToUint8Array', () => {
  it('turns base64url text into bytes', () => {
    // "hello" is aGVsbG8 without padding
    expect(Array.from(urlBase64ToUint8Array('aGVsbG8'))).toEqual([104, 101, 108, 108, 111])
  })

  it('understands the url alphabet (- and _)', () => {
    // bytes 0xfb 0xff 0xfe are "-__-" in base64url and "+//+" in base64
    expect(Array.from(urlBase64ToUint8Array('-__-'))).toEqual([0xfb, 0xff, 0xfe])
  })
})

describe('toPayload', () => {
  it('keeps the endpoint and the two keys', () => {
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example.com/x', keys: { p256dh: 'p', auth: 'a' } }),
    } as unknown as PushSubscription

    expect(toPayload(subscription)).toEqual({ endpoint: 'https://push.example.com/x', keys: { p256dh: 'p', auth: 'a' } })
  })

  it('fails when the browser gave no keys', () => {
    const subscription = { toJSON: () => ({ endpoint: 'https://push.example.com/x' }) } as unknown as PushSubscription

    expect(() => toPayload(subscription)).toThrow()
  })
})
