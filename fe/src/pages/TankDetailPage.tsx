import { ArrowLeft, Fish } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { CareLogList } from '@/components/CareLogList'
import { TaskList } from '@/components/TaskList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDimensions, formatLiters } from '@/lib/format'
import { parseId } from '@/lib/ids'
import { fishStatusLabel } from '@/lib/labels'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchTankLogs } from '@/store/logsSlice'
import { clearCurrent, deleteTank, fetchTank } from '@/store/tanksSlice'
import type { Fish as FishItem, FishStatus } from '@/types/api'

const STATUS_ORDER: FishStatus[] = ['ALIVE', 'DEAD']

function totalOf(fish: FishItem[]): number {
  return fish.reduce((sum, item) => sum + item.quantity, 0)
}

export default function TankDetailPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { id } = useParams()
  const tankId = parseId(id)

  const { current, detailStatus, detailError, detailNotFound, deleteStatus, deleteError } = useAppSelector(
    (state) => state.tanks,
  )
  const { tankLogs, tankLogsFor, tankStatus, tankError } = useAppSelector((state) => state.logs)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    dispatch(clearCurrent())
    if (tankId !== null) {
      void dispatch(fetchTank(tankId))
      void dispatch(fetchTankLogs(tankId))
    }
  }, [dispatch, tankId])

  const backButton = (
    <Button asChild variant="ghost" size="icon" aria-label="Quay lại danh sách bể">
      <Link to="/tanks">
        <ArrowLeft aria-hidden="true" />
      </Link>
    </Button>
  )

  if (tankId === null || detailNotFound) {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <EmptyState
          icon={Fish}
          title="Không tìm thấy bể"
          description="Bể này không tồn tại hoặc đã bị xoá."
          action={
            <Button asChild>
              <Link to="/tanks">Về danh sách bể</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (detailStatus === 'failed') {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{detailError}</p>
          <Button variant="outline" onClick={() => void dispatch(fetchTank(tankId))}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  if (!current || current.id !== tankId) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải bể">
        {backButton}
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const tank = current

  async function handleDelete() {
    const result = await dispatch(deleteTank(tank.id))
    if (deleteTank.fulfilled.match(result)) {
      setConfirmOpen(false)
      toast.success('Đã xoá bể.')
      navigate('/tanks', { replace: true })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {backButton}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{tank.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin bể</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {tank.volumeLiters !== null ? (
              <>
                <dt className="text-muted-foreground">Thể tích</dt>
                <dd>{formatLiters(tank.volumeLiters)}</dd>
              </>
            ) : null}
            {tank.lengthCm !== null && tank.widthCm !== null && tank.heightCm !== null ? (
              <>
                <dt className="text-muted-foreground">Kích thước</dt>
                <dd>{formatDimensions(tank.lengthCm, tank.widthCm, tank.heightCm)}</dd>
              </>
            ) : null}
            {tank.setupDate ? (
              <>
                <dt className="text-muted-foreground">Ngày setup</dt>
                <dd>{formatDate(tank.setupDate)}</dd>
              </>
            ) : null}
            {tank.note ? (
              <>
                <dt className="text-muted-foreground">Ghi chú</dt>
                <dd className="whitespace-pre-wrap">{tank.note}</dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="tasks-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tasks-heading" className="text-lg font-semibold">
            Lịch chăm
          </h2>
          {tank.tasks.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/tanks/${tank.id}/tasks/new`}>Thêm lịch chăm</Link>
            </Button>
          ) : null}
        </div>
        {tank.tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Chưa có lịch chăm</p>
            <Button asChild variant="outline">
              <Link to={`/tanks/${tank.id}/tasks/new`}>Thêm lịch chăm</Link>
            </Button>
          </div>
        ) : (
          <TaskList tasks={tank.tasks} onChanged={() => void dispatch(fetchTank(tank.id))} />
        )}
      </section>

      <section aria-labelledby="logs-heading" className="flex flex-col gap-3">
        <h2 id="logs-heading" className="text-lg font-semibold">
          Lịch sử chăm
        </h2>
        <CareLogList
          logs={tankLogsFor === tank.id ? tankLogs : []}
          status={tankLogsFor === tank.id ? tankStatus : 'idle'}
          error={tankError}
          onRetry={() => void dispatch(fetchTankLogs(tank.id))}
        />
      </section>

      <section aria-labelledby="fish-heading" className="flex flex-col gap-3">
        <h2 id="fish-heading" className="text-lg font-semibold">
          Cá trong bể
        </h2>
        {tank.fish.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Chưa có cá nào. Bấm “Sửa bể” để thêm cá.
          </p>
        ) : (
          STATUS_ORDER.map((status) => {
            const group = tank.fish.filter((item) => item.status === status)
            if (group.length === 0) return null
            return (
              <div key={status} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {fishStatusLabel(status)} · {totalOf(group)} con
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                      <span className="min-w-0 flex-1 truncate">{item.speciesName}</span>
                      <span className="shrink-0 font-medium">{item.quantity} con</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })
        )}
      </section>

      <div className="flex flex-col gap-3">
        <Button asChild size="lg">
          <Link to={`/tanks/${tank.id}/edit`}>Sửa bể</Link>
        </Button>
        <Button variant="outline" className="text-destructive" onClick={() => setConfirmOpen(true)}>
          Xoá bể
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Xoá bể “${tank.name}”?`}
        description="Cá, lịch chăm và nhật ký của bể này cũng bị xoá và không khôi phục được."
        confirmLabel="Xoá bể"
        onConfirm={() => void handleDelete()}
        loading={deleteStatus === 'loading'}
        error={deleteError}
      />
    </div>
  )
}
