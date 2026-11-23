import { describe, expect, it } from 'vitest'
import { buildMinuteOptions, HOUR_OPTIONS, isValidTime, maskTimeText, splitTime } from './timeInput'

describe('picker options', () => {
  it('offers the 24 hours 00 to 23', () => {
    expect(HOUR_OPTIONS).toHaveLength(24)
    expect(HOUR_OPTIONS[0]).toBe('00')
    expect(HOUR_OPTIONS[23]).toBe('23')
  })

  it('offers minutes in steps of 5, plus an odd minute that is already set', () => {
    expect(buildMinuteOptions()).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'])
    expect(buildMinuteOptions('30')).toHaveLength(12)
    expect(buildMinuteOptions('07')).toEqual(['00', '05', '07', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'])
    expect(buildMinuteOptions('99')).toHaveLength(12)
  })

  it('splits a valid time and falls back to 00:00 otherwise', () => {
    expect(splitTime('19:07')).toEqual({ hour: '19', minute: '07' })
    expect(splitTime('')).toEqual({ hour: '00', minute: '00' })
    expect(splitTime('25:75')).toEqual({ hour: '00', minute: '00' })
  })
})

describe('maskTimeText', () => {
  it('adds the colon after the hour while typing', () => {
    expect(maskTimeText('')).toBe('')
    expect(maskTimeText('1')).toBe('1')
    expect(maskTimeText('19')).toBe('19')
    expect(maskTimeText('193')).toBe('19:3')
    expect(maskTimeText('1930')).toBe('19:30')
    expect(maskTimeText('19:30')).toBe('19:30')
  })

  it('keeps digits only and at most four of them', () => {
    expect(maskTimeText('19:305')).toBe('19:30')
    expect(maskTimeText('1a9b3c0')).toBe('19:30')
    expect(maskTimeText('::')).toBe('')
    expect(maskTimeText(' 08 : 05 ')).toBe('08:05')
  })

  it('puts a 0 in front of a first digit that cannot start an hour', () => {
    expect(maskTimeText('9')).toBe('09')
    expect(maskTimeText('930')).toBe('09:30')
    expect(maskTimeText('3')).toBe('03')
    expect(maskTimeText('2')).toBe('2')
    expect(maskTimeText('0')).toBe('0')
  })

  it('lets the user delete backwards through the colon', () => {
    expect(maskTimeText('19:3')).toBe('19:3')
    expect(maskTimeText('19:')).toBe('19')
    expect(maskTimeText('19')).toBe('19')
    expect(maskTimeText('1')).toBe('1')
  })

  it('does not change a number that is not a real time; checking is for the form', () => {
    expect(maskTimeText('2575')).toBe('25:75')
  })
})

describe('isValidTime', () => {
  it('accepts every time of the 24-hour clock', () => {
    for (const time of ['00:00', '08:05', '12:00', '13:45', '19:30', '23:59']) {
      expect(isValidTime(time)).toBe(true)
    }
  })

  it('rejects anything else, including AM/PM and 24:00', () => {
    for (const time of ['', '8:05', '24:00', '23:60', '25:75', '19:3', '19', '12:00 PM', '07:30 AM', '19-30']) {
      expect(isValidTime(time)).toBe(false)
    }
  })
})
