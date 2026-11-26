import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveApiBaseUrl } from './apiBaseUrl'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveApiBaseUrl', () => {
  it('uses the same domain when nothing is set', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('')
    expect(resolveApiBaseUrl('')).toBe('')
    expect(resolveApiBaseUrl('   ')).toBe('')
  })

  it('keeps the address of the backend', () => {
    expect(resolveApiBaseUrl('https://api.example.com')).toBe('https://api.example.com')
    expect(resolveApiBaseUrl('http://localhost:8080')).toBe('http://localhost:8080')
    expect(resolveApiBaseUrl('/backend')).toBe('/backend')
  })

  it('drops spaces, trailing slashes and a trailing /api so the prefix is not doubled', () => {
    expect(resolveApiBaseUrl('  https://api.example.com/  ')).toBe('https://api.example.com')
    expect(resolveApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com')
    expect(resolveApiBaseUrl('https://api.example.com/api//')).toBe('https://api.example.com')
    expect(resolveApiBaseUrl('/api')).toBe('')
    expect(resolveApiBaseUrl('/')).toBe('')
  })

  it('falls back to the same domain and warns for a value that is not a path or an http(s) URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveApiBaseUrl('api.example.com')).toBe('')
    expect(resolveApiBaseUrl('ftp://api.example.com')).toBe('')

    expect(warn).toHaveBeenCalledTimes(2)
  })
})
