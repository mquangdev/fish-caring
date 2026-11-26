import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApiUrl } from './apiBaseUrl'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildApiUrl', () => {
  it('uses /api on the same domain when nothing is set', () => {
    expect(buildApiUrl(undefined)).toBe('/api')
    expect(buildApiUrl('')).toBe('/api')
    expect(buildApiUrl('   ')).toBe('/api')
  })

  it('appends /api to the address of the backend', () => {
    expect(buildApiUrl('https://api.example.com')).toBe('https://api.example.com/api')
    expect(buildApiUrl('http://localhost:8080')).toBe('http://localhost:8080/api')
    expect(buildApiUrl('/backend')).toBe('/backend/api')
  })

  it('never doubles /api or slashes', () => {
    expect(buildApiUrl('  https://api.example.com/  ')).toBe('https://api.example.com/api')
    expect(buildApiUrl('https://api.example.com/api')).toBe('https://api.example.com/api')
    expect(buildApiUrl('https://api.example.com/api//')).toBe('https://api.example.com/api')
    expect(buildApiUrl('/api')).toBe('/api')
    expect(buildApiUrl('/')).toBe('/api')
  })

  it('falls back to /api and warns for a value that is not a path or an http(s) URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(buildApiUrl('api.example.com')).toBe('/api')
    expect(buildApiUrl('ftp://api.example.com')).toBe('/api')

    expect(warn).toHaveBeenCalledTimes(2)
  })
})
