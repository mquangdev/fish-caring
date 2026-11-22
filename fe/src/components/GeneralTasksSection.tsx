import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TaskList } from '@/components/TaskList'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchGeneralTasks } from '@/store/tasksSlice'

/** "Việc chung": the care tasks that belong to no tank (for example changing water for worms). */
export function GeneralTasksSection() {
  const dispatch = useAppDispatch()
  const { general, generalStatus, generalError } = useAppSelector((state) => state.tasks)

  useEffect(() => {
    void dispatch(fetchGeneralTasks())
  }, [dispatch])

  const loading = generalStatus === 'idle' || (generalStatus === 'loading' && general.length === 0)

  return (
    <section aria-labelledby="general-tasks-heading" className="flex flex-col gap-3 pb-20">
      <div className="flex items-center justify-between gap-3">
        <h2 id="general-tasks-heading" className="text-lg font-semibold">
          Việc chung
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/tasks/new">Thêm lịch chung</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải việc chung">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : generalStatus === 'failed' && general.length === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-6 text-center">
          <p className="text-destructive">{generalError}</p>
          <Button variant="outline" onClick={() => void dispatch(fetchGeneralTasks())}>
            Thử lại
          </Button>
        </div>
      ) : general.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có việc chung. Ví dụ: thay nước cho trùn chỉ.
        </p>
      ) : (
        <TaskList tasks={general} onChanged={() => void dispatch(fetchGeneralTasks())} />
      )}
    </section>
  )
}
