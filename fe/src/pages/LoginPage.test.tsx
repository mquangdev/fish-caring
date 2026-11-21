import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { AuthState } from '@/store/authSlice'
import { mockApi, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders, TEST_USER } from '@/test/renderWithProviders'
import LoginPage from './LoginPage'

const LOGIN_OK: MockReply = { status: 200, data: { token: 'tok', user: TEST_USER } }

function renderLogin(route: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Trang chủ</p>} />
      <Route path="/tanks" element={<p>Trang bể</p>} />
    </Routes>,
    { route: '/login', ...route },
  )
}

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

describe('LoginPage', () => {
  it('shows Vietnamese validation errors and does not call the API', async () => {
    const api = mockApi({})
    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('rejects a malformed email', async () => {
    renderLogin()

    await fillAndSubmit('abc', 'secret-pass')

    expect(screen.getByText('Email không hợp lệ.')).toBeInTheDocument()
  })

  it('logs in and goes to the home page', async () => {
    mockApi({ 'POST /auth/login': LOGIN_OK })
    renderLogin()

    await fillAndSubmit('alice@example.com', 'secret-pass')

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
  })

  it('submits with Enter', async () => {
    mockApi({ 'POST /auth/login': LOGIN_OK })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'secret-pass{Enter}')

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
  })

  it('shows a generic message for wrong credentials and stays on the page', async () => {
    mockApi({ 'POST /auth/login': { status: 401, data: { code: 'INVALID_CREDENTIALS' } } })
    renderLogin()

    await fillAndSubmit('alice@example.com', 'wrong-pass')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng.')
    expect(screen.queryByText('Trang chủ')).not.toBeInTheDocument()
  })

  it('disables the button while the request is running', async () => {
    let finish: (reply: MockReply) => void = () => {}
    mockApi({ 'POST /auth/login': () => new Promise<MockReply>((resolve) => (finish = resolve)) })
    renderLogin()

    await fillAndSubmit('alice@example.com', 'secret-pass')

    const button = await screen.findByRole('button', { name: 'Đang đăng nhập...' })
    expect(button).toBeDisabled()

    finish(LOGIN_OK)
    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
  })

  it('returns to the page the user wanted before being sent to login', async () => {
    mockApi({ 'POST /auth/login': LOGIN_OK })
    renderLogin({ route: { pathname: '/login', state: { from: { pathname: '/tanks' } } } })

    await fillAndSubmit('alice@example.com', 'secret-pass')

    expect(await screen.findByText('Trang bể')).toBeInTheDocument()
  })

  it('redirects a logged-in user away from the login page', () => {
    renderLogin({ auth: LOGGED_IN satisfies AuthState })

    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
  })

  it('links to the register page', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute('href', '/register')
  })
})
