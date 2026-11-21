import { Fish } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

/** Placeholder until tank management is built (milestone M4). */
export default function TanksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Bể của tôi</h1>
      <EmptyState
        icon={Fish}
        title="Chưa có bể nào"
        description="Tính năng thêm và quản lý bể cá đang được hoàn thiện."
      />
    </div>
  )
}
