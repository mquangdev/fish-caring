import { ApiError, UNKNOWN_ERROR } from '@/api/axiosClient'
import { errorMessage, fieldMessages } from '@/lib/messages'

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

/** Serializable failure kept in the store (Vietnamese text, ready to show). */
export interface Failure {
  message: string
  fieldErrors: Record<string, string>
  code: string
}

/** Turn anything thrown by a service into a `Failure`. `overrides` rewords a code for one screen. */
export function toFailure(error: unknown, overrides: Record<string, string> = {}): Failure {
  const code = error instanceof ApiError ? error.code : UNKNOWN_ERROR
  const fieldErrors = error instanceof ApiError ? fieldMessages(error.fieldErrors) : {}
  return { message: errorMessage(error, overrides), fieldErrors, code }
}
