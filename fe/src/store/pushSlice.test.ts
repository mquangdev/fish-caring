import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/mockApi'
import authReducer, { loggedOut } from './authSlice'
import pushReducer, { dismissBanner, disablePush, enablePush, refreshPushState, releaseDevice } from './pushSlice'

vi.mock('@/lib/browserPush', () => ({
  pushSupport: vi.fn(),
  permission: vi.fn(),
  requestPermission: vi.fn(),
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  toPayload: vi.fn(),
}))

import * as browserPush from '@/lib/browserPush'

const PAYLOAD = { endpoint: 'https://push.example.com/x', keys: { p256dh: 'p', auth: 'a' } }
const browserSubscription = { endpoint: PAYLOAD.endpoint, unsubscribe: vi.fn().mockResolvedValue(true) }

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, push: pushReducer } })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(browserPush.pushSupport).mockReturnValue('supported')
  vi.mocked(browserPush.permission).mockReturnValue('default')
  vi.mocked(browserPush.requestPermission).mockResolvedValue('granted')
  vi.mocked(browserPush.getSubscription).mockResolvedValue(null)
  vi.mocked(browserPush.subscribe).mockResolvedValue(browserSubscription as unknown as PushSubscription)
  vi.mocked(browserPush.unsubscribe).mockResolvedValue(true)
  vi.mocked(browserPush.toPayload).mockReturnValue(PAYLOAD)
  browserSubscription.unsubscribe.mockResolvedValue(true)
})

describe('refreshPushState', () => {
  it('reports an unsupported browser without asking the server', async () => {
    vi.mocked(browserPush.pushSupport).mockReturnValue('ios-needs-install')
    const api = mockApi({})
    const store = makeStore()

    await store.dispatch(refreshPushState())

    expect(store.getState().push.support).toBe('ios-needs-install')
    expect(store.getState().push.serverReady).toBeNull()
    expect(api.calls).toHaveLength(0)
  })

  it('knows when the server has no keys (404 on the public key)', async () => {
    mockApi({ 'GET /push/public-key': { status: 404, data: { code: 'NOT_FOUND' } } })
    const store = makeStore()

    await store.dispatch(refreshPushState())

    expect(store.getState().push.serverReady).toBe(false)
    expect(store.getState().push.subscribed).toBe(false)
  })

  it('is not subscribed until the user allows notifications', async () => {
    mockApi({ 'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } } })
    const store = makeStore()

    await store.dispatch(refreshPushState())

    const state = store.getState().push
    expect(state.serverReady).toBe(true)
    expect(state.permission).toBe('default')
    expect(state.subscribed).toBe(false)
  })

  it('registers a subscribed device with the server again so the server follows the browser', async () => {
    vi.mocked(browserPush.permission).mockReturnValue('granted')
    vi.mocked(browserPush.getSubscription).mockResolvedValue(browserSubscription as unknown as PushSubscription)
    const api = mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 204 },
    })
    const store = makeStore()

    await store.dispatch(refreshPushState())

    expect(store.getState().push.subscribed).toBe(true)
    expect(JSON.parse(api.calls.find((c) => c.method === 'post')!.data as string)).toEqual(PAYLOAD)
  })

  it('keeps what it knew when the check fails', async () => {
    mockApi({ 'GET /push/public-key': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(refreshPushState())

    expect(store.getState().push.serverReady).toBeNull()
    expect(store.getState().push.error).toBe('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')
  })
})

describe('enablePush', () => {
  it('asks permission, subscribes the browser and tells the server', async () => {
    const api = mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 204 },
    })
    const store = makeStore()

    const result = await store.dispatch(enablePush())

    expect(enablePush.fulfilled.match(result)).toBe(true)
    expect(browserPush.subscribe).toHaveBeenCalledWith('BKey')
    expect(JSON.parse(api.calls.find((c) => c.method === 'post')!.data as string)).toEqual(PAYLOAD)
    const state = store.getState().push
    expect(state.subscribed).toBe(true)
    expect(state.status).toBe('succeeded')
  })

  it('fails with a Vietnamese message and does nothing more when the user refuses', async () => {
    vi.mocked(browserPush.requestPermission).mockResolvedValue('denied')
    vi.mocked(browserPush.permission).mockReturnValue('denied')
    const api = mockApi({})
    const store = makeStore()

    await store.dispatch(enablePush())

    const state = store.getState().push
    expect(state.status).toBe('failed')
    expect(state.error).toContain('chưa cho phép thông báo')
    expect(state.permission).toBe('denied')
    expect(state.subscribed).toBe(false)
    expect(api.calls).toHaveLength(0)
    expect(browserPush.subscribe).not.toHaveBeenCalled()
  })

  it('rolls the browser subscription back when the server refuses it', async () => {
    mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 400, data: { code: 'VALIDATION_ERROR', fieldErrors: { endpoint: 'x' } } },
    })
    const store = makeStore()

    await store.dispatch(enablePush())

    expect(browserPush.unsubscribe).toHaveBeenCalled()
    expect(store.getState().push.subscribed).toBe(false)
    expect(store.getState().push.status).toBe('failed')
  })

  it('says the server has push off when there is no public key', async () => {
    mockApi({ 'GET /push/public-key': { status: 404, data: { code: 'NOT_FOUND' } } })
    const store = makeStore()

    await store.dispatch(enablePush())

    expect(store.getState().push.error).toContain('Máy chủ chưa bật thông báo đẩy')
    expect(browserPush.subscribe).not.toHaveBeenCalled()
  })
})

