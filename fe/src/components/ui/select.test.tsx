import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Select } from './select'

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('')
  return (
    <Select aria-label="Gắn với" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled}>
      <option value="">Không gắn bể</option>
      <option value="7">Bể 7</option>
    </Select>
  )
}

describe('Select', () => {
  it('shows the options and changes the value', async () => {
    render(<Harness />)
    const select = screen.getByRole('combobox', { name: 'Gắn với' })
    expect(select).toHaveValue('')

    await userEvent.selectOptions(select, 'Bể 7')

    expect(select).toHaveValue('7')
  })

  it('can be disabled', () => {
    render(<Harness disabled />)

    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
