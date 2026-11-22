import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Switch } from './switch'

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false)
  return <Switch checked={checked} onCheckedChange={setChecked} disabled={disabled} aria-label="Bật nhắc" />
}

describe('Switch', () => {
  it('is a switch that toggles when tapped', async () => {
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: 'Bật nhắc' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles with the keyboard', async () => {
    render(<Harness />)
    screen.getByRole('switch').focus()

    await userEvent.keyboard(' ')

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('does nothing when disabled', async () => {
    render(<Harness disabled />)

    await userEvent.click(screen.getByRole('switch'))

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch')).toBeDisabled()
  })
})
