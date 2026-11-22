/**
 * Tank size helpers. Dimensions are in centimetres and the volume is in litres with at most one
 * decimal. The backend calculates the stored volume with the same formula and rounding (half up).
 */

export const MIN_VOLUME_LITERS = 0.1
export const MAX_VOLUME_LITERS = 10000
export const MIN_DIMENSION_CM = 0.1
export const MAX_DIMENSION_CM = 1000

// Digits with an optional single decimal digit; both "." and "," are accepted as the separator.
const ONE_DECIMAL = /^\d+([.,]\d)?$/

/** "64,8" or "64.8" -> 64.8. Returns null for empty text, more than one decimal, or non numbers. */
export function parseDecimal(text: string): number | null {
  const value = text.trim()
  if (!ONE_DECIMAL.test(value)) return null
  return Number(value.replace(',', '.'))
}

/**
 * Volume in litres of a box tank, rounded half up to one decimal (60 x 30 x 36 cm = 64.8 L).
 * Works in whole tenths so floating point error cannot change the rounding.
 */
export function calculateVolumeLiters(lengthCm: number, widthCm: number, heightCm: number): number {
  const length = Math.round(lengthCm * 10)
  const width = Math.round(widthCm * 10)
  const height = Math.round(heightCm * 10)
  // litres x 10 = length x width x height / 100000 (each side is already x 10)
  const tenths = Math.floor((2 * length * width * height + 100000) / 200000)
  return tenths / 10
}
