import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TimePicker } from './time-picker'

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return <TimePicker aria-label="Giờ" value={value} onChange={setValue} />
}

describe('TimePicker', () => {
  it('shows the time as HH:mm on a button, never AM or PM', () => {
    render(<Harness initial="08:00" />)

    expect(screen.getByRole('button', { name: 'Giờ' })).toHaveTextContent('08:00')
    expect(screen.queryByText(/AM|PM/)).not.toBeInTheDocument()
  })

  it('keeps an odd minute of an earlier task visible and selected in the sheet', async () => {
    render(<Harness initial="19:07" />)

    await userEvent.click(screen.getByRole('button', { name: 'Giờ' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('option', { name: '19', selected: true })).toBeInTheDocument()
    expect(within(dialog).getByRole('option', { name: '07', selected: true })).toBeInTheDocument()
  })

  it('applies the chosen time only when Xong is pressed', async () => {
    render(<Harness initial="08:00" />)

    await userEvent.click(screen.getByRole('button', { name: 'Giờ' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(within(dialog).getByRole('listbox', { name: 'Giờ' })).getByRole('option', { name: '06' }))
    expect(screen.getByRole('button', { name: 'Giờ', hidden: true })).toHaveTextContent('08:00')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Xong' }))
    expect(screen.getByRole('button', { name: 'Giờ' })).toHaveTextContent('06:00')
  })
})
