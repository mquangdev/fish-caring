import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { renderWithProviders, TEST_USER } from '@/test/renderWithProviders'
import RegisterPage from './RegisterPage'

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<p>Trang chủ</p>} />
    </Routes>,
    { route: '/register' },
  )
}

async function fill(name: string, email: string, password: string) {
  if (name) await userEvent.type(screen.getByLabelText('Tên hiển thị'), name)
  if (email) await userEvent.type(screen.getByLabelText('Email'), email)
  if (password) await userEvent.type(screen.getByLabelText('Mật khẩu'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Đăng ký' }))
}

describe('RegisterPage', () => {
  it('validates every field before calling the API', async () => {
    const api = mockApi({})
    renderRegister()

    await fill('', '', '')

    expect(screen.getByText('Vui lòng nhập tên hiển thị.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('asks for at least 8 characters', async () => {
    renderRegister()

    await fill('Alice', 'alice@example.com', 'short')

    expect(screen.getByText('Mật khẩu cần ít nhất 8 ký tự.')).toBeInTheDocument()
  })

  it('registers, signs in and goes to the home page', async () => {
    const api = mockApi({ 'POST /auth/register': { status: 201, data: { token: 'tok', user: TEST_USER } } })
    renderRegister()

    await fill('Alice', 'alice@example.com', 'secret-pass')

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
    expect(JSON.parse(api.calls[0].data as string)).toEqual({
      displayName: 'Alice',
      email: 'alice@example.com',
      password: 'secret-pass',
    })
  })

  it('tells the user when the email is already registered', async () => {
    mockApi({ 'POST /auth/register': { status: 409, data: { code: 'CONFLICT', message: 'Email is already registered' } } })
    renderRegister()

    await fill('Alice', 'alice@example.com', 'secret-pass')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email này đã được đăng ký.')
    expect(screen.queryByText('Trang chủ')).not.toBeInTheDocument()
  })

  it('shows server-side field errors next to the field', async () => {
    mockApi({
      'POST /auth/register': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', fieldErrors: { email: 'must be a well-formed email address' } },
      },
    })
    renderRegister()

    await fill('Alice', 'alice@example.com', 'secret-pass')

    expect(await screen.findByText('Email không hợp lệ.')).toBeInTheDocument()
  })

  it('uses the right autocomplete hints for password managers', () => {
    renderRegister()

    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
  })
})
