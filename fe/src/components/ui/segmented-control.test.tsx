import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SegmentedControl } from './segmented-control'

const OPTIONS = [
  { value: 'a', label: 'Một' },
  { value: 'b', label: 'Hai' },
  { value: 'c', label: 'Ba' },
]

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('a')
  return <SegmentedControl label="Chọn số" value={value} options={OPTIONS} onChange={setValue} disabled={disabled} />
}

describe('SegmentedControl', () => {
  it('is a radio group with one checked option', () => {
    render(<Harness />)

    expect(screen.getByRole('radiogroup', { name: 'Chọn số' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Một' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Hai' })).toHaveAttribute('aria-checked', 'false')
  })

  it('selects an option when tapped', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('radio', { name: 'Ba' }))

    expect(screen.getByRole('radio', { name: 'Ba' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Một' })).toHaveAttribute('aria-checked', 'false')
  })

  it('moves the selection with the arrow keys and wraps around', async () => {
    render(<Harness />)
    screen.getByRole('radio', { name: 'Một' }).focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Hai' })).toHaveAttribute('aria-checked', 'true')

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Ba' })).toHaveAttribute('aria-checked', 'true')
  })

  it('does nothing when disabled', async () => {
    render(<Harness disabled />)

    await userEvent.click(screen.getByRole('radio', { name: 'Hai' }))

    expect(screen.getByRole('radio', { name: 'Một' })).toHaveAttribute('aria-checked', 'true')
  })
})
