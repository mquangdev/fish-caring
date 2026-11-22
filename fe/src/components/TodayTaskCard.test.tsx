import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodayItem } from '@/types/api'
import { TodayTaskCard } from './TodayTaskCard'

const ITEM: TodayItem = {
  id: 3,
  tankId: 7,
  tankName: 'Bể thủy sinh',
  type: 'WATER_CHANGE',
  title: 'Thay nước tuần',
  note: 'Dùng nước khử clo',
  repeatType: 'EVERY_N_DAYS',
  timeOfDay: '19:00',
  foodName: null,
  waterChangePercent: 30,
  fertilizerMl: null,
  nextDueAt: '2026-11-21T19:00:00',
}

function renderCard(props: Partial<Parameters<typeof TodayTaskCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ul>
        <TodayTaskCard item={ITEM} withActions {...props} />
      </ul>
    </MemoryRouter>,
  )
}

describe('TodayTaskCard', () => {
  beforeEach(() => {
    // 21/11/2026 20:00 Vietnam time
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-21T13:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the tank as a link, the type, the title, the detail, the note and the due time', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'Bể thủy sinh' })).toHaveAttribute('href', '/tanks/7')
    expect(screen.getByText('Thay nước')).toBeInTheDocument()
    expect(screen.getByText('Thay nước tuần')).toBeInTheDocument()
    expect(screen.getByText('Thay 30% nước')).toBeInTheDocument()
    expect(screen.getByText('Dùng nước khử clo')).toBeInTheDocument()
    expect(screen.getByText('Hẹn: 21/11/2026 19:00')).toBeInTheDocument()
  })

  it('says "Việc chung" for a task without a tank', () => {
    renderCard({ item: { ...ITEM, tankId: null, tankName: null } })

    expect(screen.getByText('Việc chung')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('marks a task of an earlier day as overdue with text, but not one of today', () => {
    const { unmount } = renderCard({ item: { ...ITEM, nextDueAt: '2026-11-19T08:00:00' } })
    expect(screen.getByText('Quá hạn')).toBeInTheDocument()
    unmount()

    renderCard()
    expect(screen.queryByText('Quá hạn')).not.toBeInTheDocument()
  })

  it('has the two buttons only when asked to', async () => {
    const onComplete = vi.fn()
    const onSnooze = vi.fn()
    const { unmount } = renderCard({ onComplete, onSnooze })

    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hoãn đến mai' }))
    expect(onComplete).toHaveBeenCalledWith(ITEM)
    expect(onSnooze).toHaveBeenCalledWith(ITEM)
    unmount()

    renderCard({ withActions: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('makes "Hoàn thành" a light button when it is not the main action', () => {
    const { unmount } = renderCard()
    const mainClass = screen.getByRole('button', { name: 'Hoàn thành' }).className
    unmount()

    renderCard({ primary: false })

    expect(screen.getByRole('button', { name: 'Hoàn thành' }).className).not.toBe(mainClass)
    expect(screen.getByRole('button', { name: 'Hoãn đến mai' })).toBeInTheDocument()
  })

  it('locks both buttons while acting', () => {
    renderCard({ acting: true })

    expect(screen.getByRole('button', { name: 'Hoàn thành' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hoãn đến mai' })).toBeDisabled()
  })
})
