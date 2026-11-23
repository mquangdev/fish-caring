import { describe, expect, it } from 'vitest'
import { DEFAULT_TASK_TITLES, REPEAT_TYPE_LABELS, TASK_TYPE_LABELS } from './labels'
import { fieldMessages } from './messages'
import {
  validateFertilizerMl,
  validateFoodName,
  validateInterval,
  validateTaskDate,
  validateTaskNote,
  validateTaskTitle,
  validateTime,
  validateWaterChangePercent,
} from './validation'

describe('task validation', () => {
  it('title: required, at most 100 characters', () => {
    expect(validateTaskTitle('  ')).toBe('Vui lòng nhập tiêu đề.')
    expect(validateTaskTitle('Cho ăn')).toBeNull()
    expect(validateTaskTitle('x'.repeat(101))).toBe('Tiêu đề tối đa 100 ký tự.')
  })

  it('note: at most 500 characters', () => {
    expect(validateTaskNote('x'.repeat(500))).toBeNull()
    expect(validateTaskNote('x'.repeat(501))).toBe('Ghi chú tối đa 500 ký tự.')
  })

  it('food name: optional, at most 100 characters', () => {
    expect(validateFoodName('')).toBeNull()
    expect(validateFoodName('x'.repeat(100))).toBeNull()
    expect(validateFoodName('x'.repeat(101))).toBe('Loại thức ăn tối đa 100 ký tự.')
  })

  it('water change percent: optional whole number from 1 to 100', () => {
    expect(validateWaterChangePercent('')).toBeNull()
    expect(validateWaterChangePercent(' 30 ')).toBeNull()
    expect(validateWaterChangePercent('1')).toBeNull()
    expect(validateWaterChangePercent('100')).toBeNull()
    expect(validateWaterChangePercent('0')).toBe('Phần trăm nước từ 1 đến 100.')
    expect(validateWaterChangePercent('101')).toBe('Phần trăm nước từ 1 đến 100.')
    expect(validateWaterChangePercent('2,5')).toBe('Chỉ nhập số nguyên từ 1 đến 100.')
    expect(validateWaterChangePercent('abc')).toBe('Chỉ nhập số nguyên từ 1 đến 100.')
  })

  it('fertilizer: optional, 0,1 to 1000 ml with at most one decimal', () => {
    expect(validateFertilizerMl('')).toBeNull()
    expect(validateFertilizerMl('5')).toBeNull()
    expect(validateFertilizerMl('5,5')).toBeNull()
    expect(validateFertilizerMl('0,1')).toBeNull()
    expect(validateFertilizerMl('1000')).toBeNull()
    expect(validateFertilizerMl('0')).toBe('Lượng phân từ 0,1 đến 1.000 ml.')
    expect(validateFertilizerMl('1000,1')).toBe('Lượng phân từ 0,1 đến 1.000 ml.')
    expect(validateFertilizerMl('5,55')).toBe('Chỉ nhập số, tối đa 1 chữ số thập phân.')
    expect(validateFertilizerMl('-1')).toBe('Chỉ nhập số, tối đa 1 chữ số thập phân.')
  })

  it('interval: whole number from 2 to 60', () => {
    expect(validateInterval('2')).toBeNull()
    expect(validateInterval('60')).toBeNull()
    expect(validateInterval('1')).toBe('Số ngày từ 2 đến 60.')
    expect(validateInterval('61')).toBe('Số ngày từ 2 đến 60.')
    expect(validateInterval('')).toBe('Số ngày cần là số nguyên từ 2 đến 60.')
    expect(validateInterval('2,5')).toBe('Số ngày cần là số nguyên từ 2 đến 60.')
  })

  it('time: HH:mm', () => {
    expect(validateTime('08:00')).toBeNull()
    expect(validateTime('23:59')).toBeNull()
    expect(validateTime('00:00')).toBeNull()
    expect(validateTime('')).toBe('Vui lòng nhập giờ nhắc.')
    expect(validateTime('  ')).toBe('Vui lòng nhập giờ nhắc.')
    for (const bad of ['24:00', '23:60', '25:75', '19:3', '19', '8:05', '07:30 AM']) {
      expect(validateTime(bad)).toBe('Giờ chưa hợp lệ. Nhập theo HH:mm (00:00 đến 23:59).')
    }
  })

  it('date: required; a one-off task must be in the future', () => {
    const now = '2026-11-21T08:00:00'
    expect(validateTaskDate('', 'ONCE', '09:00', now)).toBe('Vui lòng chọn ngày.')
    expect(validateTaskDate('', 'EVERY_N_DAYS', '09:00', now)).toBe('Vui lòng chọn ngày bắt đầu.')
    expect(validateTaskDate('2026-11-21', 'ONCE', '09:00', now)).toBeNull()
    expect(validateTaskDate('2026-11-21', 'ONCE', '08:00', now)).toBe('Hãy chọn thời điểm trong tương lai.')
    expect(validateTaskDate('2026-11-20', 'ONCE', '23:00', now)).toBe('Hãy chọn thời điểm trong tương lai.')
    // an every-N-days task may start in the past
    expect(validateTaskDate('2026-11-01', 'EVERY_N_DAYS', '08:00', now)).toBeNull()
  })
})

describe('task labels and messages', () => {
  it('has Vietnamese labels for every type', () => {
    expect(TASK_TYPE_LABELS).toEqual({ FEED: 'Cho ăn', WATER_CHANGE: 'Thay nước', FERTILIZE: 'Bón phân', OTHER: 'Khác' })
    expect(DEFAULT_TASK_TITLES.OTHER).toBe('')
    expect(DEFAULT_TASK_TITLES.FEED).toBe('Cho ăn')
    expect(REPEAT_TYPE_LABELS.EVERY_N_DAYS).toBe('Mỗi N ngày')
  })

  it('maps the server field errors of a task to Vietnamese', () => {
    const messages = fieldMessages({
      title: 'x',
      intervalDays: 'x',
      startDate: 'x',
      waterChangePercent: 'x',
      fertilizerMl: 'x',
      foodName: 'x',
    })
    expect(messages.title).toContain('Tiêu đề')
    expect(messages.intervalDays).toBe('Số ngày từ 2 đến 60.')
    expect(messages.startDate).toContain('tương lai')
    expect(messages.waterChangePercent).toBe('Phần trăm nước từ 1 đến 100.')
    expect(messages.fertilizerMl).toBe('Lượng phân từ 0,1 đến 1.000 ml.')
    expect(messages.foodName).toContain('100')
  })
})
