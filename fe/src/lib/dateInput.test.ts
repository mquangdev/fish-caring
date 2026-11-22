import { describe, expect, it } from 'vitest'
import { displayToIso, isIsoDate, isoToDisplay, maskDateText } from './dateInput'

describe('dateInput helpers', () => {
  it('masks typed digits as dd/MM/yyyy', () => {
    expect(maskDateText('')).toBe('')
    expect(maskDateText('2')).toBe('2')
    expect(maskDateText('21')).toBe('21')
    expect(maskDateText('211')).toBe('21/1')
    expect(maskDateText('2111')).toBe('21/11')
    expect(maskDateText('21112')).toBe('21/11/2')
    expect(maskDateText('21112026')).toBe('21/11/2026')
    expect(maskDateText('211120261234')).toBe('21/11/2026')
    expect(maskDateText('21/11/2026')).toBe('21/11/2026')
    expect(maskDateText('a1b2')).toBe('12')
  })

  it('converts between ISO and display', () => {
    expect(isoToDisplay('2026-11-21')).toBe('21/11/2026')
    expect(isoToDisplay('21/1')).toBe('21/1')
    expect(displayToIso('21/11/2026')).toBe('2026-11-21')
    expect(displayToIso(' 05/01/2026 ')).toBe('2026-01-05')
  })

  it('accepts only real dates', () => {
    expect(displayToIso('30/02/2026')).toBeNull()
    expect(displayToIso('29/02/2026')).toBeNull()
    expect(displayToIso('29/02/2028')).toBe('2028-02-29')
    expect(displayToIso('31/04/2026')).toBeNull()
    expect(displayToIso('00/11/2026')).toBeNull()
    expect(displayToIso('21/13/2026')).toBeNull()
    expect(displayToIso('21/11/1800')).toBeNull()
    expect(displayToIso('21/11/2101')).toBeNull()
    expect(displayToIso('21/11/26')).toBeNull()
    expect(displayToIso('2026-11-21')).toBeNull()
  })

  it('isIsoDate checks the format and the calendar', () => {
    expect(isIsoDate('2026-11-21')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('21/11/2026')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})
