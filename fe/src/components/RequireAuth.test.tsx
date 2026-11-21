import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AuthState } from '@/store/authSlice'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, LOGGED_OUT, renderWithProviders, TEST_USER } from '@/test/renderWithProviders'
import { RequireAuth } from './RequireAuth'

function renderGuarded(auth: AuthState, route = '/secret') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Trang đăng nhập</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/secret" element={<p>Nội dung riêng</p>} />
      </Route>
    </Routes>,
    { route, auth },
  )
}

describe('RequireAuth', () => {
  it('sends a visitor to the login page', () => {
    renderGuarded(LOGGED_OUT)

    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument()
  })

  it('shows the content to a logged-in user', () => {
    renderGuarded(LOGGED_IN)

    expect(screen.getByText('Nội dung riêng')).toBeInTheDocument()
  })

  it('checks a stored token after a reload before showing anything', async () => {
    mockApi({ 'GET /me': { status: 200, data: TEST_USER } })

    renderGuarded({ ...LOGGED_OUT, token: 'stored', initialized: false })

    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument()
    expect(await screen.findByText('Nội dung riêng')).toBeInTheDocument()
  })

  it('sends the user to login when the stored token is rejected', async () => {
    mockApi({ 'GET /me': { status: 401, data: { code: 'UNAUTHORIZED' } } })

    renderGuarded({ ...LOGGED_OUT, token: 'stale', initialized: false })

    expect(await screen.findByText('Trang đăng nhập')).toBeInTheDocument()
    expect(screen.queryByText('Nội dung riêng')).not.toBeInTheDocument()
  })
})
