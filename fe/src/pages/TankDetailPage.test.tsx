import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { mockApi, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import type { CareLog, CareTask, Tank } from '@/types/api'
import TankDetailPage from './TankDetailPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderDetail(route = '/tanks/7') {
  return renderWithProviders(
    <Routes>
      <Route path="/tanks" element={<p>Danh sách bể</p>} />
      <Route path="/tanks/:id" element={<TankDetailPage />} />
      <Route path="/tanks/:id/edit" element={<p>Trang sửa bể</p>} />
    </Routes>,
    { route, auth: LOGGED_IN },
  )
}

const TANK: Tank = {
  id: 7,
  name: 'Bể thủy sinh',
  volumeLiters: 90,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: '2026-01-15',
  note: 'Đặt cạnh cửa sổ',
  createdAt: '2026-11-21T08:00:00',
  updatedAt: '2026-11-21T08:00:00',
  fish: [
    { id: 13, speciesName: 'Betta', quantity: 1, status: 'ALIVE' },
    { id: 12, speciesName: 'Neon', quantity: 10, status: 'ALIVE' },
    { id: 11, speciesName: 'Tép đỏ', quantity: 3, status: 'DEAD' },
  ],
  tasks: [],
}

const WATER: CareTask = {
  id: 3,
  tankId: 7,
  type: 'WATER_CHANGE',
  title: 'Thay nước tuần',
  note: null,
  repeatType: 'EVERY_N_DAYS',
  intervalDays: 7,
  timeOfDay: '19:00',
  startDate: '2026-11-21',
  foodName: null,
  waterChangePercent: 30,
  fertilizerMl: null,
  enabled: true,
  nextDueAt: '2026-11-28T19:00:00',
  createdAt: '2026-11-20T08:00:00',
  updatedAt: '2026-11-20T08:00:00',
}

const FEED: CareTask = {
  ...WATER,
  id: 4,
  type: 'FEED',
  title: 'Cho ăn',
  repeatType: 'DAILY',
  intervalDays: null,
  startDate: null,
  timeOfDay: '08:00',
  waterChangePercent: null,
  foodName: 'Hạt 1mm',
  enabled: false,
  nextDueAt: null,
}

