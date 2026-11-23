/**
 * Helpers for the 24-hour time input. The time is typed as HH:mm (00:00 to 23:59) and never goes
 * through the browser's own time control, which shows AM/PM according to the system language.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** True for a real 24-hour time written as "HH:mm". */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Hours of the 24-hour clock as two-digit strings: "00" to "23". */
export const HOUR_OPTIONS: readonly string[] = Array.from({ length: 24 }, (_, hour) => pad(hour))

const MINUTE_STEP = 5

/**
 * Minutes offered in the picker: every 5 minutes. A task saved earlier may have an odd minute (19:07);
 * it is added to the list so opening the picker never rounds the time without the user knowing.
 */
export function buildMinuteOptions(currentMinute?: string): string[] {
  const options = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => pad(i * MINUTE_STEP))
  if (currentMinute && /^[0-5]\d$/.test(currentMinute) && !options.includes(currentMinute)) {
    options.push(currentMinute)
    options.sort()
  }
  return options
}

/** Splits a valid "HH:mm" into its two parts; anything else gives the first hour and minute. */
export function splitTime(value: string): { hour: string; minute: string } {
  if (!isValidTime(value)) {
    return { hour: '00', minute: '00' }
  }
  const [hour, minute] = value.split(':')
  return { hour, minute }
}

/**
 * Keeps digits only (at most four) and inserts ":" after the hour: "1930" -> "19:30". A first digit
 * from 3 to 9 cannot start an hour, so a 0 is put in front: "9" -> "09".
 */
export function maskTimeText(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length > 0 && digits[0] >= '3') {
    digits = `0${digits}`
  }
  digits = digits.slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
}
