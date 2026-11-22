import type { Fish, FishPayload, FishStatus } from '@/types/api'

/** One editable row of the fish list in the tank form. Numbers are kept as the text typed in. */
export interface FishRow {
  /** Stable key for React and for matching errors to rows; never sent to the server. */
  key: string
  speciesName: string
  quantity: string
  status: FishStatus
}

let counter = 0

export function newFishRow(partial: Partial<Omit<FishRow, 'key'>> = {}): FishRow {
  counter += 1
  return {
    key: `row-${counter}`,
    speciesName: '',
    quantity: '1',
    status: 'ALIVE',
    ...partial,
  }
}

export function rowsFromFish(fish: Fish[]): FishRow[] {
  return fish.map((item) =>
    newFishRow({ speciesName: item.speciesName, quantity: String(item.quantity), status: item.status }),
  )
}

/** Rows in display order (newest first), exactly as the API expects them. */
export function rowsToPayload(rows: FishRow[]): FishPayload[] {
  return rows.map((row) => ({
    speciesName: row.speciesName.trim(),
    quantity: Number(row.quantity.trim()),
    status: row.status,
  }))
}
