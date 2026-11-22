import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TaskCard } from '@/components/TaskCard'
import { GENERIC_ERROR } from '@/lib/messages'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearDeleteState, deleteTask, setTaskEnabled } from '@/store/tasksSlice'
import type { CareTask } from '@/types/api'

interface TaskListProps {
  tasks: CareTask[]
  /** Called after a task was switched or deleted, so the owner of the list can reload it. */
  onChanged: () => void
}

/** A list of task cards with the on/off switch and the delete confirmation. */
export function TaskList({ tasks, onChanged }: TaskListProps) {
  const dispatch = useAppDispatch()
  const { togglingId, deleteStatus, deleteError } = useAppSelector((state) => state.tasks)
  const [taskToDelete, setTaskToDelete] = useState<CareTask | null>(null)

  async function handleToggle(task: CareTask, enabled: boolean) {
    const result = await dispatch(setTaskEnabled({ id: task.id, enabled }))
    if (setTaskEnabled.fulfilled.match(result)) {
      onChanged()
    } else if (result.payload?.fieldErrors.startDate) {
      toast.error('Lịch này đã qua thời điểm. Hãy sửa ngày giờ rồi bật lại.')
    } else {
      toast.error(result.payload?.message ?? GENERIC_ERROR)
    }
  }

  async function handleDelete() {
    if (!taskToDelete) return
    const result = await dispatch(deleteTask(taskToDelete.id))
    if (deleteTask.fulfilled.match(result)) {
      setTaskToDelete(null)
      toast.success('Đã xoá lịch chăm.')
      onChanged()
    }
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            toggling={togglingId === task.id}
            onToggle={(item, enabled) => void handleToggle(item, enabled)}
            onDelete={(item) => {
              dispatch(clearDeleteState())
              setTaskToDelete(item)
            }}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null)
        }}
        title={`Xoá lịch “${taskToDelete?.title ?? ''}”?`}
        description="Nhật ký đã ghi của lịch này vẫn được giữ."
        confirmLabel="Xoá lịch"
        onConfirm={() => void handleDelete()}
        loading={deleteStatus === 'loading'}
        error={deleteError}
      />
    </>
  )
}
