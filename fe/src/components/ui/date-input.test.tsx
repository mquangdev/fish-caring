import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DateInput } from './date-input'

function Harness({ initial = '', onValue }: { initial?: string; onValue?: (value: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <DateInput
      aria-label="Ngày"
      value={value}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

describe('DateInput', () => {
  it('shows an ISO value as dd/MM/yyyy', () => {
    render(<Harness initial="2026-11-21" />)

    expect(screen.getByLabelText('Ngày')).toHaveValue('21/11/2026')
  })

  it('adds the slashes while typing and reports an ISO date once it is real', async () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)

    await userEvent.type(screen.getByLabelText('Ngày'), '21112026')

    expect(screen.getByLabelText('Ngày')).toHaveValue('21/11/2026')
    expect(onValue).toHaveBeenLastCalledWith('2026-11-21')
    expect(onValue).toHaveBeenCalledWith('21/1')
  })

  it('reports the typed text while the date is incomplete or not real', async () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)

    await userEvent.type(screen.getByLabelText('Ngày'), '30022026')

    expect(screen.getByLabelText('Ngày')).toHaveValue('30/02/2026')
    expect(onValue).toHaveBeenLastCalledWith('30/02/2026')
  })

  it('reports an empty value when cleared', async () => {
    const onValue = vi.fn()
    render(<Harness initial="2026-11-21" onValue={onValue} />)

    await userEvent.clear(screen.getByLabelText('Ngày'))

    expect(onValue).toHaveBeenLastCalledWith('')
  })

  it('uses the numeric keyboard and shows the format as a placeholder', () => {
    render(<Harness />)

    expect(screen.getByLabelText('Ngày')).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByPlaceholderText('dd/MM/yyyy')).toBeInTheDocument()
  })
})
