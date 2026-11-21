import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getStoredToken, storeToken } from '@/lib/tokenStorage'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders, TEST_USER } from '@/test/renderWithProviders'
import SettingsPage from './SettingsPage'

function renderSettings() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Trang đăng nhập</p>} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>,
    { route: '/settings', auth: LOGGED_IN },
  )
}

describe('SettingsPage', () => {
  it('shows the account email and current name', () => {
    renderSettings()

    expect(screen.getByText(TEST_USER.email)).toBeInTheDocument()
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Alice')
  })

  it('keeps the save button off until the name changes', async () => {
    renderSettings()
    const save = screen.getByRole('button', { name: 'Lưu thay đổi' })
    expect(save).toBeDisabled()

    await userEvent.type(screen.getByLabelText('Tên hiển thị'), ' Nguyen')

    expect(save).toBeEnabled()
  })

  it('saves a new display name through the API', async () => {
    const api = mockApi({ 'PATCH /me': { status: 200, data: { ...TEST_USER, displayName: 'Alice Nguyen' } } })
    const { store } = renderSettings()

    await userEvent.type(screen.getByLabelText('Tên hiển thị'), ' Nguyen')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await screen.findByLabelText('Tên hiển thị')
    expect(JSON.parse(api.calls[0].data as string)).toEqual({ displayName: 'Alice Nguyen' })
    expect(store.getState().auth.user?.displayName).toBe('Alice Nguyen')
  })

  it('refuses an empty name', async () => {
    const api = mockApi({})
    renderSettings()

    await userEvent.clear(screen.getByLabelText('Tên hiển thị'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(screen.getByText('Vui lòng nhập tên hiển thị.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('logs out: clears the token and goes to the login page', async () => {
    storeToken('test-token')
    const { store } = renderSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument()
    expect(store.getState().auth.token).toBeNull()
    expect(getStoredToken()).toBeNull()
  })
})
