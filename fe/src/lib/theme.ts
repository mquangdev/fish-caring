const QUERY = '(prefers-color-scheme: dark)'

/** Follow the system light/dark setting by toggling the `dark` class on <html>. */
export function applySystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const media = window.matchMedia(QUERY)
  const apply = () => document.documentElement.classList.toggle('dark', media.matches)
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}

export function isDarkMode(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}
