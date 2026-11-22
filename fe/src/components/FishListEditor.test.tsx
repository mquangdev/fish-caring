import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { newFishRow, type FishRow } from '@/lib/fishRows'
import type { FishRowErrors } from '@/lib/validation'
import { FishListEditor } from './FishListEditor'

function Harness({ initial = [], errors }: { initial?: FishRow[]; errors?: Record<string, FishRowErrors> }) {
  const [rows, setRows] = useState<FishRow[]>(initial)
  return (
    <>
      <FishListEditor rows={rows} onChange={setRows} errors={errors} />
      <output data-testid="species-order">{rows.map((r) => r.speciesName).join('|')}</output>
    </>
  )
}

describe('FishListEditor', () => {
  it('shows a friendly message when there is no fish', () => {
    render(<Harness />)

    expect(screen.getByText(/Chưa có cá nào/)).toBeInTheDocument()
  })

  it('adds a new row on top so the newest fish is first', async () => {
    render(<Harness initial={[newFishRow({ speciesName: 'Cũ' })]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thêm cá' }))

    const rows = screen.getAllByTestId('fish-row')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByLabelText('Loài')).toHaveValue('')
    expect(within(rows[1]).getByLabelText('Loài')).toHaveValue('Cũ')
  })

  it('edits species, quantity and status of a row', async () => {
    render(<Harness initial={[newFishRow({ speciesName: '', quantity: '1' })]} />)
    const row = screen.getByTestId('fish-row')

    await userEvent.type(within(row).getByLabelText('Loài'), 'Neon')
    await userEvent.clear(within(row).getByLabelText('Số lượng'))
    await userEvent.type(within(row).getByLabelText('Số lượng'), '12')
    await userEvent.click(within(row).getByRole('radio', { name: 'Đã chết' }))

    expect(within(row).getByLabelText('Loài')).toHaveValue('Neon')
    expect(within(row).getByLabelText('Số lượng')).toHaveValue('12')
    expect(within(row).getByRole('radio', { name: 'Đã chết' })).toHaveAttribute('aria-checked', 'true')
    expect(within(row).getByRole('radio', { name: 'Còn sống' })).toHaveAttribute('aria-checked', 'false')
  })

  it('removes only the chosen row', async () => {
    render(<Harness initial={[newFishRow({ speciesName: 'A' }), newFishRow({ speciesName: 'B' })]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Xoá dòng cá A' }))

    expect(screen.getByTestId('species-order')).toHaveTextContent('B')
    expect(screen.getAllByTestId('fish-row')).toHaveLength(1)
  })

  it('shows validation messages next to the fields of that row', () => {
    const row = newFishRow({ speciesName: '', quantity: '0' })

    render(<Harness initial={[row]} errors={{ [row.key]: { speciesName: 'Vui lòng nhập tên loài.', quantity: 'Số lượng từ 1 đến 9.999.' } }} />)

    expect(screen.getByText('Vui lòng nhập tên loài.')).toBeInTheDocument()
    expect(screen.getByText('Số lượng từ 1 đến 9.999.')).toBeInTheDocument()
  })
})
