import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@/test/mockApi'
import { LOGGED_IN, renderWithProviders } from '@/test/renderWithProviders'
import type { Tank } from '@/types/api'
import TankFormPage from './TankFormPage'

function renderForm(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/tanks" element={<p>Danh sách bể</p>} />
      <Route path="/tanks/new" element={<TankFormPage />} />
      <Route path="/tanks/:id" element={<p>Chi tiết bể</p>} />
      <Route path="/tanks/:id/edit" element={<TankFormPage />} />
    </Routes>,
    { route, auth: LOGGED_IN },
  )
}

const SAVED: Tank = {
  id: 5,
  name: 'Bể mới',
  volumeLiters: 60,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: null,
  note: null,
  createdAt: '2026-11-21T08:00:00',
  updatedAt: '2026-11-21T08:00:00',
  fish: [],
  tasks: [],
}

const EXISTING: Tank = {
  ...SAVED,
  id: 7,
  name: 'Bể cũ',
  volumeLiters: 90,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  setupDate: '2026-01-15',
  note: 'ghi chú cũ',
  fish: [
    { id: 11, speciesName: 'Guppy', quantity: 4, status: 'ALIVE' },
    { id: 10, speciesName: 'Neon', quantity: 10, status: 'DEAD' },
  ],
  tasks: [],
}

