import { describe, expect, it } from 'vitest'
import { ApiError, NETWORK_ERROR } from '@/api/axiosClient'
import { errorMessage, fieldMessages, GENERIC_ERROR } from './messages'

describe('messages', () => {
  it('maps API codes to Vietnamese', () => {
    expect(errorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'x'))).toBe('Email hoặc mật khẩu không đúng.')
    expect(errorMessage(new ApiError(0, NETWORK_ERROR, 'x'))).toBe('Không kết nối được máy chủ. Vui lòng thử lại.')
  })

  it('lets a screen reword a code', () => {
    const conflict = new ApiError(409, 'CONFLICT', 'x')
    expect(errorMessage(conflict, { CONFLICT: 'Email này đã được đăng ký.' })).toBe('Email này đã được đăng ký.')
  })

  it('falls back to a generic message', () => {
    expect(errorMessage(new ApiError(500, 'SOMETHING_NEW', 'x'))).toBe(GENERIC_ERROR)
    expect(errorMessage(new Error('boom'))).toBe(GENERIC_ERROR)
  })

  it('translates field errors by field name, never showing the English text', () => {
    expect(fieldMessages({ email: 'must be a well-formed email address', other: 'whatever' })).toEqual({
      email: 'Email không hợp lệ.',
      other: 'Giá trị chưa hợp lệ.',
    })
  })

  it('maps tank fields and fish row errors', () => {
    expect(
      fieldMessages({
        name: 'must not be blank',
        volumeLiters: 'must be greater than or equal to 1',
        'fish[0].quantity': 'must be greater than or equal to 1',
      }),
    ).toEqual({
      name: 'Tên bể cần từ 1 đến 100 ký tự.',
      volumeLiters: 'Thể tích từ 0,1 đến 10.000 lít.',
      'fish[0].quantity': 'Thông tin cá chưa hợp lệ.',
    })
  })
})
