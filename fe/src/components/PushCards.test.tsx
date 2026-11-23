import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import { PushBanner } from './PushBanner'
import { PushSettingsCard } from './PushSettingsCard'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
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
const subscription = { endpoint: PAYLOAD.endpoint, unsubscribe: vi.fn().mockResolvedValue(true) }

function serverWithKeys(extra: Record<string, { status: number; data?: unknown }> = {}) {
  return mockApi({
    'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
    'POST /push/subscribe': { status: 204 },
    'DELETE /push/subscribe': { status: 204 },
    ...extra,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(browserPush.pushSupport).mockReturnValue('supported')
  vi.mocked(browserPush.permission).mockReturnValue('default')
  vi.mocked(browserPush.requestPermission).mockResolvedValue('granted')
  vi.mocked(browserPush.getSubscription).mockResolvedValue(null)
  vi.mocked(browserPush.subscribe).mockResolvedValue(subscription as unknown as PushSubscription)
  vi.mocked(browserPush.unsubscribe).mockResolvedValue(true)
  vi.mocked(browserPush.toPayload).mockReturnValue(PAYLOAD)
})

describe('PushSettingsCard', () => {
  it('offers "Bật thông báo" when push can work and is off', async () => {
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByRole('button', { name: 'Bật thông báo' })).toBeEnabled()
    expect(screen.getByText(/trước 30 phút/)).toBeInTheDocument()
  })

  it('turns push on: asks permission, subscribes and tells the server', async () => {
    const api = serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Bật thông báo' }))

    expect(await screen.findByText('Đã bật trên thiết bị này.')).toBeInTheDocument()
    expect(browserPush.requestPermission).toHaveBeenCalled()
    const post = api.calls.find((c) => c.method === 'post' && c.url === '/push/subscribe')!
    expect(JSON.parse(post.data as string)).toEqual(PAYLOAD)
    expect(screen.getByRole('button', { name: 'Tắt thông báo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bật thông báo' })).not.toBeInTheDocument()
  })

  it('shows that it is already on and turns it off', async () => {
    vi.mocked(browserPush.permission).mockReturnValue('granted')
    vi.mocked(browserPush.getSubscription).mockResolvedValue(subscription as unknown as PushSubscription)
    const api = serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByText('Đã bật trên thiết bị này.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tắt thông báo' }))

    expect(await screen.findByRole('button', { name: 'Bật thông báo' })).toBeInTheDocument()
    expect(api.calls.some((c) => c.method === 'delete' && c.url === '/push/subscribe')).toBe(true)
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('shows the Vietnamese error and keeps the button when the user refuses permission', async () => {
    vi.mocked(browserPush.requestPermission).mockResolvedValue('denied')
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Bật thông báo' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('chưa cho phép thông báo'))
  })

  it('explains how to unblock notifications when the browser blocked them', async () => {
    vi.mocked(browserPush.permission).mockReturnValue('denied')
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByText(/Thông báo đang bị chặn/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bật thông báo' })).not.toBeInTheDocument()
  })

  it('hides the button and keeps the in-app notifications when the browser has no push', async () => {
    vi.mocked(browserPush.pushSupport).mockReturnValue('unsupported')
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByText(/chưa hỗ trợ thông báo đẩy/)).toBeInTheDocument()
    expect(screen.getByText(/vẫn nhận thông báo trong app/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the step by step guide on an iPhone that has not installed the app', async () => {
    vi.mocked(browserPush.pushSupport).mockReturnValue('ios-needs-install')
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByText(/thêm Fish Caring vào Màn hình chính/)).toBeInTheDocument()
    expect(screen.getByText(/Chọn “Thêm vào Màn hình chính”/)).toBeInTheDocument()
    expect(screen.getByText(/iOS hoặc iPadOS 16.4/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('hides the button when the server has no VAPID keys', async () => {
    mockApi({ 'GET /push/public-key': { status: 404, data: { code: 'NOT_FOUND' } } })
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    expect(await screen.findByText(/Máy chủ chưa bật thông báo đẩy/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('locks the button while it is turning on', async () => {
    let release: (() => void) | null = null
    vi.mocked(browserPush.requestPermission).mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve('granted')
        }),
    )
    serverWithKeys()
    renderWithProviders(<PushSettingsCard />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Bật thông báo' }))

    expect(await screen.findByRole('button', { name: 'Đang bật...' })).toBeDisabled()
    release!()
    expect(await screen.findByText('Đã bật trên thiết bị này.')).toBeInTheDocument()
  })
})

describe('PushBanner', () => {
  it('invites the user to turn push on', async () => {
    serverWithKeys()
    renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    expect(await screen.findByText(/Bật thông báo để được nhắc trước 30 phút/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bật thông báo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Để sau' })).toBeInTheDocument()
  })

  it('turns push on and goes away', async () => {
    serverWithKeys()
    renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Bật thông báo' }))

    await waitFor(() => expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument())
    expect(browserPush.subscribe).toHaveBeenCalledWith('BKey')
  })

  it('"Để sau" hides it and remembers that on this device', async () => {
    serverWithKeys()
    const { unmount } = renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Để sau' }))

    expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument()
    expect(localStorage.getItem('fishcaring.pushBannerDismissed')).toBe('1')
    unmount()
  })

  it('still hides when localStorage is blocked', async () => {
    serverWithKeys()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    await userEvent.click(await screen.findByRole('button', { name: 'Để sau' }))

    expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it.each([
    ['push is already on', () => {
      vi.mocked(browserPush.permission).mockReturnValue('granted')
      vi.mocked(browserPush.getSubscription).mockResolvedValue(subscription as unknown as PushSubscription)
    }],
    ['the browser blocked notifications', () => vi.mocked(browserPush.permission).mockReturnValue('denied')],
    ['the browser has no push', () => vi.mocked(browserPush.pushSupport).mockReturnValue('unsupported')],
    ['an iPhone has not installed the app', () => vi.mocked(browserPush.pushSupport).mockReturnValue('ios-needs-install')],
  ])('is not shown when %s', async (_name, arrange) => {
    arrange()
    const api = serverWithKeys()
    renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    // wait until the state was checked, then make sure nothing is shown
    await waitFor(() => expect(browserPush.pushSupport).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument()
    expect(api).toBeDefined()
  })

  it('is not shown when the server has no VAPID keys', async () => {
    mockApi({ 'GET /push/public-key': { status: 404, data: { code: 'NOT_FOUND' } } })
    renderWithProviders(<PushBanner />, { auth: LOGGED_IN })

    await waitFor(() => expect(browserPush.pushSupport).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument()
  })

  it('is not shown after it was dismissed in an earlier visit', async () => {
    localStorage.setItem('fishcaring.pushBannerDismissed', '1')
    // the dismissed flag is read when the slice is created, so load a fresh copy of it
    vi.resetModules()
    const { renderWithProviders: render } = await import('@/test/renderWithProviders')
    const { PushBanner: FreshBanner } = await import('./PushBanner')
    serverWithKeys()
    render(<FreshBanner />, { auth: LOGGED_IN })

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.queryByText(/Bật thông báo để được nhắc/)).not.toBeInTheDocument()
  })
})
