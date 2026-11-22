import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CareLog } from '@/types/api'
import { CareLogList } from './CareLogList'

const LOGS: CareLog[] = [
  { id: 2, tankId: 7, taskId: 3, taskTitle: 'Thay nước', result: 'SNOOZED', dueAt: '2026-11-21T19:00:00', actedAt: '2026-11-21T19:05:00' },
  { id: 1, tankId: 7, taskId: 4, taskTitle: 'Cho ăn', result: 'DONE', dueAt: '2026-11-21T08:00:00', actedAt: '2026-11-21T08:10:00' },
]

describe('CareLogList', () => {
  it('shows a loading skeleton', () => {
    render(<CareLogList logs={[]} status="loading" error={null} onRetry={() => {}} />)

    expect(screen.getByLabelText('Đang tải lịch sử')).toHaveAttribute('aria-busy', 'true')
  })

  it('lists the logs in the order given with the result as text and the time', () => {
    render(<CareLogList logs={LOGS} status="succeeded" error={null} onRetry={() => {}} />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Thay nước')
    expect(items[0]).toHaveTextContent('Hoãn đến mai · 21/11/2026 19:05')
    expect(items[1]).toHaveTextContent('Cho ăn')
    expect(items[1]).toHaveTextContent('Hoàn thành · 21/11/2026 08:10')
  })

  it('shows a friendly empty state', () => {
    render(<CareLogList logs={[]} status="succeeded" error={null} onRetry={() => {}} />)

    expect(screen.getByText('Chưa có lịch sử chăm')).toBeInTheDocument()
  })

  it('shows the error with a retry button', async () => {
    const onRetry = vi.fn()
    render(<CareLogList logs={[]} status="failed" error="Máy chủ đang gặp sự cố." onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Máy chủ đang gặp sự cố.')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('keeps showing the logs it has when a reload fails', () => {
    render(<CareLogList logs={LOGS} status="failed" error="Lỗi" onRetry={() => {}} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
