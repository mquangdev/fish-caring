/** Client-side form checks. They mirror the backend rules and return Vietnamese messages (null = valid). */

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
