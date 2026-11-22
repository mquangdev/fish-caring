/** Read a route parameter as a positive whole number, or null when it is missing or not one. */
export function parseId(value: string | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}
