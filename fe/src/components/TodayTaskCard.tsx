import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { TASK_TYPE_LABELS } from '@/lib/labels'
import { vietnamNow } from '@/lib/schedule'
import { describeDetail } from '@/lib/taskText'
import type { TodayItem } from '@/types/api'

interface TodayTaskCardProps {
  item: TodayItem
  /** Show the Hoàn thành / Hoãn đến mai buttons. */
  withActions: boolean
  /** "Hoàn thành" is the main button of the screen (tasks that are due); false makes both buttons light. */
  primary?: boolean
  /** The buttons of this card are locked while a request for it is running. */
  acting?: boolean
  onComplete?: (item: TodayItem) => void
  onSnooze?: (item: TodayItem) => void
}

/** One task of the "Hôm nay" screen: where, what and when, with two big buttons when it is due. */
export function TodayTaskCard({
  item,
  withActions,
  primary = true,
  acting = false,
  onComplete,
  onSnooze,
}: TodayTaskCardProps) {
  const detail = describeDetail(item)
  const overdue = item.nextDueAt.slice(0, 10) < vietnamNow().slice(0, 10)

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          {item.tankId !== null && item.tankName ? (
            <Link to={`/tanks/${item.tankId}`} className="min-w-0 truncate underline-offset-4 hover:underline">
              {item.tankName}
            </Link>
          ) : (
            <span>Việc chung</span>
          )}
          <span className="shrink-0">{TASK_TYPE_LABELS[item.type]}</span>
        </div>
        <p className="text-lg font-semibold">{item.title}</p>
        {detail ? <p className="text-sm">{detail}</p> : null}
        {item.note ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.note}</p> : null}
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Hẹn: {formatDateTime(item.nextDueAt)}</span>
          {overdue ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Quá hạn
            </span>
          ) : null}
        </p>
      </div>

      {withActions ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant={primary ? 'default' : 'outline'}
            size="lg"
            className="sm:flex-1"
            disabled={acting}
            onClick={() => onComplete?.(item)}
          >
            Hoàn thành
          </Button>
          <Button variant="outline" size="lg" className="sm:flex-1" disabled={acting} onClick={() => onSnooze?.(item)}>
            Hoãn đến mai
          </Button>
        </div>
      ) : null}
    </li>
  )
}
