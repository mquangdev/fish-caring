import { describe, expect, it } from 'vitest'
import { describeDetail, describeRepeat } from './taskText'

describe('describeRepeat', () => {
  it('describes each repeat type', () => {
    expect(describeRepeat({ repeatType: 'DAILY', intervalDays: null, timeOfDay: '08:00', startDate: null })).toBe(
      'Mỗi ngày 08:00',
    )
    expect(
      describeRepeat({ repeatType: 'EVERY_N_DAYS', intervalDays: 7, timeOfDay: '19:00', startDate: '2026-11-21' }),
    ).toBe('Mỗi 7 ngày 19:00')
    expect(
      describeRepeat({ repeatType: 'ONCE', intervalDays: null, timeOfDay: '21:00', startDate: '2026-11-25' }),
    ).toBe('Một lần 25/11/2026 21:00')
  })
})

describe('describeDetail', () => {
  const none = { foodName: null, waterChangePercent: null, fertilizerMl: null }

  it('describes the detail of each type', () => {
    expect(describeDetail({ ...none, type: 'WATER_CHANGE', waterChangePercent: 30 })).toBe('Thay 30% nước')
    expect(describeDetail({ ...none, type: 'FERTILIZE', fertilizerMl: 5.5 })).toBe('Bón 5,5 ml phân nước')
    expect(describeDetail({ ...none, type: 'FERTILIZE', fertilizerMl: 5 })).toBe('Bón 5 ml phân nước')
    expect(describeDetail({ ...none, type: 'FEED', foodName: 'Hạt 1mm' })).toBe('Thức ăn: Hạt 1mm')
  })

  it('is empty when there is no detail', () => {
    expect(describeDetail({ ...none, type: 'WATER_CHANGE' })).toBe('')
    expect(describeDetail({ ...none, type: 'FERTILIZE' })).toBe('')
    expect(describeDetail({ ...none, type: 'FEED' })).toBe('')
    expect(describeDetail({ ...none, type: 'OTHER', foodName: 'x' })).toBe('')
  })
})
