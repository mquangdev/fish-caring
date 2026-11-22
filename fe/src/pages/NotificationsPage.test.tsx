import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import type { AppNotification } from '@/types/api'
import NotificationsPage from './NotificationsPage'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<p>Trang Hôm nay</p>} />
      <Route path="/notifications" element={<NotificationsPage />} />
    </Routes>,
    { route: '/notifications', auth: LOGGED_IN },
  )
}

function item(id: number, status: AppNotification['status'], message: string): AppNotification {
  return { id, taskId: 3, message, status, dueAt: '2026-11-22T08:00:00', createdAt: '2026-11-22T07:30:00' }
}

const LIST = [
  item(3, 'UNREAD', 'Bể Mini 30L: sắp đến giờ cho ăn (08:00)'),
  item(2, 'READ', 'Việc chung: đến giờ thay nước trùn chỉ'),
  item(1, 'RESOLVED', 'Bể Mini 30L: đến giờ bón phân'),
]

function routes(list: AppNotification[], unread = 1) {
  return {
    'GET /notifications': { status: 200, data: list },
    'GET /notifications/unread-count': { status: 200, data: { count: unread } },
  }
}

describe('NotificationsPage', () => {
  it('shows a loading skeleton first', async () => {
    mockApi({ 'GET /notifications': () => new Promise<MockReply>(() => {}), 'GET /notifications/unread-count': { status: 200, data: { count: 0 } } })
    renderPage()

    expect(await screen.findByLabelText('Đang tải thông báo')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a friendly empty state', async () => {
    mockApi(routes([], 0))
    renderPage()

    expect(await screen.findByText('Chưa có thông báo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc tất cả' })).not.toBeInTheDocument()
  })

  it('shows an error with a retry button, and retry loads the list', async () => {
    mockApi({
      'GET /notifications': { status: 500, data: { code: 'INTERNAL_ERROR' } },
      'GET /notifications/unread-count': { status: 200, data: { count: 0 } },
    })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

    mockApi(routes(LIST))
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Bể Mini 30L: sắp đến giờ cho ăn (08:00)')).toBeInTheDocument()
  })

  it('lists the notifications in the order given, with the status as text and the time', async () => {
    mockApi(routes(LIST))
    renderPage()

    const buttons = await screen.findAllByRole('button', { name: /Bể|Việc chung/ })
    expect(buttons[0]).toHaveTextContent('Bể Mini 30L: sắp đến giờ cho ăn (08:00)')
    expect(buttons[0]).toHaveTextContent('Chưa đọc · 22/11/2026 07:30')
    expect(buttons[1]).toHaveTextContent('Đã đọc')
    expect(buttons[2]).toHaveTextContent('Đã xử lý')
  })

  it('has "Đánh dấu đã đọc tất cả" only when something is unread, and it reads everything', async () => {
    const api = mockApi({ ...routes(LIST), 'POST /notifications/read-all': { status: 204 } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc tất cả' }))

    await waitFor(() => expect(api.calls.some((c) => c.method === 'post' && c.url === '/notifications/read-all')).toBe(true))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc tất cả' })).not.toBeInTheDocument(),
    )
    expect(screen.getAllByText(/Đã đọc/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Đã xử lý/)).toBeInTheDocument()
  })

  it('tapping an unread notification marks it read and opens the today page', async () => {
    const api = mockApi({ ...routes(LIST), 'POST /notifications/3/read': { status: 204 } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /sắp đến giờ cho ăn/ }))

    expect(await screen.findByText('Trang Hôm nay')).toBeInTheDocument()
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/notifications/3/read')).toBe(true)
  })

  it('tapping a read or resolved notification just opens the today page', async () => {
    const api = mockApi(routes(LIST))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /đã xử lý|bón phân/ }))

    expect(await screen.findByText('Trang Hôm nay')).toBeInTheDocument()
    expect(api.calls.some((c) => c.method === 'post')).toBe(false)
  })

  it('opens the today page even when marking it read fails', async () => {
    mockApi({ ...routes(LIST), 'POST /notifications/3/read': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /sắp đến giờ cho ăn/ }))

    expect(await screen.findByText('Trang Hôm nay')).toBeInTheDocument()
  })
})
