import { describe, expect, it } from 'vitest'
import { newFishRow, rowsFromFish, rowsToPayload } from './fishRows'

describe('fishRows', () => {
  it('a new row is alive with quantity 1 and a unique key', () => {
    const a = newFishRow()
    const b = newFishRow()

    expect(a).toMatchObject({ speciesName: '', quantity: '1', status: 'ALIVE' })
    expect(a.key).not.toBe(b.key)
  })

  it('rows built from the API keep order, and the payload keeps the same order', () => {
    const rows = rowsFromFish([
      { id: 9, speciesName: ' Neon ', quantity: 10, status: 'ALIVE' },
      { id: 4, speciesName: 'Guppy', quantity: 2, status: 'DEAD' },
    ])

    expect(rowsToPayload(rows)).toEqual([
      { speciesName: 'Neon', quantity: 10, status: 'ALIVE' },
      { speciesName: 'Guppy', quantity: 2, status: 'DEAD' },
    ])
  })

  it('the payload sends quantity as a number', () => {
    const [row] = rowsToPayload([newFishRow({ speciesName: 'Betta', quantity: ' 3 ' })])

    expect(row.quantity).toBe(3)
  })
})
