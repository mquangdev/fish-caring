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
})
