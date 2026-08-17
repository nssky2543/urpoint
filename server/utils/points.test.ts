import { describe, expect, test } from 'bun:test'
import { nextPointsBalance, normalizePointsReason } from './points'

describe('points balance', () => {
  test('adds and subtracts within bounds', () => {
    expect(nextPointsBalance(0, 50)).toBe(50)
    expect(nextPointsBalance(50, -20)).toBe(30)
  })

  test('rejects a negative resulting balance', () => {
    expect(() => nextPointsBalance(10, -11)).toThrow('ยอดแต้มต้องไม่ติดลบ')
  })

  test('rejects empty or huge deltas', () => {
    expect(() => nextPointsBalance(10, 0)).toThrow('จำนวนเต็มที่ไม่เป็นศูนย์')
    expect(() => nextPointsBalance(10, 1.5)).toThrow('จำนวนเต็มที่ไม่เป็นศูนย์')
    expect(() => nextPointsBalance(10, 100_001)).toThrow('สูงเกินไป')
  })

  test('normalizes optional reasons', () => {
    expect(normalizePointsReason('')).toBe(null)
    expect(normalizePointsReason('  เติมแต้ม  ')).toBe('เติมแต้ม')
    expect(() => normalizePointsReason('x'.repeat(121))).toThrow('120')
  })
})
