import * as React from 'react'
import { cn } from '@/lib/utils'

interface WheelColumnProps {
  label: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}

/** How long the scrolling must stay still before the row in the middle counts as chosen. */
const SETTLE_MS = 120

/**
 * One column of a scrolling picker. Scroll it or tap a row (arrow keys also work); the row in the middle is
 * the chosen one. Rows are 44px tall so they are easy to hit.
 */
export function WheelColumn({ label, options, value, onChange }: WheelColumnProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const index = Math.max(0, options.indexOf(value))

  // offsetHeight, not getBoundingClientRect: the sheet scales up while it opens, which changes the latter
  const rowHeight = () => (listRef.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0

  // Bring the chosen row to the middle whenever it changes (also when the picker opens).
  React.useEffect(() => {
    const list = listRef.current
    const height = rowHeight()
    if (list && height > 0 && typeof list.scrollTo === 'function') {
      list.scrollTo({ top: index * height })
    }
  }, [index])

  React.useEffect(
    () => () => {
      if (settleTimer.current) {
        clearTimeout(settleTimer.current)
      }
    },
    [],
  )

  const handleScroll = () => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
    }
    settleTimer.current = setTimeout(() => {
      const height = rowHeight()
      if (!listRef.current || height <= 0) {
        return
      }
      const next = Math.min(options.length - 1, Math.max(0, Math.round(listRef.current.scrollTop / height)))
      if (options[next] !== value) {
        onChange(options[next])
      }
    }, SETTLE_MS)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) {
      return
    }
    event.preventDefault()
    const next = Math.min(options.length - 1, Math.max(0, index + step))
    onChange(options[next])
  }

  return (
    <div className="relative flex-1">
      {/* the band behind the chosen row */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-lg bg-accent" />
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="relative h-44 snap-y snap-mandatory overflow-y-auto py-16 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-lg"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={option === value}
            onClick={() => onChange(option)}
            className={cn(
              'flex h-11 w-full snap-center items-center justify-center text-xl tabular-nums transition-colors',
              option === value ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
