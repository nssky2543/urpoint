import { describe, expect, test } from 'bun:test'
import {
  BUSINESS_TYPES,
  defaultStaffBookingEnabled,
  isBusinessType,
} from './business-type'

describe('business type', () => {
  test('accepts barber and spa', () => {
    for (const type of BUSINESS_TYPES) {
      expect(isBusinessType(type)).toBe(true)
    }
  })

  test('rejects unknown values', () => {
    expect(isBusinessType('restaurant')).toBe(false)
    expect(isBusinessType(null)).toBe(false)
  })

  test('defaults staff booking by business type', () => {
    expect(defaultStaffBookingEnabled('barber')).toBe(true)
    expect(defaultStaffBookingEnabled('spa')).toBe(false)
  })
})
