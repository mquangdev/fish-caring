/** Used when nothing is configured: the same domain as the page (the dev server proxies "/api"). */
export const DEFAULT_API_BASE_URL = ''

/**
 * Turns the value of VITE_API_BASE_URL into the base URL of every API call. It is the address of the
 * backend without "/api" ("https://api.example.com"), because every service path already starts with
 * "/api". Empty means the same domain. A trailing "/api" or "/" is dropped so the prefix is never
 * doubled. Anything that is not a path or an http(s) URL falls back to the default, so a typo never
 * sends requests to a strange place.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '') {
    return DEFAULT_API_BASE_URL
  }
  if (!/^(\/|https?:\/\/)/i.test(value)) {
    console.warn(`VITE_API_BASE_URL "${value}" is not a path or an http(s) URL, using the same domain`)
    return DEFAULT_API_BASE_URL
  }
  return value
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
    .replace(/\/+$/, '')
}
