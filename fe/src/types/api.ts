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
