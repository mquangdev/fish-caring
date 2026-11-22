/**
 * Helpers for the dd/MM/yyyy date input. The form value is an ISO date ("2026-11-21") when the
 * typed text is a real date, so browsers' locale (MM/dd/yyyy in the US) never leaks into the UI.
 */

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DISPLAY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/
const MIN_YEAR = 1900
const MAX_YEAR = 2100

function isRealDate(year: number, month: number, day: number): boolean {
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return false
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day <= lastDay
}

/** True for a real calendar date written as "yyyy-MM-dd". */
export function isIsoDate(value: string): boolean {
  const match = ISO_PATTERN.exec(value)
  return match !== null && isRealDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

/** "2026-11-21" -> "21/11/2026". Anything that is not an ISO date is returned unchanged. */
export function isoToDisplay(value: string): string {
  const match = ISO_PATTERN.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

/** "21/11/2026" -> "2026-11-21", or null when it is not a real date. */
export function displayToIso(text: string): string | null {
  const match = DISPLAY_PATTERN.exec(text.trim())
  if (!match || !isRealDate(Number(match[3]), Number(match[2]), Number(match[1]))) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

/** Keeps digits only and inserts "/" after the day and the month: "21112026" -> "21/11/2026". */
export function maskDateText(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
