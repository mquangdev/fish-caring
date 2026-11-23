import { CalendarCheck } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { PushBanner } from '@/components/PushBanner'
import { TodayTaskCard } from '@/components/TodayTaskCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { GENERIC_ERROR } from '@/lib/messages'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchUnreadCount } from '@/store/notificationsSlice'
import { completeTask, fetchToday, snoozeTask } from '@/store/todaySlice'
import type { TodayItem } from '@/types/api'

/** "Hôm nay": what is due now or overdue (with the two action buttons) and what is still to come. */
export default function HomePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const { due, upcoming, status, error, actingId } = useAppSelector((state) => state.today)

  useEffect(() => {
    void dispatch(fetchToday())
  }, [dispatch])

  async function handleComplete(item: TodayItem) {
    const result = await dispatch(completeTask(item.id))
    if (completeTask.fulfilled.match(result)) {
      toast.success(`Đã hoàn thành “${item.title}”.`)
    } else {
      toast.error(result.payload?.message ?? GENERIC_ERROR)
    }
    void dispatch(fetchToday())
    // the notification of this task is now resolved
    void dispatch(fetchUnreadCount())
  }

  async function handleSnooze(item: TodayItem) {
    const result = await dispatch(snoozeTask(item.id))
    if (snoozeTask.fulfilled.match(result)) {
      toast.success(`Đã hoãn “${item.title}” đến ${formatDateTime(result.payload.nextDueAt)}.`)
    } else {
      toast.error(result.payload?.message ?? GENERIC_ERROR)
    }
    void dispatch(fetchToday())
    // the notification of this task is now resolved
    void dispatch(fetchUnreadCount())
  }

  const loading = status === 'idle' || (status === 'loading' && due.length === 0 && upcoming.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Xin chào, {user?.displayName}</h1>

      <PushBanner />

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải việc hôm nay">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : status === 'failed' && due.length === 0 && upcoming.length === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void dispatch(fetchToday())}>
            Thử lại
          </Button>
        </div>
      ) : due.length === 0 && upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Hôm nay không có việc gì, nghỉ ngơi thôi"
          description="Khi bạn đặt lịch chăm sóc, những việc cần làm trong ngày sẽ hiện ở đây."
        />
      ) : (
        <>
          {due.length > 0 ? (
            <section aria-labelledby="due-heading" className="flex flex-col gap-3">
              <h2 id="due-heading" className="text-lg font-semibold">
                Đến giờ / Quá hạn
              </h2>
              <ul className="flex flex-col gap-3">
                {due.map((item) => (
                  <TodayTaskCard
                    key={item.id}
                    item={item}
                    withActions
                    acting={actingId === item.id}
                    onComplete={(task) => void handleComplete(task)}
                    onSnooze={(task) => void handleSnooze(task)}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {upcoming.length > 0 ? (
            <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
              <h2 id="upcoming-heading" className="text-lg font-semibold">
                Sắp tới hôm nay
              </h2>
              <ul className="flex flex-col gap-3">
                {upcoming.map((item) => (
                  <TodayTaskCard
                    key={item.id}
                    item={item}
                    withActions
                    primary={false}
                    acting={actingId === item.id}
                    onComplete={(task) => void handleComplete(task)}
                    onSnooze={(task) => void handleSnooze(task)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
