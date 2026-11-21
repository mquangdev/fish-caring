import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { LOGGED_IN, LOGGED_OUT, renderWithProviders } from './test/renderWithProviders'

describe('App routes', () => {
  it('sends a visitor from a private page to the login page', () => {
    renderWithProviders(<App />, { route: '/tanks', auth: LOGGED_OUT })

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('shows the home page with the bottom navigation to a logged-in user', () => {
    renderWithProviders(<App />, { route: '/', auth: LOGGED_IN })

    expect(screen.getByRole('heading', { name: 'Xin chào, Alice' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    for (const label of ['Hôm nay', 'Bể của tôi', 'Thông báo', 'Cài đặt']) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it('opens the other private pages inside the same layout', () => {
    renderWithProviders(<App />, { route: '/tanks', auth: LOGGED_IN })
    expect(screen.getByRole('heading', { name: 'Bể của tôi' })).toBeInTheDocument()
  })

  it('shows the register page to visitors', () => {
    renderWithProviders(<App />, { route: '/register', auth: LOGGED_OUT })

    expect(screen.getByRole('heading', { name: 'Tạo tài khoản' })).toBeInTheDocument()
  })

  it('renders the Vietnamese 404 page for unknown routes', () => {
    renderWithProviders(<App />, { route: '/nope', auth: LOGGED_IN })

    expect(screen.getByText('Không tìm thấy trang')).toBeInTheDocument()
  })
})