describe('TankFormPage (create)', () => {
  it('validates before calling the API', async () => {
    const api = mockApi({})
    renderForm('/tanks/new')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Vui lòng nhập tên bể.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('checks the volume and every fish row', async () => {
    const api = mockApi({})
    renderForm('/tanks/new')

    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.type(screen.getByLabelText('Thể tích (lít)'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm cá' }))
    await userEvent.clear(screen.getByLabelText('Số lượng'))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Thể tích từ 0,1 đến 10.000 lít.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập tên loài.')).toBeInTheDocument()
    expect(screen.getByText('Số lượng cần là số nguyên.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('creates a tank and opens it', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: SAVED } })
    renderForm('/tanks/new')

    await userEvent.type(screen.getByLabelText('Tên bể'), '  Bể mới  ')
    await userEvent.type(screen.getByLabelText('Thể tích (lít)'), '64,8')
    await userEvent.type(screen.getByLabelText('Ghi chú'), 'Đặt cạnh cửa sổ')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Chi tiết bể')).toBeInTheDocument()
    expect(JSON.parse(api.calls[0].data as string)).toEqual({
      name: 'Bể mới',
      volumeLiters: 64.8,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      setupDate: null,
      note: 'Đặt cạnh cửa sổ',
      fish: [],
    })
  })

  it('has no tank type field', () => {
    renderForm('/tanks/new')

    expect(screen.queryByText('Loại bể')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Thủy sinh' })).not.toBeInTheDocument()
  })

  it('starts in "enter volume" mode and can switch to "enter dimensions"', async () => {
    renderForm('/tanks/new')
    expect(screen.getByRole('radio', { name: 'Nhập thể tích' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByLabelText('Dài (cm)')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))

    expect(screen.getByLabelText('Dài (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Rộng (cm)')).toBeInTheDocument()
    expect(screen.getByLabelText('Cao (cm)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Thể tích (lít)')).not.toBeInTheDocument()
  })

  it('shows the calculated volume while the dimensions are typed', async () => {
    renderForm('/tanks/new')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    expect(screen.getByText('Nhập đủ dài, rộng, cao để tính thể tích.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Dài (cm)'), '60')
    await userEvent.type(screen.getByLabelText('Rộng (cm)'), '30')
    expect(screen.getByText('Nhập đủ dài, rộng, cao để tính thể tích.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Cao (cm)'), '36')

    expect(screen.getByText('Thể tích: 64,8 lít')).toBeInTheDocument()
  })

  it('accepts a comma as the decimal separator in dimensions', async () => {
    renderForm('/tanks/new')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))

    await userEvent.type(screen.getByLabelText('Dài (cm)'), '10,5')
    await userEvent.type(screen.getByLabelText('Rộng (cm)'), '10')
    await userEvent.type(screen.getByLabelText('Cao (cm)'), '10')

    expect(screen.getByText('Thể tích: 1,1 lít')).toBeInTheDocument()
  })

  it('sends the three dimensions and no volume when entered by dimensions', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: SAVED } })
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.type(screen.getByLabelText('Dài (cm)'), '60')
    await userEvent.type(screen.getByLabelText('Rộng (cm)'), '30')
    await userEvent.type(screen.getByLabelText('Cao (cm)'), '36,5')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(JSON.parse(api.calls[0].data as string)).toMatchObject({
      volumeLiters: null,
      lengthCm: 60,
      widthCm: 30,
      heightCm: 36.5,
    })
  })

  it('does not send dimensions that were typed and then left by switching back to volume', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: SAVED } })
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.type(screen.getByLabelText('Dài (cm)'), '60')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập thể tích' }))
    await userEvent.type(screen.getByLabelText('Thể tích (lít)'), '50')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(JSON.parse(api.calls[0].data as string)).toMatchObject({
      volumeLiters: 50,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
    })
  })

  it('needs all three dimensions or none: a missing side is named and nothing is sent', async () => {
    const api = mockApi({})
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.type(screen.getByLabelText('Dài (cm)'), '60')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Vui lòng nhập chiều rộng.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập chiều cao.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('may leave the size empty in either mode', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: SAVED } })
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(JSON.parse(api.calls[0].data as string)).toMatchObject({
      volumeLiters: null,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
    })
  })

  it('rejects dimensions whose volume is too large', async () => {
    const api = mockApi({})
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.type(screen.getByLabelText('Dài (cm)'), '1000')
    await userEvent.type(screen.getByLabelText('Rộng (cm)'), '1000')
    await userEvent.type(screen.getByLabelText('Cao (cm)'), '11')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Thể tích vượt quá 10.000 lít.')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('shows server errors on a dimension field', async () => {
    mockApi({
      'POST /tanks': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', fieldErrors: { widthCm: 'must be given together with length and height' } },
      },
    })
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('radio', { name: 'Nhập kích thước' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Chiều rộng từ 0,1 đến 1.000 cm.')).toBeInTheDocument()
  })

  it('sends fish in display order with numbers and statuses, newest on top', async () => {
    const api = mockApi({ 'POST /tanks': { status: 201, data: SAVED } })
    renderForm('/tanks/new')
    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm cá' }))
    await userEvent.type(screen.getByLabelText('Loài'), 'Cũ')
    await userEvent.click(screen.getByRole('button', { name: 'Thêm cá' }))
    const rows = screen.getAllByTestId('fish-row')
    await userEvent.type(within(rows[0]).getByLabelText('Loài'), 'Mới')
    await userEvent.clear(within(rows[0]).getByLabelText('Số lượng'))
    await userEvent.type(within(rows[0]).getByLabelText('Số lượng'), '12')
    await userEvent.click(within(rows[0]).getByRole('radio', { name: 'Đã chết' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    expect(JSON.parse(api.calls[0].data as string).fish).toEqual([
      { speciesName: 'Mới', quantity: 12, status: 'DEAD' },
      { speciesName: 'Cũ', quantity: 1, status: 'ALIVE' },
    ])
  })

  it('allows a name that is already used', async () => {
    mockApi({ 'POST /tanks': { status: 201, data: { ...SAVED, name: 'Bể 1' } } })
    renderForm('/tanks/new')

    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Chi tiết bể')).toBeInTheDocument()
  })

  it('shows server field errors next to the field and keeps the form', async () => {
    mockApi({
      'POST /tanks': {
        status: 400,
        data: { code: 'VALIDATION_ERROR', fieldErrors: { name: 'size must be between 0 and 100' } },
      },
    })
    renderForm('/tanks/new')

    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Tên bể cần từ 1 đến 100 ký tự.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tên bể')).toHaveValue('Bể 1')
  })

  it('shows a message when the server is not reachable', async () => {
    mockApi({ 'POST /tanks': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderForm('/tanks/new')

    await userEvent.type(screen.getByLabelText('Tên bể'), 'Bể 1')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')
  })

  it('cancel goes back to the list', async () => {
    renderForm('/tanks/new')

    await userEvent.click(screen.getByRole('link', { name: 'Huỷ' }))

    expect(screen.getByText('Danh sách bể')).toBeInTheDocument()
  })
})

describe('TankFormPage (edit)', () => {
  it('loads the tank and fills the form, fish in the stored order', async () => {
    mockApi({ 'GET /tanks/7': { status: 200, data: EXISTING } })
    renderForm('/tanks/7/edit')

    expect(await screen.findByLabelText('Tên bể')).toHaveValue('Bể cũ')
    expect(screen.getByRole('radio', { name: 'Nhập thể tích' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Thể tích (lít)')).toHaveValue('90')
    expect(screen.queryByText('Loại bể')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ngày setup')).toHaveValue('15/01/2026')
    expect(screen.getByLabelText('Ghi chú')).toHaveValue('ghi chú cũ')
    const rows = screen.getAllByTestId('fish-row')
    expect(within(rows[0]).getByLabelText('Loài')).toHaveValue('Guppy')
    expect(within(rows[1]).getByLabelText('Loài')).toHaveValue('Neon')
    expect(within(rows[1]).getByRole('radio', { name: 'Đã chết' })).toHaveAttribute('aria-checked', 'true')
  })

  it('takes the setup date as dd/MM/yyyy and sends it as an ISO date', async () => {
    const api = mockApi({
      'GET /tanks/7': { status: 200, data: EXISTING },
      'PUT /tanks/7': { status: 200, data: EXISTING },
    })
    renderForm('/tanks/7/edit')
    const date = await screen.findByLabelText('Ngày setup')
    await userEvent.clear(date)
    await userEvent.type(date, '05022026')

    expect(date).toHaveValue('05/02/2026')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.calls.some((c) => c.method === 'put')).toBe(true))
    expect(JSON.parse(api.calls.find((c) => c.method === 'put')!.data as string).setupDate).toBe('2026-02-05')
  })

  it('rejects a setup date that is not a real date and does not call the API', async () => {
    const api = mockApi({ 'GET /tanks/7': { status: 200, data: EXISTING } })
    renderForm('/tanks/7/edit')
    const date = await screen.findByLabelText('Ngày setup')
    await userEvent.clear(date)
    await userEvent.type(date, '31042026')

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(screen.getByText('Ngày chưa hợp lệ. Nhập theo dd/MM/yyyy.')).toBeInTheDocument()
    expect(api.calls.some((c) => c.method === 'put')).toBe(false)
  })

  it('opens in "enter dimensions" mode when the tank has dimensions', async () => {
    mockApi({
      'GET /tanks/7': {
        status: 200,
        data: { ...EXISTING, volumeLiters: 64.8, lengthCm: 60, widthCm: 30, heightCm: 36 },
      },
    })
    renderForm('/tanks/7/edit')

    expect(await screen.findByLabelText('Dài (cm)')).toHaveValue('60')
    expect(screen.getByRole('radio', { name: 'Nhập kích thước' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Rộng (cm)')).toHaveValue('30')
    expect(screen.getByLabelText('Cao (cm)')).toHaveValue('36')
    expect(screen.getByText('Thể tích: 64,8 lít')).toBeInTheDocument()
  })

  it('switching an existing tank from dimensions to volume sends the volume and clears the dimensions', async () => {
    const api = mockApi({
      'GET /tanks/7': { status: 200, data: { ...EXISTING, volumeLiters: 64.8, lengthCm: 60, widthCm: 30, heightCm: 36 } },
      'PUT /tanks/7': { status: 200, data: EXISTING },
    })
    renderForm('/tanks/7/edit')
    await screen.findByLabelText('Dài (cm)')

    await userEvent.click(screen.getByRole('radio', { name: 'Nhập thể tích' }))
    const volume = screen.getByLabelText('Thể tích (lít)')
    await userEvent.clear(volume)
    await userEvent.type(volume, '70')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Chi tiết bể')
    const put = api.calls.find((call) => call.method === 'put')
    expect(JSON.parse(put?.data as string)).toMatchObject({
      volumeLiters: 70,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
    })
  })

  it('saves changes with PUT and returns to the tank', async () => {
    const api = mockApi({
      'GET /tanks/7': { status: 200, data: EXISTING },
      'PUT /tanks/7': { status: 200, data: { ...EXISTING, name: 'Bể sửa' } },
    })
    renderForm('/tanks/7/edit')
    const name = await screen.findByLabelText('Tên bể')

    await userEvent.clear(name)
    await userEvent.type(name, 'Bể sửa')
    await userEvent.click(screen.getByRole('button', { name: 'Xoá dòng cá Guppy' }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Chi tiết bể')).toBeInTheDocument()
    const put = api.calls.find((call) => call.method === 'put')
    expect(JSON.parse(put?.data as string)).toMatchObject({
      name: 'Bể sửa',
      volumeLiters: 90,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      setupDate: '2026-01-15',
      fish: [{ speciesName: 'Neon', quantity: 10, status: 'DEAD' }],
    })
  })

  it('says so when the tank does not exist', async () => {
    mockApi({ 'GET /tanks/99': { status: 404, data: { code: 'NOT_FOUND', message: 'Tank not found' } } })
    renderForm('/tanks/99/edit')

    expect(await screen.findByText('Không tìm thấy bể')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về danh sách bể' })).toBeInTheDocument()
  })

  it('treats a broken id as not found without calling the API', async () => {
    const api = mockApi({})
    renderForm('/tanks/abc/edit')

    expect(await screen.findByText('Không tìm thấy bể')).toBeInTheDocument()
    expect(api.calls).toHaveLength(0)
  })

  it('offers a retry when loading fails', async () => {
    mockApi({ 'GET /tanks/7': { status: 500, data: { code: 'INTERNAL_ERROR' } } })
    renderForm('/tanks/7/edit')

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố')

    mockApi({ 'GET /tanks/7': { status: 200, data: EXISTING } })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByLabelText('Tên bể')).toHaveValue('Bể cũ')
  })
})
