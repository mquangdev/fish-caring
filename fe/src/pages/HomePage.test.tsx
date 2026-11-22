import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi, type MockReply } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import type { TodayItem } from '@/types/api'
import HomePage from './HomePage'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderHome() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tanks/:id" element={<p>Chi tiết bể</p>} />
    </Routes>,
    { route: '/', auth: LOGGED_IN },
  )
}

const FEED: TodayItem = {
  id: 3,
  tankId: 7,
  tankName: 'Bể thủy sinh',
  type: 'FEED',
  title: 'Cho ăn',
  note: null,
  repeatType: 'DAILY',
  timeOfDay: '08:00',
  foodName: 'Hạt 1mm',
  waterChangePercent: null,
  fertilizerMl: null,
  nextDueAt: '2026-11-21T08:00:00',
}

const WORMS: TodayItem = {
  ...FEED,
  id: 4,
  tankId: null,
  tankName: null,
  type: 'WATER_CHANGE',
  title: 'Thay nước trùn chỉ',
  foodName: null,
  waterChangePercent: 20,
  nextDueAt: '2026-11-19T09:00:00',
}

const LATER: TodayItem = { ...FEED, id: 5, title: 'Bón phân tối', nextDueAt: '2026-11-21T21:30:00' }

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    // 21/11/2026 10:00 Vietnam time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-21T03:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets the user and shows a loading skeleton first', async () => {
    mockApi({ 'GET /today': () => new Promise<MockReply>(() => {}) })
    renderHome()

    expect(screen.getByRole('heading', { name: 'Xin chào, Alice' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Đang tải việc hôm nay')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a friendly empty state when there is nothing to do', async () => {
    mockApi({ 'GET /today': { status: 200, data: { due: [], upcoming: [] } } })
    renderHome()

    expect(await screen.findByText('Hôm nay không có việc gì, nghỉ ngơi thôi')).toBeInTheDocument()
  })

  it('shows an error with a retry button, and retry loads the list', async () => {
    mockApi({ 'GET /today': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

    mockApi({ 'GET /today': { status: 200, data: { due: [FEED], upcoming: [] } } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('region', { name: 'Đến giờ / Quá hạn' })).toBeInTheDocument()
  })

  it('groups the tasks: due and overdue first, then the ones still to come today', async () => {
    mockApi({ 'GET /today': { status: 200, data: { due: [WORMS, FEED], upcoming: [LATER] } } })
    renderHome()

    const due = await screen.findByRole('region', { name: 'Đến giờ / Quá hạn' })
    expect(within(due).getAllByRole('button', { name: 'Hoàn thành' })).toHaveLength(2)
    expect(within(due).getByText('Quá hạn')).toBeInTheDocument()
    expect(within(due).getByText('Việc chung')).toBeInTheDocument()
    expect(within(due).getByRole('link', { name: 'Bể thủy sinh' })).toHaveAttribute('href', '/tanks/7')
    expect(within(due).getByText('Thức ăn: Hạt 1mm')).toBeInTheDocument()

    const upcoming = screen.getByRole('region', { name: 'Sắp tới hôm nay' })
    expect(within(upcoming).getByText('Bón phân tối')).toBeInTheDocument()
    // tasks that are not due yet can be completed or snoozed too, but only "Hoàn thành" of a due task is the main button
    expect(within(upcoming).getByRole('button', { name: 'Hoàn thành' })).toBeEnabled()
    expect(within(upcoming).getByRole('button', { name: 'Hoãn đến mai' })).toBeEnabled()
    expect(within(upcoming).getByRole('button', { name: 'Hoàn thành' }).className).not.toBe(
      within(due).getAllByRole('button', { name: 'Hoàn thành' })[0].className,
    )
  })

  it('shows only the upcoming group when nothing is due yet', async () => {
    mockApi({ 'GET /today': { status: 200, data: { due: [], upcoming: [LATER] } } })
    renderHome()

    expect(await screen.findByRole('region', { name: 'Sắp tới hôm nay' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Đến giờ / Quá hạn' })).not.toBeInTheDocument()
  })

  it('completing a task calls the API, thanks the user and reloads so the card disappears', async () => {
    let reloaded = false
    const api = mockApi({
      'GET /today': () => ({ status: 200, data: { due: reloaded ? [] : [FEED], upcoming: [] } }),
      'POST /tasks/3/complete': () => {
        reloaded = true
        return { status: 200, data: { id: 3, nextDueAt: '2026-11-22T08:00:00' } }
      },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoàn thành' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã hoàn thành “Cho ăn”.'))
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/tasks/3/complete')).toBe(true)
    expect(await screen.findByText('Hôm nay không có việc gì, nghỉ ngơi thôi')).toBeInTheDocument()
  })

  it('completes a task that is not due yet and it leaves the upcoming group', async () => {
    let reloaded = false
    const api = mockApi({
      'GET /today': () => ({ status: 200, data: { due: [], upcoming: reloaded ? [] : [LATER] } }),
      'POST /tasks/5/complete': () => {
        reloaded = true
        return { status: 200, data: { id: 5, nextDueAt: '2026-11-22T21:30:00' } }
      },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoàn thành' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã hoàn thành “Bón phân tối”.'))
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/tasks/5/complete')).toBe(true)
    expect(await screen.findByText('Hôm nay không có việc gì, nghỉ ngơi thôi')).toBeInTheDocument()
  })

  it('snoozes a task that is not due yet to the same time tomorrow', async () => {
    const api = mockApi({
      'GET /today': { status: 200, data: { due: [], upcoming: [LATER] } },
      'POST /tasks/5/snooze': { status: 200, data: { id: 5, nextDueAt: '2026-11-22T21:30:00' } },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoãn đến mai' }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Đã hoãn “Bón phân tối” đến 22/11/2026 21:30.'),
    )
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/tasks/5/snooze')).toBe(true)
  })

  it('locks only the upcoming card being acted on', async () => {
    let release: (() => void) | null = null
    mockApi({
      'GET /today': { status: 200, data: { due: [FEED], upcoming: [LATER] } },
      'POST /tasks/5/complete': () =>
        new Promise<MockReply>((resolve) => {
          release = () => resolve({ status: 200, data: { id: 5, nextDueAt: '2026-11-22T21:30:00' } })
        }),
    })
    renderHome()
    const upcoming = await screen.findByRole('region', { name: 'Sắp tới hôm nay' })
    const due = screen.getByRole('region', { name: 'Đến giờ / Quá hạn' })

    await userEvent.click(within(upcoming).getByRole('button', { name: 'Hoàn thành' }))

    await waitFor(() => expect(within(upcoming).getByRole('button', { name: 'Hoàn thành' })).toBeDisabled())
    expect(within(due).getByRole('button', { name: 'Hoàn thành' })).toBeEnabled()
    await vi.waitFor(() => expect(release).not.toBeNull())
    release!()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it('reloads the unread count after completing or snoozing, because the notification is resolved', async () => {
    const api = mockApi({
      'GET /today': { status: 200, data: { due: [FEED], upcoming: [] } },
      'GET /notifications/unread-count': { status: 200, data: { count: 0 } },
      'POST /tasks/3/snooze': { status: 200, data: { id: 3, nextDueAt: '2026-11-22T08:00:00' } },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoãn đến mai' }))

    await waitFor(() => expect(api.calls.some((c) => c.url === '/notifications/unread-count')).toBe(true))
  })

  it('snoozing a task calls the API and tells the user the new time', async () => {
    const api = mockApi({
      'GET /today': { status: 200, data: { due: [FEED], upcoming: [] } },
      'POST /tasks/3/snooze': { status: 200, data: { id: 3, nextDueAt: '2026-11-22T08:00:00' } },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoãn đến mai' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã hoãn “Cho ăn” đến 22/11/2026 08:00.'))
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/tasks/3/snooze')).toBe(true)
  })

  it('locks the buttons of the card while the request runs so it is not sent twice', async () => {
    let release: (() => void) | null = null
    const api = mockApi({
      'GET /today': { status: 200, data: { due: [FEED, WORMS], upcoming: [] } },
      'POST /tasks/3/complete': () =>
        new Promise<MockReply>((resolve) => {
          release = () => resolve({ status: 200, data: { id: 3, nextDueAt: '2026-11-22T08:00:00' } })
        }),
    })
    renderHome()
    const cards = await screen.findAllByRole('listitem')
    const feedCard = cards.find((card) => card.textContent?.includes('Cho ăn'))!
    const wormsCard = cards.find((card) => card.textContent?.includes('trùn chỉ'))!

    await userEvent.click(within(feedCard).getByRole('button', { name: 'Hoàn thành' }))

    await waitFor(() => expect(within(feedCard).getByRole('button', { name: 'Hoàn thành' })).toBeDisabled())
    expect(within(feedCard).getByRole('button', { name: 'Hoãn đến mai' })).toBeDisabled()
    expect(within(wormsCard).getByRole('button', { name: 'Hoàn thành' })).toBeEnabled()
    await vi.waitFor(() => expect(release).not.toBeNull())
    release!()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(api.calls.filter((c) => c.method === 'post')).toHaveLength(1)
  })

  it('tells the user in Vietnamese when the task was turned off and reloads the list', async () => {
    const api = mockApi({
      'GET /today': { status: 200, data: { due: [FEED], upcoming: [] } },
      'POST /tasks/3/complete': { status: 409, data: { code: 'CONFLICT', message: 'Task is turned off' } },
    })
    renderHome()

    await userEvent.click(await screen.findByRole('button', { name: 'Hoàn thành' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Lịch này đang tắt nên không thể thực hiện.'))
    await waitFor(() => expect(api.calls.filter((c) => c.url === '/today')).toHaveLength(2))
  })
})
