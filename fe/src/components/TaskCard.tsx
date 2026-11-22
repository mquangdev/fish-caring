import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/format'
import { describeDetail, describeRepeat } from '@/lib/taskText'
import type { CareTask } from '@/types/api'

interface TaskCardProps {
  task: CareTask
  toggling: boolean
  onToggle: (task: CareTask, enabled: boolean) => void
  onDelete: (task: CareTask) => void
}

/** One care task: what and when, an on/off switch, and quiet edit / delete buttons. */
export function TaskCard({ task, toggling, onToggle, onDelete }: TaskCardProps) {
  const detail = describeDetail(task)
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{task.title}</p>
          {detail ? <p className="text-sm">{detail}</p> : null}
          <p className="text-sm text-muted-foreground">{describeRepeat(task)}</p>
          <p className="text-sm text-muted-foreground">
            {task.enabled && task.nextDueAt ? `Lần tới: ${formatDateTime(task.nextDueAt)}` : 'Đã tắt'}
          </p>
        </div>
        <Switch
          checked={task.enabled}
          disabled={toggling}
          onCheckedChange={(checked) => onToggle(task, checked)}
          aria-label={`Bật nhắc “${task.title}”`}
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button asChild variant="ghost" size="icon" aria-label={`Sửa lịch “${task.title}”`}>
          <Link to={`/tasks/${task.id}/edit`}>
            <Pencil aria-hidden="true" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          aria-label={`Xoá lịch “${task.title}”`}
          onClick={() => onDelete(task)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
