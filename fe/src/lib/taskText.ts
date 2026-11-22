import type { CareTask } from '@/types/api'
import { formatDate } from './format'

const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** "Mỗi ngày 08:00", "Mỗi 7 ngày 19:00", "Một lần 25/11/2026 21:00". */
export function describeRepeat(
  task: Pick<CareTask, 'repeatType' | 'intervalDays' | 'timeOfDay' | 'startDate'>,
): string {
  switch (task.repeatType) {
    case 'DAILY':
      return `Mỗi ngày ${task.timeOfDay}`
    case 'EVERY_N_DAYS':
      return `Mỗi ${task.intervalDays ?? ''} ngày ${task.timeOfDay}`
    case 'ONCE':
      return `Một lần ${formatDate(task.startDate)} ${task.timeOfDay}`
  }
}

/** The optional detail of a task ("Thay 30% nước"); an empty string when there is none. */
export function describeDetail(
  task: Pick<CareTask, 'type' | 'foodName' | 'waterChangePercent' | 'fertilizerMl'>,
): string {
  switch (task.type) {
    case 'WATER_CHANGE':
      return task.waterChangePercent !== null ? `Thay ${task.waterChangePercent}% nước` : ''
    case 'FERTILIZE':
      return task.fertilizerMl !== null ? `Bón ${NUMBER_FORMAT.format(task.fertilizerMl)} ml phân nước` : ''
    case 'FEED':
      return task.foodName ? `Thức ăn: ${task.foodName}` : ''
    case 'OTHER':
      return ''
  }
}
