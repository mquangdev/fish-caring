import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { CareTask } from '@/types/api'
import { mockApi, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import TanksPage from './TanksPage'

function renderList() {
  return renderWithProviders(
    <Routes>
      <Route path="/tanks" element={<TanksPage />} />
      <Route path="/tanks/new" element={<p>Trang thêm bể</p>} />
      <Route path="/tanks/:id" element={<p>Trang chi tiết bể</p>} />
      <Route path="/tasks/new" element={<p>Trang thêm lịch chung</p>} />
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
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': () => new Promise<MockReply>(() => {}) })
    renderList()

    expect(await screen.findByLabelText('Đang tải danh sách bể')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a friendly empty state with a call to action', async () => {
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: [] } })
    renderList()

    expect(await screen.findByText('Chưa có bể nào')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Thêm bể đầu tiên' }))
    expect(screen.getByText('Trang thêm bể')).toBeInTheDocument()
  })

  it('lists the tanks as links with their details', async () => {
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: TANKS } })
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
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    await screen.findByRole('link', { name: /Bể mới/ })

    const names = screen.getAllByRole('link').map((link) => link.textContent ?? '')
    expect(names.findIndex((t) => t.includes('Bể mới'))).toBeLessThan(names.findIndex((t) => t.includes('Bể cũ')))
  })

  it('opens a tank when its card is tapped', async () => {
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    await userEvent.click(await screen.findByRole('link', { name: /Bể mới/ }))

    expect(screen.getByText('Trang chi tiết bể')).toBeInTheDocument()
  })

  it('has one floating "Thêm bể" button when there are tanks', async () => {
    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: TANKS } })
    renderList()

    const add = await screen.findByRole('link', { name: 'Thêm bể' })
    expect(add).toHaveAttribute('href', '/tanks/new')
  })

  it('shows an error with a retry button, and retry loads the list', async () => {
    mockApi({ 'GET /tanks': { status: 500, data: { code: 'INTERNAL_ERROR' } }, 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] } })
    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

    mockApi({ 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] }, 'GET /tanks': { status: 200, data: TANKS } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('link', { name: /Bể mới/ })).toBeInTheDocument()
  })

  describe('general tasks ("Việc chung")', () => {
    const WORMS: CareTask = {
      id: 11,
      tankId: null,
      type: 'WATER_CHANGE',
      title: 'Thay nước trùn chỉ',
      note: null,
      repeatType: 'DAILY',
      intervalDays: null,
      timeOfDay: '09:00',
      startDate: null,
      foodName: null,
      waterChangePercent: 20,
      fertilizerMl: null,
      enabled: true,
      nextDueAt: '2026-11-23T09:00:00',
      createdAt: '2026-11-22T08:00:00',
      updatedAt: '2026-11-22T08:00:00',
    }

    it('shows an empty hint and an add button when there is no general task', async () => {
      mockApi({ 'GET /tanks': { status: 200, data: TANKS }, 'GET /tasks/general': { status: 200, data: [] }, 'GET /tasks/general/logs': { status: 200, data: [] } })
      renderList()

      expect(await screen.findByRole('heading', { name: 'Việc chung' })).toBeInTheDocument()
      expect(await screen.findByText(/Chưa có việc chung/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('link', { name: 'Thêm lịch chung' }))
      expect(screen.getByText('Trang thêm lịch chung')).toBeInTheDocument()
    })

    it('lists the general tasks even when the user has no tank yet', async () => {
      mockApi({ 'GET /tanks': { status: 200, data: [] }, 'GET /tasks/general': { status: 200, data: [WORMS] }, 'GET /tasks/general/logs': { status: 200, data: [] } })
      renderList()

      expect(await screen.findByText('Thay nước trùn chỉ')).toBeInTheDocument()
      expect(screen.getByText('Thay 20% nước')).toBeInTheDocument()
      expect(screen.getByText('Lần tới: 23/11/2026 09:00')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sửa lịch “Thay nước trùn chỉ”' })).toHaveAttribute('href', '/tasks/11/edit')
    })

    it('shows a loading skeleton, then an error with retry that loads the list', async () => {
      mockApi({ 'GET /tanks': { status: 200, data: TANKS }, 'GET /tasks/general': { status: 500, data: { code: 'INTERNAL_ERROR' } }, 'GET /tasks/general/logs': { status: 200, data: [] } })
      renderList()

      expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

      mockApi({ 'GET /tanks': { status: 200, data: TANKS }, 'GET /tasks/general': { status: 200, data: [WORMS] }, 'GET /tasks/general/logs': { status: 200, data: [] } })
      await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

      expect(await screen.findByText('Thay nước trùn chỉ')).toBeInTheDocument()
    })

    it('shows the history of the general tasks below the list', async () => {
      mockApi({
        'GET /tanks': { status: 200, data: TANKS },
        'GET /tasks/general': { status: 200, data: [WORMS] },
        'GET /tasks/general/logs': {
          status: 200,
          data: [
            {
              id: 1,
              tankId: null,
              taskId: 11,
              taskTitle: 'Thay nước trùn chỉ',
              result: 'SNOOZED',
              dueAt: '2026-11-22T09:00:00',
              actedAt: '2026-11-22T09:10:00',
            },
          ],
        },
      })
      renderList()

      expect(await screen.findByRole('heading', { name: 'Lịch sử' })).toBeInTheDocument()
      expect(await screen.findByText('Hoãn đến mai · 22/11/2026 09:10')).toBeInTheDocument()
    })

    it('says there is no history yet for the general tasks', async () => {
      mockApi({
        'GET /tanks': { status: 200, data: TANKS },
        'GET /tasks/general': { status: 200, data: [WORMS] },
        'GET /tasks/general/logs': { status: 200, data: [] },
      })
      renderList()

      expect(await screen.findByText('Chưa có lịch sử chăm')).toBeInTheDocument()
    })

    it('turns a general task off with its switch and reloads the section', async () => {
      const api = mockApi({
        'GET /tanks': { status: 200, data: TANKS },
        'GET /tasks/general': { status: 200, data: [WORMS] }, 'GET /tasks/general/logs': { status: 200, data: [] },
        'PATCH /tasks/11/enabled': { status: 200, data: { ...WORMS, enabled: false, nextDueAt: null } },
      })
      renderList()

      await userEvent.click(await screen.findByRole('switch', { name: 'Bật nhắc “Thay nước trùn chỉ”' }))

      await waitFor(() => expect(api.calls.filter((c) => c.url === '/tasks/general')).toHaveLength(2))
      expect(JSON.parse(api.calls.find((c) => c.method === 'patch')!.data as string)).toEqual({ enabled: false })
    })

    it('deletes a general task after confirmation', async () => {
      const api = mockApi({
        'GET /tanks': { status: 200, data: TANKS },
        'GET /tasks/general': { status: 200, data: [WORMS] }, 'GET /tasks/general/logs': { status: 200, data: [] },
        'DELETE /tasks/11': { status: 204 },
      })
      renderList()

      await userEvent.click(await screen.findByRole('button', { name: 'Xoá lịch “Thay nước trùn chỉ”' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá lịch' }))

      await waitFor(() => expect(api.calls.some((c) => c.method === 'delete' && c.url === '/tasks/11')).toBe(true))
    })
  })
})
