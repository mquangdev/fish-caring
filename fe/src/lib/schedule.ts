import type { RepeatType } from '@/types/api'

/**
 * The same first-due maths as the backend's `ScheduleCalculator.firstDue`, so the form can preview
 * "Lần nhắc đầu tiên" before saving. Dates are "yyyy-MM-dd", times "HH:mm" and date times
 * "yyyy-MM-ddTHH:mm:ss" (Vietnam time, always the same width so they compare as text).
 */

const DAY_MS = 24 * 60 * 60 * 1000

function toDayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

export function addDays(date: string, days: number): string {
  return new Date((toDayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10)
}

function at(date: string, time: string): string {
  return `${date}T${time}:00`
}

/** The current Vietnam date and time as "yyyy-MM-ddTHH:mm:ss", whatever timezone the device uses. */
export function vietnamNow(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}

export interface ScheduleInput {
  repeatType: RepeatType
  timeOfDay: string
  intervalDays: number | null
  startDate: string | null
}

/**
 * First due time, or null when the input is not enough to compute one (for example a missing
 * start date). It is strictly after `now` except for a one-off task, which is exactly its start.
 */
export function firstDue(input: ScheduleInput, now: string): string | null {
  const { repeatType, timeOfDay, intervalDays, startDate } = input
  const today = now.slice(0, 10)

  if (repeatType === 'DAILY') {
    const candidate = at(today, timeOfDay)
    return candidate > now ? candidate : at(addDays(today, 1), timeOfDay)
  }

  if (!startDate) return null
  if (repeatType === 'ONCE') return at(startDate, timeOfDay)

  if (!intervalDays || intervalDays < 1) return null
  const first = at(startDate, timeOfDay)
  if (first > now) return first
  const elapsed = toDayNumber(today) - toDayNumber(startDate)
  let candidateDate = addDays(startDate, Math.floor(elapsed / intervalDays) * intervalDays)
  while (at(candidateDate, timeOfDay) <= now) {
    candidateDate = addDays(candidateDate, intervalDays)
  }
  return at(candidateDate, timeOfDay)
}
