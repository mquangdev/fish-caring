import { describe, expect, it } from 'vitest'
import { fishStatusLabel } from './labels'

describe('labels', () => {
  it('has a Vietnamese label for every fish status', () => {
    expect(fishStatusLabel('ALIVE')).toBe('Còn sống')
    expect(fishStatusLabel('DEAD')).toBe('Đã chết')
  })
})
