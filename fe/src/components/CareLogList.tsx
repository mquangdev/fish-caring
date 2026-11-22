import { CircleCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { CARE_RESULT_LABELS } from '@/lib/labels'
import type { RequestStatus } from '@/store/failure'
import type { CareLog } from '@/types/api'

interface CareLogListProps {
  logs: CareLog[]
  status: RequestStatus
  error: string | null
  onRetry: () => void
}

/** The care history (newest first) with its loading, error and empty states. */
export function CareLogList({ logs, status, error, onRetry }: CareLogListProps) {
  if (status === 'idle' || (status === 'loading' && logs.length === 0)) {
    return (
      <div aria-busy="true" aria-label="Đang tải lịch sử">
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (status === 'failed' && logs.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-5 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Chưa có lịch sử chăm
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {logs.map((log) => {
        const Icon = log.result === 'DONE' ? CircleCheck : Clock
        return (
          <li key={log.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{log.taskTitle}</p>
              <p className="text-sm text-muted-foreground">
                {CARE_RESULT_LABELS[log.result]} · {formatDateTime(log.actedAt)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
