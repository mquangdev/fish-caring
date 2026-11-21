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

/** Error body returned by the backend. */
export interface ApiErrorBody {
  code?: string
  message?: string
  fieldErrors?: Record<string, string>
}
