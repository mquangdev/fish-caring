const KEY = 'fish-caring:token'

// Every access is wrapped: storage can be missing or throw (private mode, blocked site data).

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    // the session just will not survive a reload
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
