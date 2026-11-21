import { CalendarCheck } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useAppSelector } from '@/store/hooks'

/** Placeholder until the "Hôm nay" list is built (milestone M6). */
export default function HomePage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Xin chào, {user?.displayName}</h1>
      <EmptyState
        icon={CalendarCheck}
        title="Hôm nay chưa có việc nào"
        description="Khi bạn thêm bể và đặt lịch chăm sóc, những việc cần làm trong ngày sẽ hiện ở đây."
      />
    </div>
  )
}
