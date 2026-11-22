import { CalendarDays } from 'lucide-react'
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { displayToIso, isIsoDate, isoToDisplay, maskDateText } from '@/lib/dateInput'
import { cn } from '@/lib/utils'

interface DateInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** An ISO date ("2026-11-21"), or the text the user is still typing, or "". */
  value: string
  /** Called with an ISO date when the text is a real date, otherwise with the typed text. */
  onChange: (value: string) => void
}

/**
 * A date typed as dd/MM/yyyy (slashes are added while typing) with a calendar button that opens
 * the browser's picker. The text never depends on the browser's locale.
 */
export function DateInput({ value, onChange, className, disabled, ...props }: DateInputProps) {
  const pickerRef = React.useRef<HTMLInputElement>(null)
  const canPick = typeof HTMLInputElement !== 'undefined' && 'showPicker' in HTMLInputElement.prototype
  const shown = isoToDisplay(value)

  function handleText(event: React.ChangeEvent<HTMLInputElement>) {
    const text = maskDateText(event.target.value)
    onChange(displayToIso(text) ?? text)
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/MM/yyyy"
        maxLength={10}
        disabled={disabled}
        value={shown}
        onChange={handleText}
        className={cn(canPick && 'pr-12', className)}
      />
      {canPick ? (
        <>
          <button
            type="button"
            aria-label="Chọn ngày"
            disabled={disabled}
            onClick={() => pickerRef.current?.showPicker()}
            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          >
            <CalendarDays className="size-5" aria-hidden="true" />
          </button>
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={isIsoDate(value) ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            className="pointer-events-none absolute right-0 bottom-0 size-0 opacity-0"
          />
        </>
      ) : null}
    </div>
  )
}
