/** Shapes exchanged with the backend (see docs/spec.md section 8). */

export interface User {
  id: number
  email: string
  displayName: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface RegisterPayload {
  email: string
  password: string
  displayName: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface UpdateProfilePayload {
  displayName: string
}

export type FishStatus = 'ALIVE' | 'DEAD'

export interface Fish {
  id: number
  speciesName: string
  quantity: number
  status: FishStatus
}

/** One entry of the tank list. `nextDueAt` is null when no enabled task exists. */
export interface TankSummary {
  id: number
  name: string
  volumeLiters: number | null
  taskCount: number
  nextDueAt: string | null
}

/** A tank with its fish, newest first. Dates come without a timezone (Vietnam time). */
export interface Tank {
  id: number
  name: string
  volumeLiters: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  setupDate: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  fish: Fish[]
  /** Care tasks: enabled first by nearest due time, disabled last. */
  tasks: CareTask[]
}

export type TaskType = 'FEED' | 'WATER_CHANGE' | 'FERTILIZE' | 'OTHER'
export type RepeatType = 'DAILY' | 'EVERY_N_DAYS' | 'ONCE'

/** A care task. `timeOfDay` is "HH:mm"; `nextDueAt` is null while the task is disabled. */
export interface CareTask {
  id: number
  /** The tank the task belongs to; null for a general task ("Việc chung"). */
  tankId: number | null
  type: TaskType
  title: string
  note: string | null
  repeatType: RepeatType
  intervalDays: number | null
  timeOfDay: string
  startDate: string | null
  foodName: string | null
  waterChangePercent: number | null
  fertilizerMl: number | null
  enabled: boolean
  nextDueAt: string | null
  createdAt: string
  updatedAt: string
}

/** Body of create and update. Send only the detail field of the chosen type. */
export interface TaskPayload {
  tankId: number | null
  type: TaskType
  title: string
  note: string | null
  repeatType: RepeatType
  intervalDays: number | null
  timeOfDay: string
  startDate: string | null
  foodName: string | null
  waterChangePercent: number | null
  fertilizerMl: number | null
}

export interface FishPayload {
  speciesName: string
  quantity: number
  status: FishStatus
}

/**
 * Body of create and update. Send either the three dimensions (the server calculates the volume)
 * or only `volumeLiters`. `fish` is the whole list in display order (newest first).
 */
export interface TankPayload {
  name: string
  volumeLiters: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  setupDate: string | null
  note: string | null
  fish: FishPayload[]
}

/** Error body returned by the backend. */
export interface ApiErrorBody {
  code?: string
  message?: string
  fieldErrors?: Record<string, string>
}

export type CareResult = 'DONE' | 'SNOOZED'

/** One line of the care history. `tankId` is null for a task that belongs to no tank. */
export interface CareLog {
  id: number
  tankId: number | null
  taskId: number | null
  taskTitle: string
  result: CareResult
  dueAt: string
  actedAt: string
}

/** A task on the "Hôm nay" screen. `tankName` is null for a task without a tank. */
export interface TodayItem {
  id: number
  tankId: number | null
  tankName: string | null
  type: TaskType
  title: string
  note: string | null
  repeatType: RepeatType
  timeOfDay: string
  foodName: string | null
  waterChangePercent: number | null
  fertilizerMl: number | null
  nextDueAt: string
}

/** `due`: due now or overdue, oldest first. `upcoming`: still to come later today. */
export interface Today {
  due: TodayItem[]
  upcoming: TodayItem[]
}
