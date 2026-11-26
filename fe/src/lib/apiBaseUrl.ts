/** The API base URL used when nothing is configured: the same domain as the page (dev proxy or Vercel rewrite). */
export const DEFAULT_API_BASE_URL = '/api'

/**
 * Turns the value of VITE_API_BASE_URL into the base URL of every API call. Empty means the default
 * "/api". Otherwise it must be a path ("/api") or an http(s) URL that includes "/api"
 * ("https://api.example.com/api"). Anything else falls back to the default so a typo never sends
 * requests to a strange place.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '') {
    return DEFAULT_API_BASE_URL
  }
  if (!/^(\/|https?:\/\/)/i.test(value)) {
    console.warn(`VITE_API_BASE_URL "${value}" is not a path or an http(s) URL, using ${DEFAULT_API_BASE_URL}`)
    return DEFAULT_API_BASE_URL
  }
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  return withoutTrailingSlash === '' ? DEFAULT_API_BASE_URL : withoutTrailingSlash
}
