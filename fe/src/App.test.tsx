import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { mockApi } from './test/mockApi'
import { LOGGED_IN, LOGGED_OUT, renderWithProviders } from './test/renderWithProviders'

describe('App routes', () => {
  it('sends a visitor from a private page to the login page', () => {
    renderWithProviders(<App />, { route: '/tanks', auth: LOGGED_OUT })

    expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('sends a visitor from a tank page to the login page', () => {
    renderWithProviders(<App />, { route: '/tanks/7', auth: LOGGED_OUT })

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

  it('opens the tank list inside the same layout', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: [] } })
    renderWithProviders(<App />, { route: '/tanks', auth: LOGGED_IN })

    expect(screen.getByRole('heading', { name: 'Bể của tôi' })).toBeInTheDocument()
    expect(await screen.findByText('Chưa có bể nào')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
  })

  it('opens the add tank form before treating "new" as an id', () => {
    renderWithProviders(<App />, { route: '/tanks/new', auth: LOGGED_IN })

    expect(screen.getByRole('heading', { name: 'Thêm bể' })).toBeInTheDocument()
  })

  it('opens the edit form for a tank id', async () => {
    mockApi({
      'GET /tanks/7': {
        status: 200,
        data: {
          id: 7,
          name: 'Bể 7',
          volumeLiters: null,
          lengthCm: null,
          widthCm: null,
          heightCm: null,
          setupDate: null,
          note: null,
          createdAt: '2026-11-21T08:00:00',
          updatedAt: '2026-11-21T08:00:00',
          fish: [],
        },
      },
    })
    renderWithProviders(<App />, { route: '/tanks/7/edit', auth: LOGGED_IN })

    expect(screen.getByRole('heading', { name: 'Sửa bể' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Tên bể')).toHaveValue('Bể 7')
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
