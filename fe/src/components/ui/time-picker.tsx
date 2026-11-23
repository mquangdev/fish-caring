import { ClockIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WheelColumn } from '@/components/ui/wheel-column'
import { buildMinuteOptions, HOUR_OPTIONS, isValidTime, splitTime } from '@/lib/timeInput'
import { cn } from '@/lib/utils'

interface TimePickerProps extends Omit<React.ComponentProps<'button'>, 'value' | 'onChange' | 'type'> {
  /** "HH:mm" on the 24-hour clock. */
  value: string
  onChange: (value: string) => void
}

/**
 * A time chosen on the 24-hour clock: the field shows HH:mm; tapping it opens a sheet with two scrolling
 * columns (hours, minutes in steps of 5). It never uses the browser's time control, which shows AM/PM.
 */
export function TimePicker({ value, onChange, className, ...props }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, setHour] = React.useState('00')
  const [minute, setMinute] = React.useState('00')

  const openSheet = () => {
    const parts = splitTime(value)
    setHour(parts.hour)
    setMinute(parts.minute)
    setOpen(true)
  }

  const apply = () => {
    onChange(`${hour}:${minute}`)
    setOpen(false)
  }

  return (
    <>
      <button
        {...props}
        type="button"
        onClick={openSheet}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-base outline-none transition-colors',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          className,
        )}
      >
        <span className={cn('tabular-nums', !isValidTime(value) && 'text-muted-foreground')}>
          {isValidTime(value) ? value : 'HH:mm'}
        </span>
        <ClockIcon aria-hidden className="size-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
          <DialogHeader>
            <DialogTitle>Chọn giờ nhắc</DialogTitle>
            <DialogDescription>Giờ 24 giờ. Cuộn hoặc chạm để chọn.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <WheelColumn label="Giờ" options={HOUR_OPTIONS} value={hour} onChange={setHour} />
            <span aria-hidden className="text-xl font-semibold">
              :
            </span>
            <WheelColumn label="Phút" options={buildMinuteOptions(splitTime(value).minute)} value={minute} onChange={setMinute} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button onClick={apply}>Xong</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
