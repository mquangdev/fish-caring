import { Bell, BellRing, CheckCheck, CircleCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { POLL_INTERVAL_MS } from '@/hooks/useNotificationPolling'
import { formatDateTime } from '@/lib/format'
import { NOTIFICATION_STATUS_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/store/notificationsSlice'
import type { AppNotification, NotificationStatus } from '@/types/api'

const STATUS_ICONS: Record<NotificationStatus, typeof Bell> = {
  UNREAD: BellRing,
  READ: Bell,
  RESOLVED: CircleCheck,
}

/** The notifications of the user (newest first). Tapping one marks it read and opens "Hôm nay". */
export default function NotificationsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { items, status, error, unreadCount, markingAll } = useAppSelector((state) => state.notifications)

  useEffect(() => {
    const load = () => {
      void dispatch(fetchNotifications())
      void dispatch(fetchUnreadCount())
    }
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [dispatch])

  async function open(notification: AppNotification) {
    if (notification.status === 'UNREAD') {
      await dispatch(markNotificationRead(notification.id))
    }
    navigate('/')
  }

  const loading = status === 'idle' || (status === 'loading' && items.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Thông báo</h1>
        {unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={markingAll}
            onClick={() => void dispatch(markAllNotificationsRead())}
          >
            <CheckCheck aria-hidden="true" />
            Đánh dấu đã đọc tất cả
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải thông báo">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : status === 'failed' && items.length === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void dispatch(fetchNotifications())}>
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Chưa có thông báo"
          description="Nhắc nhở sắp đến giờ chăm bể sẽ hiện ở đây."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((notification) => {
            const Icon = STATUS_ICONS[notification.status]
            const unread = notification.status === 'UNREAD'
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void open(notification)}
                  className={cn(
                    'flex min-h-16 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors outline-none',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    unread ? 'bg-accent/50 hover:bg-accent' : 'bg-card hover:bg-accent/30',
                  )}
                >
                  <Icon
                    className={cn('mt-0.5 size-5 shrink-0', unread ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block', unread ? 'font-semibold' : 'font-medium')}>{notification.message}</span>
                    <span className="block text-sm text-muted-foreground">
                      {NOTIFICATION_STATUS_LABELS[notification.status]} · {formatDateTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
