import type { FishStatus } from '@/types/api'

/** Vietnamese labels for enum values coming from the API. */

export const FISH_STATUS_LABELS: Record<FishStatus, string> = {
  ALIVE: 'Còn sống',
  DEAD: 'Đã chết',
}

export function fishStatusLabel(status: FishStatus): string {
  return FISH_STATUS_LABELS[status]
}
