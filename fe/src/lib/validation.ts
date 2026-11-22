/** Client-side form checks. They mirror the backend rules and return Vietnamese messages (null = valid). */

import {
  calculateVolumeLiters,
  MAX_DIMENSION_CM,
  MAX_VOLUME_LITERS,
  MIN_DIMENSION_CM,
  MIN_VOLUME_LITERS,
  parseDecimal,
} from './volume'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return 'Vui lòng nhập email.'
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) return 'Email không hợp lệ.'
  return null
}

/** `forLogin` only requires a value; registration also enforces the length rules. */
export function validatePassword(value: string, forLogin = false): string | null {
  if (!value) return 'Vui lòng nhập mật khẩu.'
  if (forLogin) return null
  if (value.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự.'
  if (value.length > 72) return 'Mật khẩu tối đa 72 ký tự.'
  return null
}

export function validateDisplayName(value: string): string | null {
  const name = value.trim()
  if (!name) return 'Vui lòng nhập tên hiển thị.'
  if (name.length > 100) return 'Tên hiển thị tối đa 100 ký tự.'
  return null
}

export function validateTankName(value: string): string | null {
  const name = value.trim()
  if (!name) return 'Vui lòng nhập tên bể.'
  if (name.length > 100) return 'Tên bể tối đa 100 ký tự.'
  return null
}

/** The volume is optional; when given it is litres from 0,1 to 10.000 with at most one decimal. */
export function validateVolume(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  const litres = parseDecimal(text)
  if (litres === null) return 'Thể tích cần là một số, tối đa 1 chữ số thập phân.'
  if (litres < MIN_VOLUME_LITERS || litres > MAX_VOLUME_LITERS) return 'Thể tích từ 0,1 đến 10.000 lít.'
  return null
}

export interface DimensionErrors {
  length: string | null
  width: string | null
  height: string | null
  /** About the calculated volume (too big or too small), shown under the three fields. */
  volume: string | null
}

const NO_DIMENSION_ERRORS: DimensionErrors = { length: null, width: null, height: null, volume: null }

function checkDimension(text: string, name: string): string | null {
  const value = text.trim()
  if (!value) return `Vui lòng nhập ${name}.`
  const cm = parseDecimal(value)
  if (cm === null) return 'Chỉ nhập số, tối đa 1 chữ số thập phân.'
  if (cm < MIN_DIMENSION_CM || cm > MAX_DIMENSION_CM) return 'Từ 0,1 đến 1.000 cm.'
  return null
}

/**
 * Dimensions are optional, but all three must be given together. When they are all valid the
 * calculated volume must also stay within the allowed range.
 */
export function validateDimensions(length: string, width: string, height: string): DimensionErrors {
  if (!length.trim() && !width.trim() && !height.trim()) return NO_DIMENSION_ERRORS

  const result: DimensionErrors = {
    length: checkDimension(length, 'chiều dài'),
    width: checkDimension(width, 'chiều rộng'),
    height: checkDimension(height, 'chiều cao'),
    volume: null,
  }
  if (!result.length && !result.width && !result.height) {
    const volume = calculateVolumeLiters(parseDecimal(length) ?? 0, parseDecimal(width) ?? 0, parseDecimal(height) ?? 0)
    if (volume > MAX_VOLUME_LITERS) result.volume = 'Thể tích vượt quá 10.000 lít.'
    else if (volume < MIN_VOLUME_LITERS) result.volume = 'Thể tích quá nhỏ (tối thiểu 0,1 lít).'
  }
  return result
}

export function validateNote(value: string): string | null {
  return value.length > 1000 ? 'Ghi chú tối đa 1.000 ký tự.' : null
}

export interface FishRowErrors {
  speciesName: string | null
  quantity: string | null
}

/** `quantity` is the raw text of the input. */
export function validateFishRow(speciesName: string, quantity: string): FishRowErrors {
  const species = speciesName.trim()
  let speciesError: string | null = null
  if (!species) speciesError = 'Vui lòng nhập tên loài.'
  else if (species.length > 100) speciesError = 'Tên loài tối đa 100 ký tự.'

  let quantityError: string | null = null
  const text = quantity.trim()
  if (!/^\d+$/.test(text)) quantityError = 'Số lượng cần là số nguyên.'
  else if (Number(text) < 1 || Number(text) > 9999) quantityError = 'Số lượng từ 1 đến 9.999.'

  return { speciesName: speciesError, quantity: quantityError }
}
