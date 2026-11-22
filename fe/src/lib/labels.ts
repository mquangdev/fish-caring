import type { CareResult, FishStatus, RepeatType, TaskType } from '@/types/api'

/** Vietnamese labels for enum values coming from the API. */

export const FISH_STATUS_LABELS: Record<FishStatus, string> = {
  ALIVE: 'Còn sống',
  DEAD: 'Đã chết',
}

export const CARE_RESULT_LABELS: Record<CareResult, string> = {
  DONE: 'Hoàn thành',
  SNOOZED: 'Hoãn đến mai',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEED: 'Cho ăn',
  WATER_CHANGE: 'Thay nước',
  FERTILIZE: 'Bón phân',
  OTHER: 'Khác',
}

/** The title filled in when a type is chosen; "Khác" has none, the user types it. */
export const DEFAULT_TASK_TITLES: Record<TaskType, string> = {
  FEED: 'Cho ăn',
  WATER_CHANGE: 'Thay nước',
  FERTILIZE: 'Bón phân',
  OTHER: '',
}

export const REPEAT_TYPE_LABELS: Record<RepeatType, string> = {
  DAILY: 'Mỗi ngày',
  EVERY_N_DAYS: 'Mỗi N ngày',
  ONCE: 'Một lần',
}

export function fishStatusLabel(status: FishStatus): string {
  return FISH_STATUS_LABELS[status]
}
