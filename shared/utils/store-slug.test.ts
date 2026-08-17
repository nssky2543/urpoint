import { describe, expect, test } from 'bun:test'
import { normalizeStoreSlug } from './store-slug'

describe('store slug', () => {
  test('normalizes spacing, case, and extra punctuation', () => {
    expect(normalizeStoreSlug('N Phink')).toBe('n-phink')
    expect(normalizeStoreSlug('  ABC Barber  ')).toBe('abc-barber')
    expect(normalizeStoreSlug('Shop___One')).toBe('shop_one')
  })

  test('rejects empty, short, and invalid values', () => {
    expect(() => normalizeStoreSlug('')).toThrow('กรอกชื่อลิงก์ร้าน')
    expect(() => normalizeStoreSlug('ab')).toThrow('3–48')
    expect(() => normalizeStoreSlug('--')).toThrow()
    expect(() => normalizeStoreSlug(null)).toThrow('กรอกชื่อลิงก์ร้าน')
  })
})
