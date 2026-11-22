import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi, mockNetworkDown, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import TanksPage from './TanksPage'

function renderList() {
  return renderWithProviders(
    <Routes>
      <Route path="/tanks" element={<TanksPage />} />
      <Route path="/tanks/new" element={<p>Trang thêm bể</p>} />
      <Route path="/tanks/:id" element={<p>Trang chi tiết bể</p>} />
    </Routes>,
    { route: '/tanks', auth: LOGGED_IN },
  )
}

const TANKS = [
  { id: 2, name: 'Bể mới', volumeLiters: 120.5, taskCount: 2, nextDueAt: '2026-11-25T19:30:00' },
  { id: 1, name: 'Bể cũ', volumeLiters: null, taskCount: 0, nextDueAt: null },
]

describe('TanksPage', () => {
  it('shows a loading skeleton while the list is loading', async () => {
    mockApi({ 'GET /tanks': () => new Promise<MockReply>(() => {}) })
    renderList()

    expect(await screen.findByLabelText('Đang tải danh sách bể')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a friendly empty state with a call to action', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: [] } })
    renderList()

    expect(await screen.findByText('Chưa có bể nào')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Thêm bể đầu tiên' }))
    expect(screen.getByText('Trang thêm bể')).toBeInTheDocument()
  })

  it('lists the tanks as links with their details', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    const first = await screen.findByRole('link', { name: /Bể mới/ })
    expect(first).toHaveAttribute('href', '/tanks/2')
    expect(first).toHaveTextContent('120,5 lít')
    expect(first).not.toHaveTextContent('Cá cảnh')
    expect(first).toHaveTextContent('2 lịch chăm')
    expect(first).toHaveTextContent('Việc kế tiếp: 25/11/2026 19:30')

    const second = screen.getByRole('link', { name: /Bể cũ/ })
    expect(second).toHaveTextContent('Chưa có lịch chăm')
    expect(second).not.toHaveTextContent('lít')
  })

  it('keeps the order the server sent (newest first)', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    await screen.findByRole('link', { name: /Bể mới/ })

    const names = screen.getAllByRole('link').map((link) => link.textContent ?? '')
    expect(names.findIndex((t) => t.includes('Bể mới'))).toBeLessThan(names.findIndex((t) => t.includes('Bể cũ')))
  })

  it('opens a tank when its card is tapped', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    await userEvent.click(await screen.findByRole('link', { name: /Bể mới/ }))

    expect(screen.getByText('Trang chi tiết bể')).toBeInTheDocument()
  })

  it('has one floating "Thêm bể" button when there are tanks', async () => {
    mockApi({ 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    const add = await screen.findByRole('link', { name: 'Thêm bể' })
    expect(add).toHaveAttribute('href', '/tanks/new')
  })

  it('shows an error with a retry button, and retry loads the list', async () => {
    mockNetworkDown()
    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')

    mockApi({ 'GET /tanks': { status: 200, data: TANKS } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('link', { name: /Bể mới/ })).toBeInTheDocument()
  })
})
