import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiBaseUrl } from './apiBaseUrl'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveApiBaseUrl', () => {
  it('uses /api when nothing is set', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('/api')
    expect(resolveApiBaseUrl('')).toBe('/api')
    expect(resolveApiBaseUrl('   ')).toBe('/api')
  })

  it('keeps a path or an http(s) URL as it is', () => {
    expect(resolveApiBaseUrl('/api')).toBe('/api')
    expect(resolveApiBaseUrl('/backend/api')).toBe('/backend/api')
    expect(resolveApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com/api')
    expect(resolveApiBaseUrl('http://192.168.0.104:8089/api')).toBe('http://192.168.0.104:8089/api')
  })

  it('trims spaces and trailing slashes', () => {
    expect(resolveApiBaseUrl('  https://api.example.com/api/  ')).toBe('https://api.example.com/api')
    expect(resolveApiBaseUrl('/api//')).toBe('/api')
    expect(resolveApiBaseUrl('/')).toBe('/api')
  })

  it('falls back to /api and warns for a value that is not a path or an http(s) URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveApiBaseUrl('api.example.com/api')).toBe('/api')
    expect(resolveApiBaseUrl('ftp://api.example.com')).toBe('/api')

    expect(warn).toHaveBeenCalledTimes(2)
  })
})
