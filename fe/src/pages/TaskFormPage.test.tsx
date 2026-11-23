import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import type { CareTask } from '@/types/api'
import TaskFormPage from './TaskFormPage'

function renderForm(route = '/tanks/7/tasks/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/tanks" element={<p>Danh sách bể</p>} />
      <Route path="/tanks/:id" element={<p>Chi tiết bể</p>} />
      <Route path="/tanks/:id/tasks/new" element={<TaskFormPage />} />
      <Route path="/tasks/new" element={<TaskFormPage />} />
      <Route path="/tasks/:taskId/edit" element={<TaskFormPage />} />
    </Routes>,
    { route, auth: LOGGED_IN },
  )
}

const TASK: CareTask = {
  id: 3,
  tankId: 7,
  type: 'WATER_CHANGE',
  title: 'Thay nước tuần',
  note: 'Dùng nước khử clo',
  repeatType: 'EVERY_N_DAYS',
  intervalDays: 7,
  timeOfDay: '19:00',
  startDate: '2026-11-21',
  foodName: null,
  waterChangePercent: 30,
  fertilizerMl: null,
  enabled: true,
  nextDueAt: '2026-11-21T19:00:00',
  createdAt: '2026-11-20T08:00:00',
  updatedAt: '2026-11-20T08:00:00',
}

const TANKS = [
  { id: 8, name: 'Bể thủy sinh', volumeLiters: 90, taskCount: 0, nextDueAt: null },
  { id: 7, name: 'Bể cá vàng', volumeLiters: 60, taskCount: 1, nextDueAt: null },
]

const SAVED = { ...TASK, id: 9 }

function body(call: { data?: unknown }) {
  return JSON.parse(call.data as string)
}

function withTanks(extra: Record<string, Parameters<typeof mockApi>[0][string]> = {}) {
  return mockApi({ 'GET /tanks': { status: 200, data: TANKS }, ...extra })
}