describe('TankDetailPage', () => {
  it('shows a loading skeleton first', async () => {
    mockApi({ 'GET /tanks/7': () => new Promise<MockReply>(() => {}) })
    renderDetail()

    expect(await screen.findByLabelText('Đang tải bể')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the tank information', async () => {
    mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Bể thủy sinh' })).toBeInTheDocument()
    expect(screen.getByText('Thể tích')).toBeInTheDocument()
    expect(screen.getByText('90 lít')).toBeInTheDocument()
    expect(screen.queryByText('Kích thước')).not.toBeInTheDocument()
    expect(screen.queryByText('Loại bể')).not.toBeInTheDocument()
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()
    expect(screen.getByText('Đặt cạnh cửa sổ')).toBeInTheDocument()
  })

  it('shows the dimensions next to the volume when the tank has them', async () => {
    mockApi({
      'GET /tanks/7': {
        status: 200,
        data: { ...TANK, volumeLiters: 64.8, lengthCm: 60, widthCm: 30, heightCm: 36 },
      },
    })
    renderDetail()

    expect(await screen.findByText('64,8 lít')).toBeInTheDocument()
    expect(screen.getByText('Kích thước')).toBeInTheDocument()
    expect(screen.getByText('60 × 30 × 36 cm')).toBeInTheDocument()
  })

  it('groups the fish into alive and dead with totals, newest first', async () => {
    mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
    renderDetail()

    expect(await screen.findByText('Còn sống · 11 con')).toBeInTheDocument()
    expect(screen.getByText('Đã chết · 3 con')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
    expect(items.findIndex((t) => t.includes('Betta'))).toBeLessThan(items.findIndex((t) => t.includes('Neon')))
    expect(items.some((t) => t.includes('Tép đỏ') && t.includes('3 con'))).toBe(true)
  })

  it('hides optional information that is empty and says when there is no fish', async () => {
    mockApi({
      'GET /tanks/7': { status: 200, data: { ...TANK, volumeLiters: null, setupDate: null, note: null, fish: [] } },
    })
    renderDetail()

    await screen.findByRole('heading', { name: 'Bể thủy sinh' })
    expect(screen.queryByText('Thể tích')).not.toBeInTheDocument()
    expect(screen.queryByText('Ngày setup')).not.toBeInTheDocument()
    expect(screen.queryByText('Ghi chú')).not.toBeInTheDocument()
    expect(screen.getByText(/Chưa có cá nào/)).toBeInTheDocument()
  })

  it('has "Sửa bể" as the main action', async () => {
    mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
    renderDetail()

    await userEvent.click(await screen.findByRole('link', { name: 'Sửa bể' }))

    expect(screen.getByText('Trang sửa bể')).toBeInTheDocument()
  })

  it('asks for confirmation before deleting and cancel keeps the tank', async () => {
    const api = mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Xoá bể' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Xoá bể “Bể thủy sinh”?')
    expect(screen.getByRole('dialog')).toHaveTextContent('không khôi phục được')

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.calls.some((call) => call.method === 'delete')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Bể thủy sinh' })).toBeInTheDocument()
  })

  it('confirming deletes the tank and returns to the list', async () => {
    const api = mockApi({
      'GET /tanks/7': { status: 200, data: TANK },
      'DELETE /tanks/7': { status: 204 },
    })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Xoá bể' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá bể' }))

    expect(await screen.findByText('Danh sách bể')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'delete' && call.url === '/tanks/7')).toBe(true)
  })

  it('shows the error in the dialog when deleting fails and keeps the tank', async () => {
    mockApi({
      'GET /tanks/7': { status: 200, data: TANK },
      'DELETE /tanks/7': { status: 500, data: { code: 'INTERNAL_ERROR' } },
    })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Xoá bể' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá bể' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
    expect(screen.queryByText('Danh sách bể')).not.toBeInTheDocument()
  })

  it('says so when the tank does not exist or belongs to someone else', async () => {
    mockApi({ 'GET /tanks/7': { status: 404, data: { code: 'NOT_FOUND', message: 'Tank not found' } } })
    renderDetail()

    expect(await screen.findByText('Không tìm thấy bể')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về danh sách bể' })).toBeInTheDocument()
  })

  it('treats a broken id as not found without calling the API', async () => {
    const api = mockApi({})
    renderDetail('/tanks/abc')

    expect(await screen.findByText('Không tìm thấy bể')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('offers a retry when loading fails', async () => {
    mockApi({ 'GET /tanks/7': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderDetail()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

    mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('heading', { name: 'Bể thủy sinh' })).toBeInTheDocument()
  })

  describe('care history', () => {
    const LOG: CareLog = {
      id: 1,
      tankId: 7,
      taskId: 3,
      taskTitle: 'Thay nước tuần',
      result: 'DONE',
      dueAt: '2026-11-21T19:00:00',
      actedAt: '2026-11-21T19:05:00',
    }

    it('lists the recent care history of the tank', async () => {
      mockApi({
        'GET /tanks/7': { status: 200, data: TANK },
        'GET /tanks/7/logs': { status: 200, data: [LOG] },
      })
      renderDetail()

      const section = await screen.findByRole('region', { name: 'Lịch sử chăm' })
      expect(await within(section).findByText('Thay nước tuần')).toBeInTheDocument()
      expect(within(section).getByText('Hoàn thành · 21/11/2026 19:05')).toBeInTheDocument()
    })

    it('says so when there is no history yet', async () => {
      mockApi({ 'GET /tanks/7': { status: 200, data: TANK }, 'GET /tanks/7/logs': { status: 200, data: [] } })
      renderDetail()

      expect(await screen.findByText('Chưa có lịch sử chăm')).toBeInTheDocument()
    })

    it('shows an error with retry when the history cannot be loaded', async () => {
      mockApi({
        'GET /tanks/7': { status: 200, data: TANK },
        'GET /tanks/7/logs': { status: 500, data: { code: 'INTERNAL_ERROR' } },
      })
      renderDetail()

      const section = await screen.findByRole('region', { name: 'Lịch sử chăm' })
      expect(await within(section).findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
      expect(within(section).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    })
  })

  describe('care schedule', () => {
    it('shows an empty state with an add button when there is no task', async () => {
      mockApi({ 'GET /tanks/7': { status: 200, data: TANK } })
      renderDetail()

      expect(await screen.findByText('Chưa có lịch chăm')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Thêm lịch chăm' })).toHaveAttribute('href', '/tanks/7/tasks/new')
    })

    it('lists each task with its detail, repeat, next time and state', async () => {
      mockApi({ 'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [WATER, FEED] } } })
      renderDetail()

      expect(await screen.findByText('Thay nước tuần')).toBeInTheDocument()
      expect(screen.getByText('Thay 30% nước')).toBeInTheDocument()
      expect(screen.getByText('Mỗi 7 ngày 19:00')).toBeInTheDocument()
      expect(screen.getByText('Lần tới: 28/11/2026 19:00')).toBeInTheDocument()
      expect(screen.getByText('Thức ăn: Hạt 1mm')).toBeInTheDocument()
      expect(screen.getByText('Mỗi ngày 08:00')).toBeInTheDocument()
      expect(screen.getByText('Đã tắt')).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: 'Bật nhắc “Thay nước tuần”' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('switch', { name: 'Bật nhắc “Cho ăn”' })).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByRole('link', { name: 'Sửa lịch “Thay nước tuần”' })).toHaveAttribute(
        'href',
        '/tasks/3/edit',
      )
    })

    it('turns a task off with the switch and reloads the tank', async () => {
      const api = mockApi({
        'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [WATER] } },
        'PATCH /tasks/3/enabled': { status: 200, data: { ...WATER, enabled: false, nextDueAt: null } },
      })
      renderDetail()

      await userEvent.click(await screen.findByRole('switch', { name: 'Bật nhắc “Thay nước tuần”' }))

      await waitFor(() => expect(api.calls.filter((c) => c.method === 'get' && c.url === '/tanks/7')).toHaveLength(2))
      const patch = api.calls.find((c) => c.method === 'patch')!
      expect(JSON.parse(patch.data as string)).toEqual({ enabled: false })
    })

    it('tells the user to fix the date when a past one-off task cannot be turned on', async () => {
      mockApi({
        'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [{ ...FEED, repeatType: 'ONCE' }] } },
        'PATCH /tasks/4/enabled': {
          status: 400,
          data: { code: 'VALIDATION_ERROR', message: 'Invalid', fieldErrors: { startDate: 'must be in the future' } },
        },
      })
      renderDetail()

      await userEvent.click(await screen.findByRole('switch', { name: 'Bật nhắc “Cho ăn”' }))

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Hãy sửa ngày giờ')))
      expect(screen.getByRole('switch', { name: 'Bật nhắc “Cho ăn”' })).toHaveAttribute('aria-checked', 'false')
    })

    it('asks before deleting a task; cancel keeps it', async () => {
      const api = mockApi({ 'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [WATER] } } })
      renderDetail()

      await userEvent.click(await screen.findByRole('button', { name: 'Xoá lịch “Thay nước tuần”' }))
      expect(screen.getByRole('dialog')).toHaveTextContent('Xoá lịch “Thay nước tuần”?')
      expect(screen.getByRole('dialog')).toHaveTextContent('Nhật ký đã ghi của lịch này vẫn được giữ.')
      await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(api.calls.some((c) => c.method === 'delete')).toBe(false)
      expect(screen.getByText('Thay nước tuần')).toBeInTheDocument()
    })

    it('confirming deletes the task and reloads the list', async () => {
      const api = mockApi({
        'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [WATER] } },
        'DELETE /tasks/3': { status: 204 },
      })
      renderDetail()

      await userEvent.click(await screen.findByRole('button', { name: 'Xoá lịch “Thay nước tuần”' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá lịch' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(api.calls.some((c) => c.method === 'delete' && c.url === '/tasks/3')).toBe(true)
      await waitFor(() => expect(api.calls.filter((c) => c.method === 'get' && c.url === '/tanks/7')).toHaveLength(2))
    })

    it('shows the error in the dialog when deleting a task fails', async () => {
      mockApi({
        'GET /tanks/7': { status: 200, data: { ...TANK, tasks: [WATER] } },
        'DELETE /tasks/3': { status: 500, data: { code: 'INTERNAL_ERROR' } },
      })
      renderDetail()

      await userEvent.click(await screen.findByRole('button', { name: 'Xoá lịch “Thay nước tuần”' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá lịch' }))

      expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
      expect(screen.getByText('Thay nước tuần')).toBeInTheDocument()
    })
  })
})
