import { describe, expect, it } from 'vitest'
import { parseId } from './ids'

describe('parseId', () => {
  it('accepts positive whole numbers', () => {
    expect(parseId('7')).toBe(7)
    expect(parseId('120')).toBe(120)
  })

  it('rejects everything else', () => {
    for (const value of [undefined, '', 'abc', '0', '-3', '1.5', 'NaN']) {
      expect(parseId(value)).toBeNull()
    }
  })
})
