import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatDimensions, formatLiters } from './format'

describe('format', () => {
  it('formats a date as dd/MM/yyyy without shifting it', () => {
    expect(formatDate('2026-11-21')).toBe('21/11/2026')
    expect(formatDate('2026-01-05T23:30:00')).toBe('05/01/2026')
  })

  it('formats a date time as dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime('2026-11-21T08:05:00')).toBe('21/11/2026 08:05')
    expect(formatDateTime('2026-11-21T00:00:00.000')).toBe('21/11/2026 00:00')
  })

  it('falls back to the date when there is no time, and to an empty string for nothing', () => {
    expect(formatDateTime('2026-11-21')).toBe('21/11/2026')
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDateTime(null)).toBe('')
    expect(formatDate('not a date')).toBe('')
  })

  it('formats litres the Vietnamese way', () => {
    expect(formatLiters(64.8)).toBe('64,8 lít')
    expect(formatLiters(60)).toBe('60 lít')
    expect(formatLiters(60.0)).toBe('60 lít')
    expect(formatLiters(10000)).toBe('10.000 lít')
    expect(formatLiters(0.1)).toBe('0,1 lít')
  })

  it('formats dimensions as length x width x height', () => {
    expect(formatDimensions(60, 30, 36)).toBe('60 × 30 × 36 cm')
    expect(formatDimensions(45.5, 30, 40.1)).toBe('45,5 × 30 × 40,1 cm')
  })
})