describe('disablePush', () => {
  it('tells the server and then cancels the browser subscription', async () => {
    vi.mocked(browserPush.getSubscription).mockResolvedValue(browserSubscription as unknown as PushSubscription)
    const api = mockApi({ 'DELETE /push/subscribe': { status: 204 } })
    const store = makeStore()
    await store.dispatch(enablePush.fulfilled({ support: 'supported', permission: 'granted', subscribed: true, serverReady: true }, 'x'))

    await store.dispatch(disablePush())

    expect(JSON.parse(api.calls[0].data as string)).toEqual({ endpoint: PAYLOAD.endpoint })
    expect(browserSubscription.unsubscribe).toHaveBeenCalled()
    expect(store.getState().push.subscribed).toBe(false)
  })

  it('keeps the browser subscription and reports the error when the server cannot be reached', async () => {
    vi.mocked(browserPush.getSubscription).mockResolvedValue(browserSubscription as unknown as PushSubscription)
    mockApi({ 'DELETE /push/subscribe': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()

    await store.dispatch(disablePush())

    expect(browserSubscription.unsubscribe).not.toHaveBeenCalled()
    expect(store.getState().push.status).toBe('failed')
  })
})

describe('releaseDevice', () => {
  it('removes the device from the server but keeps the browser subscription', async () => {
    vi.mocked(browserPush.getSubscription).mockResolvedValue(browserSubscription as unknown as PushSubscription)
    const api = mockApi({ 'DELETE /push/subscribe': { status: 204 } })
    const store = makeStore()

    await store.dispatch(releaseDevice())

    expect(api.calls).toHaveLength(1)
    expect(browserSubscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('never fails, even when the server is down or push is unsupported', async () => {
    vi.mocked(browserPush.getSubscription).mockResolvedValue(browserSubscription as unknown as PushSubscription)
    mockApi({ 'DELETE /push/subscribe': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    const store = makeStore()
    expect(releaseDevice.fulfilled.match(await store.dispatch(releaseDevice()))).toBe(true)

    vi.mocked(browserPush.pushSupport).mockReturnValue('unsupported')
    const api = mockApi({})
    expect(releaseDevice.fulfilled.match(await store.dispatch(releaseDevice()))).toBe(true)
    expect(api.calls).toHaveLength(0)
  })
})

describe('banner and logout', () => {
  it('remembers that the banner was dismissed', () => {
    const store = makeStore()

    store.dispatch(dismissBanner())

    expect(store.getState().push.bannerDismissed).toBe(true)
    expect(localStorage.getItem('fishcaring.pushBannerDismissed')).toBe('1')
  })

  it('forgets what was shown about the account when the user logs out but keeps the dismissed banner', async () => {
    mockApi({ 'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } } })
    const store = makeStore()
    await store.dispatch(refreshPushState())
    store.dispatch(dismissBanner())

    store.dispatch(loggedOut())

    expect(store.getState().push.serverReady).toBeNull()
    expect(store.getState().push.subscribed).toBe(false)
    expect(store.getState().push.bannerDismissed).toBe(true)
  })
})
