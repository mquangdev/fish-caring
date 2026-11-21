import { ApiError, NETWORK_ERROR } from '@/api/axiosClient'

/** All user-facing error text (Vietnamese) lives here. The API sends English messages and codes. */

const BY_CODE: Record<string, string> = {
  [NETWORK_ERROR]: 'Không kết nối được máy chủ. Vui lòng thử lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  BAD_REQUEST: 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  CONFLICT: 'Thông tin này đã tồn tại.',
  INTERNAL_ERROR: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
}

export const GENERIC_ERROR = 'Đã có lỗi xảy ra. Vui lòng thử lại.'

const BY_FIELD: Record<string, string> = {
  email: 'Email không hợp lệ.',
  password: 'Mật khẩu cần từ 8 đến 72 ký tự.',
  displayName: 'Tên hiển thị cần từ 1 đến 100 ký tự.',
}

/** Friendly message for any error. `overrides` lets a screen word a code in its own context. */
export function errorMessage(error: unknown, overrides: Record<string, string> = {}): string {
  if (error instanceof ApiError) {
    return overrides[error.code] ?? BY_CODE[error.code] ?? GENERIC_ERROR
  }
  return GENERIC_ERROR
}

/** Vietnamese text per form field for a validation error, keyed by field name. */
export function fieldMessages(fieldErrors: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of Object.keys(fieldErrors)) {
    result[field] = BY_FIELD[field] ?? 'Giá trị chưa hợp lệ.'
  }
  return result
}
