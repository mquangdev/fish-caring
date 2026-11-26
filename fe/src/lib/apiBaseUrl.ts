const API_PATH = '/api'

/**
 * Builds the root URL of the API from VITE_API_BASE_URL, the address of the backend without "/api"
 * ("https://api.example.com" gives "https://api.example.com/api"). Empty means "/api" on the same
 * domain (the dev server proxies it). A trailing "/api" or "/" is dropped first so it is never
 * doubled. Anything that is not a path or an http(s) URL also gives "/api", so a typo never sends
 * requests to a strange place.
 */
export function buildApiUrl(rawBaseUrl: string | undefined): string {
  let baseUrl = (rawBaseUrl ?? '').trim()
  if (baseUrl !== '' && !/^(\/|https?:\/\/)/i.test(baseUrl)) {
    console.warn(`VITE_API_BASE_URL "${baseUrl}" is not a path or an http(s) URL, using ${API_PATH}`)
    baseUrl = ''
  }
  baseUrl = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
    .replace(/\/+$/, '')
  return `${baseUrl}${API_PATH}`
}
