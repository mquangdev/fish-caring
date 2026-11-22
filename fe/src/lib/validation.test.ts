import { describe, expect, it } from 'vitest'
import {
  validateDimensions,
  validateDisplayName,
  validateEmail,
  validateFishRow,
  validateNote,
  validatePassword,
  validateTankName,
  validateVolume,
} from './validation'

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

  it('tank name: required, at most 100 characters', () => {
    expect(validateTankName('  ')).toBe('Vui lòng nhập tên bể.')
    expect(validateTankName('Bể 1')).toBeNull()
    expect(validateTankName('x'.repeat(101))).toBe('Tên bể tối đa 100 ký tự.')
  })

  it('volume: optional, 0,1 to 10000 litres with at most one decimal', () => {
    expect(validateVolume('')).toBeNull()
    expect(validateVolume(' 60 ')).toBeNull()
    expect(validateVolume('64,8')).toBeNull()
    expect(validateVolume('64.8')).toBeNull()
    expect(validateVolume('0,1')).toBeNull()
    expect(validateVolume('10000')).toBeNull()
    expect(validateVolume('0')).toBe('Thể tích từ 0,1 đến 10.000 lít.')
    expect(validateVolume('10000,1')).toBe('Thể tích từ 0,1 đến 10.000 lít.')
    expect(validateVolume('64,85')).toBe('Thể tích cần là một số, tối đa 1 chữ số thập phân.')
    expect(validateVolume('-3')).toBe('Thể tích cần là một số, tối đa 1 chữ số thập phân.')
    expect(validateVolume('abc')).toBe('Thể tích cần là một số, tối đa 1 chữ số thập phân.')
  })

  it('dimensions: optional, but all three together', () => {
    expect(validateDimensions('', '', '')).toEqual({ length: null, width: null, height: null, volume: null })
    expect(validateDimensions('60', '30', '36')).toEqual({ length: null, width: null, height: null, volume: null })
    expect(validateDimensions('60,5', '30.5', '36')).toEqual({ length: null, width: null, height: null, volume: null })
  })

  it('dimensions: a missing side is reported by name', () => {
    expect(validateDimensions('60', '', '')).toEqual({
      length: null,
      width: 'Vui lòng nhập chiều rộng.',
      height: 'Vui lòng nhập chiều cao.',
      volume: null,
    })
    expect(validateDimensions('', '30', '36').length).toBe('Vui lòng nhập chiều dài.')
  })

  it('dimensions: each side from 0,1 to 1000 cm with at most one decimal', () => {
    expect(validateDimensions('0', '30', '36').length).toBe('Từ 0,1 đến 1.000 cm.')
    expect(validateDimensions('60', '1000,1', '36').width).toBe('Từ 0,1 đến 1.000 cm.')
    expect(validateDimensions('60', '30', '36,55').height).toBe('Chỉ nhập số, tối đa 1 chữ số thập phân.')
    expect(validateDimensions('abc', '30', '36').length).toBe('Chỉ nhập số, tối đa 1 chữ số thập phân.')
  })

  it('dimensions: the calculated volume must stay within 0,1 to 10000 litres', () => {
    expect(validateDimensions('1000', '1000', '11').volume).toBe('Thể tích vượt quá 10.000 lít.')
    expect(validateDimensions('1000', '100', '100').volume).toBeNull()
    expect(validateDimensions('1', '1', '1').volume).toBe('Thể tích quá nhỏ (tối thiểu 0,1 lít).')
  })

  it('note: at most 1000 characters', () => {
    expect(validateNote('x'.repeat(1000))).toBeNull()
    expect(validateNote('x'.repeat(1001))).toBe('Ghi chú tối đa 1.000 ký tự.')
  })

  it('fish row: species required, quantity whole number from 1 to 9999', () => {
    expect(validateFishRow('Neon', '10')).toEqual({ speciesName: null, quantity: null })
    expect(validateFishRow('  ', '1').speciesName).toBe('Vui lòng nhập tên loài.')
    expect(validateFishRow('x'.repeat(101), '1').speciesName).toBe('Tên loài tối đa 100 ký tự.')
    expect(validateFishRow('Neon', '').quantity).toBe('Số lượng cần là số nguyên.')
    expect(validateFishRow('Neon', '1.5').quantity).toBe('Số lượng cần là số nguyên.')
    expect(validateFishRow('Neon', '0').quantity).toBe('Số lượng từ 1 đến 9.999.')
    expect(validateFishRow('Neon', '10000').quantity).toBe('Số lượng từ 1 đến 9.999.')
  })
})
