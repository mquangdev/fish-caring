import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

/** Placeholder until in-app notifications are built (milestone M7). */
export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Thông báo</h1>
      <EmptyState
        icon={Bell}
        title="Chưa có thông báo"
        description="Nhắc nhở đến giờ chăm bể sẽ hiện ở đây."
      />
    </div>
  )
}
