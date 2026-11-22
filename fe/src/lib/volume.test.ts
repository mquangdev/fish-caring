import { describe, expect, it } from 'vitest'
import { calculateVolumeLiters, parseDecimal } from './volume'

describe('parseDecimal', () => {
  it('reads whole numbers and one decimal with a dot or a comma', () => {
    expect(parseDecimal('60')).toBe(60)
    expect(parseDecimal(' 64.8 ')).toBe(64.8)
    expect(parseDecimal('64,8')).toBe(64.8)
    expect(parseDecimal('0,1')).toBe(0.1)
  })

  it('rejects empty text, more than one decimal, signs and words', () => {
    for (const text of ['', ' ', '64.85', '64,85', '-5', '+5', 'abc', '1e3', '12.', '.5', '1,2,3']) {
      expect(parseDecimal(text)).toBeNull()
    }
  })
})

describe('calculateVolumeLiters', () => {
  it('converts cubic centimetres to litres', () => {
    expect(calculateVolumeLiters(60, 30, 36)).toBe(64.8)
    expect(calculateVolumeLiters(100, 50, 50)).toBe(250)
    expect(calculateVolumeLiters(10, 10, 10)).toBe(1)
  })

  it('rounds half up to one decimal, exactly like the backend', () => {
    expect(calculateVolumeLiters(10.5, 10, 9.57)).toBe(1) // 1.00485 L
    expect(calculateVolumeLiters(10.5, 10, 10)).toBe(1.1) // 1.05 L, on the half
    expect(calculateVolumeLiters(3.1, 4.3, 3.7)).toBe(0) // 0.049 L
    expect(calculateVolumeLiters(5, 5, 2)).toBe(0.1) // 0.05 L, on the half
  })

  it('handles decimal sides without floating point drift', () => {
    expect(calculateVolumeLiters(45.5, 30.2, 40.1)).toBe(55.1)
    expect(calculateVolumeLiters(0.1, 0.1, 0.1)).toBe(0)
  })

  it('handles the largest sides', () => {
    expect(calculateVolumeLiters(1000, 1000, 1000)).toBe(1000000)
    expect(calculateVolumeLiters(1000, 100, 100)).toBe(10000)
  })
})
