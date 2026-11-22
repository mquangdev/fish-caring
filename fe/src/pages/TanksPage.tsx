import { Fish, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { GeneralTasksSection } from '@/components/GeneralTasksSection'
import { TankCard } from '@/components/TankCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchTanks } from '@/store/tanksSlice'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

export default function TanksPage() {
  const dispatch = useAppDispatch()
  const { items, listStatus, listError } = useAppSelector((state) => state.tanks)

  useEffect(() => {
    void dispatch(fetchTanks())
  }, [dispatch])

  const loading = listStatus === 'idle' || (listStatus === 'loading' && items.length === 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bể của tôi</h1>

      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải danh sách bể">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : listStatus === 'failed' && items.length === 0 ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 px-6 py-8 text-center">
          <p className="text-destructive">{listError}</p>
          <Button variant="outline" onClick={() => void dispatch(fetchTanks())}>
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Fish}
          title="Chưa có bể nào"
          description="Thêm bể đầu tiên để bắt đầu ghi lại cá và lịch chăm sóc."
          action={
            <Button asChild>
              <Link to="/tanks/new">Thêm bể đầu tiên</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3 pb-20">
          {items.map((tank) => (
            <li key={tank.id}>
              <TankCard tank={tank} />
            </li>
          ))}
        </ul>
      )}

      <GeneralTasksSection />

      {items.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 mx-auto flex max-w-md justify-end px-4 md:max-w-2xl">
          <Button asChild size="lg" className="pointer-events-auto rounded-full shadow-lg">
            <Link to="/tanks/new">
              <Plus aria-hidden="true" />
              Thêm bể
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
