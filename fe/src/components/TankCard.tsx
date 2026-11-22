import { CalendarClock, ChevronRight, Droplets } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatLiters } from '@/lib/format'
import type { TankSummary } from '@/types/api'

interface TankCardProps {
  tank: TankSummary
}

/** One tank in the list. The whole card is a link to the tank. */
export function TankCard({ tank }: TankCardProps) {
  const nextDue = tank.nextDueAt ? `Việc kế tiếp: ${formatDateTime(tank.nextDueAt)}` : 'Chưa có lịch chăm'

  return (
    <Link
      to={`/tanks/${tank.id}`}
      className="flex min-h-11 items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-lg leading-tight font-semibold">{tank.name}</p>
        {tank.volumeLiters !== null ? (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Droplets className="size-4 shrink-0" aria-hidden="true" />
            <span>{formatLiters(tank.volumeLiters)}</span>
          </p>
        ) : null}
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {tank.taskCount > 0 ? `${tank.taskCount} lịch chăm · ${nextDue}` : nextDue}
          </span>
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}
