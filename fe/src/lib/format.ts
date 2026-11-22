/**
 * Date helpers. The API sends dates without a timezone (Vietnam time, "2026-11-21" and
 * "2026-11-21T08:00:00"), so the text is formatted directly instead of going through `Date`,
 * which would shift it by the browser's timezone.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/
const TIME_PATTERN = /T(\d{2}):(\d{2})/

/** "2026-11-21" or "2026-11-21T08:00:00" -> "21/11/2026". Returns an empty string for null. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const match = DATE_PATTERN.exec(value)
  if (!match) return ''
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/** "2026-11-21T08:00:00" -> "21/11/2026 08:00". Falls back to the date when there is no time. */
export function formatDateTime(value: string | null | undefined): string {
  const date = formatDate(value)
  if (!date || !value) return date
  const time = TIME_PATTERN.exec(value)
  return time ? `${date} ${time[1]}:${time[2]}` : date
}

const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** 64.8 -> "64,8 lít", 60 -> "60 lít", 10000 -> "10.000 lít". */
export function formatLiters(liters: number): string {
  return `${NUMBER_FORMAT.format(liters)} lít`
}

/** (60, 30, 36) -> "60 × 30 × 36 cm" (dài × rộng × cao). */
export function formatDimensions(lengthCm: number, widthCm: number, heightCm: number): string {
  return `${NUMBER_FORMAT.format(lengthCm)} × ${NUMBER_FORMAT.format(widthCm)} × ${NUMBER_FORMAT.format(heightCm)} cm`
}