describe('TaskFormPage', () => {
  beforeEach(() => {
    // 21/11/2026 08:00 Vietnam time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-21T01:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a loading skeleton while the tanks load', async () => {
    mockApi({ 'GET /tanks': () => new Promise(() => {}) })
    renderForm()

    expect(await screen.findByLabelText('Đang tải lịch chăm')).toHaveAttribute('aria-busy', 'true')
  })

  it('shows an error with retry when the tanks cannot be loaded', async () => {
    mockApi({ 'GET /tanks': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderForm()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('says when the preset tank does not exist', async () => {
    withTanks()
    renderForm('/tanks/99/tasks/new')

    expect(await screen.findByText('Không tìm thấy bể')).toBeInTheDocument()
  })

  it('opened from a tank it is attached to that tank and shows its name', async () => {
    withTanks()
    renderForm()

    expect(await screen.findByLabelText('Gắn với')).toHaveValue('7')
    expect(screen.getByRole('heading', { name: 'Thêm lịch chăm' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveTextContent('Bể cá vàng')
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Cho ăn')
    expect(screen.getByLabelText('Giờ nhắc')).toHaveTextContent('08:00')
    // exactly 08:00 now, so the first reminder is tomorrow
    expect(screen.getByText('Lần nhắc đầu tiên: 22/11/2026 08:00')).toBeInTheDocument()
  })

  it('opened as a general task it has no tank and offers every tank', async () => {
    withTanks()
    renderForm('/tasks/new')

    const select = await screen.findByLabelText('Gắn với')
    expect(select).toHaveValue('')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Không gắn bể',
      'Bể thủy sinh',
      'Bể cá vàng',
    ])
    expect(screen.getByText('Việc chung')).toBeInTheDocument()
  })

  it('shows only the extra input of the chosen type', async () => {
    withTanks()
    renderForm()
    await screen.findByLabelText('Tiêu đề')

    expect(screen.getByLabelText('Loại thức ăn')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Thay nước' }))
    expect(screen.getByLabelText('Thay bao nhiêu % nước')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loại thức ăn')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Bón phân' }))
    expect(screen.getByLabelText('Lượng phân nước (ml)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Khác' }))
    expect(screen.queryByLabelText('Lượng phân nước (ml)')).not.toBeInTheDocument()
  })

  it('fills the default title for a type but never overwrites one the user typed', async () => {
    withTanks()
    renderForm()
    const title = await screen.findByLabelText('Tiêu đề')

    await userEvent.click(screen.getByRole('radio', { name: 'Thay nước' }))
    expect(title).toHaveValue('Thay nước')
    await userEvent.click(screen.getByRole('radio', { name: 'Khác' }))
    expect(title).toHaveValue('')

    await userEvent.type(title, 'Vệ sinh lọc')
    await userEvent.click(screen.getByRole('radio', { name: 'Bón phân' }))
    expect(title).toHaveValue('Vệ sinh lọc')
  })

  it('shows the fields of each repeat type and the date as dd/MM/yyyy', async () => {
    withTanks()
    renderForm()
    await screen.findByLabelText('Tiêu đề')
    expect(screen.queryByLabelText('Số ngày')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Mỗi N ngày' }))
    expect(screen.getByLabelText('Số ngày')).toHaveValue('7')
    expect(screen.getByLabelText('Ngày bắt đầu')).toHaveValue('21/11/2026')
    // starts today at 08:00, which is not after now, so the next step is 7 days later
    expect(screen.getByText('Lần nhắc đầu tiên: 28/11/2026 08:00')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Một lần' }))
    expect(screen.queryByLabelText('Số ngày')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ngày')).toHaveValue('21/11/2026')
    expect(screen.getByText('Lần nhắc đầu tiên: 21/11/2026 08:00')).toBeInTheDocument()
  })

  it('takes the date typed as dd/MM/yyyy and updates the preview', async () => {
    withTanks()
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Một lần' }))

    const date = screen.getByLabelText('Ngày')
    await userEvent.clear(date)
    await userEvent.type(date, '25112026')

    expect(date).toHaveValue('25/11/2026')
    expect(screen.getByText('Lần nhắc đầu tiên: 25/11/2026 08:00')).toBeInTheDocument()
  })

  async function pickTime(hour: string, minute: string) {
    await userEvent.click(screen.getByLabelText('Giờ nhắc'))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(within(dialog).getByRole('listbox', { name: 'Giờ' })).getByRole('option', { name: hour }))
    await userEvent.click(within(within(dialog).getByRole('listbox', { name: 'Phút' })).getByRole('option', { name: minute }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xong' }))
  }

  it('picks the reminder time on the 24-hour clock, never AM or PM', async () => {
    withTanks()
    renderForm()
    const time = await screen.findByLabelText('Giờ nhắc')

    expect(time).toHaveTextContent('08:00')
    expect(screen.queryByText(/\b(AM|PM)\b/)).not.toBeInTheDocument()

    await pickTime('19', '30')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(time).toHaveTextContent('19:30')
    // 19:30 today is after 08:00 now, so the first reminder is today
    expect(screen.getByText('Lần nhắc đầu tiên: 21/11/2026 19:30')).toBeInTheDocument()
  })

  it('offers hours 00 to 23 and minutes in steps of 5', async () => {
    withTanks()
    renderForm()
    await userEvent.click(await screen.findByLabelText('Giờ nhắc'))
    const dialog = await screen.findByRole('dialog')

    const hours = within(within(dialog).getByRole('listbox', { name: 'Giờ' })).getAllByRole('option')
    expect(hours.map((o) => o.textContent)).toHaveLength(24)
    expect(hours[0]).toHaveTextContent('00')
    expect(hours[23]).toHaveTextContent('23')
    const minutes = within(within(dialog).getByRole('listbox', { name: 'Phút' })).getAllByRole('option')
    expect(minutes.map((o) => o.textContent)).toEqual(
      ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
    )
  })

  it('starts the sheet on the current time and closing it leaves the time unchanged', async () => {
    withTanks()
    renderForm()
    await userEvent.click(await screen.findByLabelText('Giờ nhắc'))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('option', { name: '08', selected: true })).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: '00', selected: true })).toBeInTheDocument()

    await userEvent.click(within(within(dialog).getByRole('listbox', { name: 'Giờ' })).getByRole('option', { name: '21' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Giờ nhắc')).toHaveTextContent('08:00')
  })

  it('moves the chosen hour with the arrow keys', async () => {
    withTanks()
    renderForm()
    await userEvent.click(await screen.findByLabelText('Giờ nhắc'))
    const dialog = await screen.findByRole('dialog')

    const hours = within(dialog).getByRole('listbox', { name: 'Giờ' })
    hours.focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xong' }))

    expect(screen.getByLabelText('Giờ nhắc')).toHaveTextContent('10:00')
  })

  it('leaves the time as it was when Xong is pressed without changes', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: SAVED } })
    renderForm()
    await userEvent.click(await screen.findByLabelText('Giờ nhắc'))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xong' }))
    expect(screen.getByLabelText('Giờ nhắc')).toHaveTextContent('08:00')
    expect(api.calls.some((call) => call.method === 'post')).toBe(false)
  })

  it('sends the chosen time to the server as HH:mm', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: SAVED } })
    renderForm()
    await screen.findByLabelText('Giờ nhắc')
    await pickTime('21', '45')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(body(api.calls.find((c) => c.method === 'post')!).timeOfDay).toBe('21:45')
  })

  it('does not call the API when the input is invalid and shows the errors by the fields', async () => {
    const api = withTanks()
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Thay nước' }))
    await userEvent.clear(screen.getByLabelText('Tiêu đề'))
    await userEvent.type(screen.getByLabelText('Thay bao nhiêu % nước'), '101')
    await userEvent.click(screen.getByRole('radio', { name: 'Mỗi N ngày' }))
    await userEvent.clear(screen.getByLabelText('Số ngày'))
    await userEvent.type(screen.getByLabelText('Số ngày'), '1')
    await userEvent.clear(screen.getByLabelText('Ngày bắt đầu'))

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Vui lòng nhập tiêu đề.')).toBeInTheDocument()
    expect(screen.getByText('Phần trăm nước từ 1 đến 100.')).toBeInTheDocument()
    expect(screen.getByText('Số ngày từ 2 đến 60.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng chọn ngày bắt đầu.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'post')).toBe(false)
  })

  it('rejects a date that is not a real dd/MM/yyyy date', async () => {
    const api = withTanks()
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Mỗi N ngày' }))
    const date = screen.getByLabelText('Ngày bắt đầu')
    await userEvent.clear(date)
    await userEvent.type(date, '30022026')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Ngày chưa hợp lệ. Nhập theo dd/MM/yyyy.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'post')).toBe(false)
  })

  it('rejects a one-off task in the past', async () => {
    const api = withTanks()
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Một lần' }))
    // 08:00 today is exactly now, so it is not in the future
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Hãy chọn thời điểm trong tương lai.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'post')).toBe(false)
  })

  it('creates a daily feed task in the tank with a food name and only that detail', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: SAVED } })
    renderForm()
    await userEvent.type(await screen.findByLabelText('Loại thức ăn'), ' Hạt 1mm ')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Chi tiết bể')).toBeInTheDocument()
    expect(body(api.calls.find((c) => c.method === 'post')!)).toEqual({
      tankId: 7,
      type: 'FEED',
      title: 'Cho ăn',
      note: null,
      repeatType: 'DAILY',
      intervalDays: null,
      timeOfDay: '08:00',
      startDate: null,
      foodName: 'Hạt 1mm',
      waterChangePercent: null,
      fertilizerMl: null,
    })
  })

  it('creates a general task without a tank and returns to the tank list', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: { ...SAVED, tankId: null } } })
    renderForm('/tasks/new')
    await userEvent.click(await screen.findByRole('radio', { name: 'Thay nước' }))
    await userEvent.type(screen.getByLabelText('Thay bao nhiêu % nước'), '20')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Danh sách bể')).toBeInTheDocument()
    expect(body(api.calls.find((c) => c.method === 'post')!)).toMatchObject({
      tankId: null,
      type: 'WATER_CHANGE',
      waterChangePercent: 20,
    })
  })

  it('sends the interval and the ISO start date of an every-N-days task', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: SAVED } })
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Mỗi N ngày' }))

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(body(api.calls.find((c) => c.method === 'post')!)).toMatchObject({
      repeatType: 'EVERY_N_DAYS',
      intervalDays: 7,
      startDate: '2026-11-21',
    })
  })

  it('sends the fertilizer amount as a number', async () => {
    const api = withTanks({ 'POST /tasks': { status: 201, data: SAVED } })
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Bón phân' }))
    await userEvent.type(screen.getByLabelText('Lượng phân nước (ml)'), '5,5')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(body(api.calls.find((c) => c.method === 'post')!)).toMatchObject({ type: 'FERTILIZE', fertilizerMl: 5.5 })
  })

  it('shows the server field errors next to the field and stays on the form', async () => {
    withTanks({
      'POST /tasks': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', message: 'Invalid', fieldErrors: { startDate: 'must be in the future' } },
      },
    })
    renderForm()
    await userEvent.click(await screen.findByRole('radio', { name: 'Mỗi N ngày' }))

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText(/lịch một lần phải ở tương lai/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Thêm lịch chăm' })).toBeInTheDocument()
  })

  it('fills the form in edit mode and saves with PUT', async () => {
    const api = withTanks({
      'GET /tasks/3': { status: 200, data: TASK },
      'PUT /tasks/3': { status: 200, data: TASK },
    })
    renderForm('/tasks/3/edit')

    expect(await screen.findByLabelText('Gắn với')).toHaveValue('7')
    expect(screen.getByRole('heading', { name: 'Sửa lịch chăm' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Thay nước tuần')
    expect(screen.getByLabelText('Thay bao nhiêu % nước')).toHaveValue('30')
    expect(screen.getByLabelText('Giờ nhắc')).toHaveTextContent('19:00')
    expect(screen.getByLabelText('Số ngày')).toHaveValue('7')
    expect(screen.getByLabelText('Ngày bắt đầu')).toHaveValue('21/11/2026')
    expect(screen.getByLabelText('Ghi chú')).toHaveValue('Dùng nước khử clo')
    expect(screen.getByRole('radio', { name: 'Mỗi N ngày' })).toHaveAttribute('aria-checked', 'true')

    await userEvent.clear(screen.getByLabelText('Thay bao nhiêu % nước'))
    await userEvent.type(screen.getByLabelText('Thay bao nhiêu % nước'), '25')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(screen.getByText('Chi tiết bể')).toBeInTheDocument())
    expect(body(api.calls.find((c) => c.method === 'put')!)).toMatchObject({
      tankId: 7,
      title: 'Thay nước tuần',
      waterChangePercent: 25,
      intervalDays: 7,
      startDate: '2026-11-21',
    })
  })

  it('can move a task to no tank or to another tank when editing', async () => {
    const api = withTanks({
      'GET /tasks/3': { status: 200, data: TASK },
      'PUT /tasks/3': { status: 200, data: { ...TASK, tankId: null } },
    })
    renderForm('/tasks/3/edit')
    await userEvent.selectOptions(await screen.findByLabelText('Gắn với'), 'Không gắn bể')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Danh sách bể')).toBeInTheDocument()
    expect(body(api.calls.find((c) => c.method === 'put')!).tankId).toBeNull()
  })

  it('edits a general task and keeps it without a tank', async () => {
    withTanks({ 'GET /tasks/3': { status: 200, data: { ...TASK, tankId: null } } })
    renderForm('/tasks/3/edit')

    expect(await screen.findByLabelText('Gắn với')).toHaveValue('')
    expect(screen.getByText('Việc chung')).toBeInTheDocument()
  })

  it('does not overwrite the title when the type changes while editing', async () => {
    withTanks({ 'GET /tasks/3': { status: 200, data: TASK } })
    renderForm('/tasks/3/edit')
    await screen.findByLabelText('Gắn với')

    await userEvent.click(screen.getByRole('radio', { name: 'Bón phân' }))

    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Thay nước tuần')
  })

  it('lets a past one-off task keep its date when only the text changes', async () => {
    const past = { ...TASK, repeatType: 'ONCE' as const, intervalDays: null, startDate: '2026-11-01', enabled: false, nextDueAt: null }
    const api = withTanks({
      'GET /tasks/3': { status: 200, data: past },
      'PUT /tasks/3': { status: 200, data: past },
    })
    renderForm('/tasks/3/edit')
    await userEvent.type(await screen.findByLabelText('Ghi chú'), ' thêm')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.calls.some((c) => c.method === 'put')).toBe(true))
  })

  it('says when the task to edit does not exist', async () => {
    withTanks({ 'GET /tasks/99': { status: 404, data: { code: 'NOT_FOUND' } } })
    renderForm('/tasks/99/edit')

    expect(await screen.findByText('Không tìm thấy lịch')).toBeInTheDocument()
  })
})
