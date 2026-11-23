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

export const PUSH_MESSAGES = {
  denied: 'Bạn chưa cho phép thông báo. Hãy cho phép thông báo cho trang này trong cài đặt của trình duyệt.',
  serverOff: 'Máy chủ chưa bật thông báo đẩy. Bạn vẫn nhận thông báo trong app.',
  failed: 'Chưa bật được thông báo trên thiết bị này. Vui lòng thử lại.',
}

const FISH_ROW_ERROR = 'Thông tin cá chưa hợp lệ.'

const BY_FIELD: Record<string, string> = {
  email: 'Email không hợp lệ.',
  password: 'Mật khẩu cần từ 8 đến 72 ký tự.',
  displayName: 'Tên hiển thị cần từ 1 đến 100 ký tự.',
  name: 'Tên bể cần từ 1 đến 100 ký tự.',
  volumeLiters: 'Thể tích từ 0,1 đến 10.000 lít.',
  lengthCm: 'Chiều dài từ 0,1 đến 1.000 cm.',
  widthCm: 'Chiều rộng từ 0,1 đến 1.000 cm.',
  heightCm: 'Chiều cao từ 0,1 đến 1.000 cm.',
  note: 'Ghi chú tối đa 1.000 ký tự.',
  fish: 'Mỗi bể tối đa 50 dòng cá.',
  title: 'Tiêu đề cần từ 1 đến 100 ký tự.',
  type: 'Vui lòng chọn loại việc.',
  repeatType: 'Vui lòng chọn kiểu lặp.',
  timeOfDay: 'Giờ nhắc không hợp lệ.',
  intervalDays: 'Số ngày từ 2 đến 60.',
  setupDate: 'Ngày setup chưa hợp lệ.',
  tankId: 'Không tìm thấy bể đã chọn.',
  startDate: 'Vui lòng chọn ngày hợp lệ (lịch một lần phải ở tương lai).',
  foodName: 'Loại thức ăn tối đa 100 ký tự.',
  waterChangePercent: 'Phần trăm nước từ 1 đến 100.',
  fertilizerMl: 'Lượng phân từ 0,1 đến 1.000 ml.',
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
    // errors on a fish row come as "fish[0].quantity"; the form shows one message per row
    const fallback = field.startsWith('fish[') ? FISH_ROW_ERROR : 'Giá trị chưa hợp lệ.'
    result[field] = BY_FIELD[field] ?? fallback
  }
  return result
}
