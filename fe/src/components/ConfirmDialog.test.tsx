import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Xoá bể “A”?"
      description="Cá và lịch chăm cũng bị xoá."
      confirmLabel="Xoá bể"
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onOpenChange, onConfirm }
}

describe('ConfirmDialog', () => {
  it('says what will happen', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Xoá bể “A”?')).toBeInTheDocument()
    expect(screen.getByText('Cá và lịch chăm cũng bị xoá.')).toBeInTheDocument()
  })

  it('cancel closes without confirming', async () => {
    const { onOpenChange, onConfirm } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirm calls onConfirm', async () => {
    const { onConfirm } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Xoá bể' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('locks both buttons while working', () => {
    renderDialog({ loading: true })

    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đang xoá...' })).toBeDisabled()
  })

  it('shows an error inside the dialog', () => {
    renderDialog({ error: 'Không kết nối được máy chủ. Vui lòng thử lại.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Không kết nối được máy chủ')
  })

  it('renders nothing when closed', () => {
    renderDialog({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
