import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import { AppLayout } from './AppLayout'

function renderLayout(count: number) {
  mockApi({ 'GET /notifications/unread-count': { status: 200, data: { count } } })
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<p>Nội dung</p>} />
      </Route>
    </Routes>,
    { route: '/', auth: LOGGED_IN },
  )
}

describe('AppLayout notification badge', () => {
  it('shows the number of unread notifications on the bell, with text for screen readers', async () => {
    renderLayout(3)

    const link = await screen.findByRole('link', { name: /Thông báo, 3 chưa đọc/ })
    expect(link).toHaveAttribute('href', '/notifications')
    expect(link).toHaveTextContent('3')
  })

  it('shows 9+ when there are many', async () => {
    renderLayout(25)

    const link = await screen.findByRole('link', { name: /Thông báo, 25 chưa đọc/ })
    expect(link).toHaveTextContent('9+')
  })

  it('shows no badge when everything is read', async () => {
    renderLayout(0)

    const link = await screen.findByRole('link', { name: 'Thông báo' })
    expect(link).not.toHaveTextContent('chưa đọc')
    expect(link.textContent).toBe('Thông báo')
  })
})
