import { describe, expect, it } from 'vitest'
import { validateDisplayName, validateEmail, validatePassword } from './validation'

describe('validation', () => {
  it('email: required and well formed', () => {
    expect(validateEmail('')).toBe('Vui lòng nhập email.')
    expect(validateEmail('   ')).toBe('Vui lòng nhập email.')
    expect(validateEmail('not-an-email')).toBe('Email không hợp lệ.')
    expect(validateEmail('a@b')).toBe('Email không hợp lệ.')
    expect(validateEmail(' a@example.com ')).toBeNull()
  })

  it('password: login only needs a value, registration enforces 8 to 72 characters', () => {
    expect(validatePassword('', true)).toBe('Vui lòng nhập mật khẩu.')
    expect(validatePassword('x', true)).toBeNull()
    expect(validatePassword('short')).toBe('Mật khẩu cần ít nhất 8 ký tự.')
    expect(validatePassword('12345678')).toBeNull()
    expect(validatePassword('x'.repeat(73))).toBe('Mật khẩu tối đa 72 ký tự.')
  })

  it('display name: required, at most 100 characters', () => {
    expect(validateDisplayName('  ')).toBe('Vui lòng nhập tên hiển thị.')
    expect(validateDisplayName('Alice')).toBeNull()
    expect(validateDisplayName('x'.repeat(101))).toBe('Tên hiển thị tối đa 100 ký tự.')
  })
})
