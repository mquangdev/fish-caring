import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStoredToken, storeToken } from '@/lib/tokenStorage'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import SettingsPage from './SettingsPage'

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

const subscription = { endpoint: 'https://push.example.com/x', unsubscribe: vi.fn() }

function renderSettings() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Trang đăng nhập</p>} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>,
    { route: '/settings', auth: LOGGED_IN },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(browserPush.pushSupport).mockReturnValue('supported')
  vi.mocked(browserPush.permission).mockReturnValue('granted')
  vi.mocked(browserPush.getSubscription).mockResolvedValue(subscription as unknown as PushSubscription)
  vi.mocked(browserPush.toPayload).mockReturnValue({
    endpoint: subscription.endpoint,
    keys: { p256dh: 'p', auth: 'a' },
  })
})

describe('SettingsPage push', () => {
  it('has the push card with the state of this device', async () => {
    mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 204 },
    })
    renderSettings()

    expect(await screen.findByRole('heading', { name: 'Thông báo trên điện thoại' })).toBeInTheDocument()
    expect(await screen.findByText('Đã bật trên thiết bị này.')).toBeInTheDocument()
  })

  it('logging out first tells the server to forget this device, then clears the token', async () => {
    storeToken('test-token')
    const api = mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 204 },
      'DELETE /push/subscribe': { status: 204 },
    })
    renderSettings()
    await screen.findByText('Đã bật trên thiết bị này.')

    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument()
    const release = api.calls.find((c) => c.method === 'delete' && c.url === '/push/subscribe')!
    expect(JSON.parse(release.data as string)).toEqual({ endpoint: subscription.endpoint })
    expect(getStoredToken()).toBeNull()
    // the browser keeps its subscription: only the server forgets the device
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('still logs out when the server cannot be reached', async () => {
    storeToken('test-token')
    mockApi({
      'GET /push/public-key': { status: 200, data: { publicKey: 'BKey' } },
      'POST /push/subscribe': { status: 204 },
      'DELETE /push/subscribe': { status: 500, data: { code: 'INTERNAL_ERROR' } },
    })
    renderSettings()
    await screen.findByText('Đã bật trên thiết bị này.')

    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument())
    expect(getStoredToken()).toBeNull()
  })
})
