import { describe, expect, it } from 'vitest'
import { addDays, firstDue, vietnamNow } from './schedule'

// Same examples as the backend's ScheduleCalculatorTest.firstDue tests.
const daily = (now: string, time = '08:00') =>
  firstDue({ repeatType: 'DAILY', timeOfDay: time, intervalDays: null, startDate: null }, now)
const everyN = (n: number, start: string, time: string, now: string) =>
  firstDue({ repeatType: 'EVERY_N_DAYS', timeOfDay: time, intervalDays: n, startDate: start }, now)

describe('firstDue: daily', () => {
  it('is today before the time and tomorrow after it', () => {
    expect(daily('2026-11-21T07:00:00')).toBe('2026-11-21T08:00:00')
    expect(daily('2026-11-21T09:00:00')).toBe('2026-11-22T08:00:00')
  })

  it('treats exactly the time as already passed', () => {
    expect(daily('2026-11-21T08:00:00')).toBe('2026-11-22T08:00:00')
    expect(daily('2026-11-21T07:59:59')).toBe('2026-11-21T08:00:00')
  })

  it('crosses month, year and leap day', () => {
    expect(daily('2026-11-30T09:00:00')).toBe('2026-12-01T08:00:00')
    expect(daily('2026-12-31T09:00:00')).toBe('2027-01-01T08:00:00')
    expect(daily('2028-02-28T09:00:00')).toBe('2028-02-29T08:00:00')
    expect(daily('2028-02-29T09:00:00')).toBe('2028-03-01T08:00:00')
  })

  it('handles midnight and the last minute', () => {
    expect(daily('2026-11-21T00:00:00', '00:00')).toBe('2026-11-22T00:00:00')
    expect(daily('2026-11-21T23:58:00', '23:59')).toBe('2026-11-21T23:59:00')
  })
})

describe('firstDue: every N days', () => {
  it('uses a future start date as it is', () => {
    expect(everyN(7, '2026-11-25', '08:00', '2026-11-21T12:00:00')).toBe('2026-11-25T08:00:00')
  })

  it('starting today depends on the time', () => {
    expect(everyN(7, '2026-11-21', '08:00', '2026-11-21T07:00:00')).toBe('2026-11-21T08:00:00')
    expect(everyN(7, '2026-11-21', '08:00', '2026-11-21T09:00:00')).toBe('2026-11-28T08:00:00')
    expect(everyN(7, '2026-11-21', '08:00', '2026-11-21T08:00:00')).toBe('2026-11-28T08:00:00')
  })

  it('jumps from a past start date to the next step after now', () => {
    expect(everyN(3, '2026-11-01', '19:00', '2026-11-21T10:00:00')).toBe('2026-11-22T19:00:00')
    expect(everyN(3, '2026-11-01', '19:00', '2026-11-19T10:00:00')).toBe('2026-11-19T19:00:00')
    expect(everyN(3, '2026-11-01', '19:00', '2026-11-19T20:00:00')).toBe('2026-11-22T19:00:00')
  })

  it('supports the limits 2 and 60 and crosses year and leap day', () => {
    expect(everyN(2, '2026-11-20', '08:00', '2026-11-21T09:00:00')).toBe('2026-11-22T08:00:00')
    expect(everyN(60, '2026-01-01', '08:00', '2026-11-21T09:00:00')).toBe('2026-12-27T08:00:00')
    expect(everyN(10, '2026-12-25', '08:00', '2026-12-26T09:00:00')).toBe('2027-01-04T08:00:00')
    expect(everyN(2, '2028-02-27', '08:00', '2028-02-27T09:00:00')).toBe('2028-02-29T08:00:00')
  })

  it('has no result without a start date or a valid interval', () => {
    expect(everyN(7, '', '08:00', '2026-11-21T09:00:00')).toBeNull()
    expect(
      firstDue(
        { repeatType: 'EVERY_N_DAYS', timeOfDay: '08:00', intervalDays: null, startDate: '2026-11-21' },
        '2026-11-21T09:00:00',
      ),
    ).toBeNull()
  })
})

describe('firstDue: once', () => {
  it('is exactly its date and time', () => {
    expect(
      firstDue(
        { repeatType: 'ONCE', timeOfDay: '21:30', intervalDays: null, startDate: '2026-11-25' },
        '2026-11-21T08:00:00',
      ),
    ).toBe('2026-11-25T21:30:00')
  })

  it('has no result without a date', () => {
    expect(
      firstDue({ repeatType: 'ONCE', timeOfDay: '21:30', intervalDays: null, startDate: null }, '2026-11-21T08:00:00'),
    ).toBeNull()
  })
})

describe('addDays', () => {
  it('moves across month ends and leap days', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('vietnamNow', () => {
  it('is UTC+7 whatever the device timezone', () => {
    expect(vietnamNow(new Date('2026-11-21T01:00:00Z'))).toBe('2026-11-21T08:00:00')
    expect(vietnamNow(new Date('2026-11-21T20:30:15Z'))).toBe('2026-11-22T03:30:15')
    expect(vietnamNow(new Date('2026-12-31T17:00:00Z'))).toBe('2027-01-01T00:00:00')
  })
})
