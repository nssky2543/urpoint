import { describe, expect, test } from 'bun:test'
import {
  isThaiMobile,
  maskThaiMobile,
  normalizeThaiMobile,
} from './phone'

describe('thai mobile phone', () => {
  test('normalizes local, plus, and country-code formats', () => {
    expect(normalizeThaiMobile('081-234-5678')).toBe('66812345678')
    expect(normalizeThaiMobile('0812345678')).toBe('66812345678')
    expect(normalizeThaiMobile('+66 81 234 5678')).toBe('66812345678')
    expect(normalizeThaiMobile('66812345678')).toBe('66812345678')
    expect(normalizeThaiMobile('812345678')).toBe('66812345678')
    expect(normalizeThaiMobile('091 000 1111')).toBe('66910001111')
  })

  test('rejects invalid numbers', () => {
    expect(() => normalizeThaiMobile('')).toThrow('กรอกเบอร์โทรศัพท์')
    expect(() => normalizeThaiMobile('021234567')).toThrow('เบอร์มือถือไทยไม่ถูกต้อง')
    expect(() => normalizeThaiMobile('123')).toThrow('เบอร์มือถือไทยไม่ถูกต้อง')
    expect(() => normalizeThaiMobile(null)).toThrow('กรอกเบอร์โทรศัพท์')
    expect(isThaiMobile('66812345678')).toBe(true)
    expect(isThaiMobile('66012345678')).toBe(false)
  })

  test('masks local display numbers', () => {
    expect(maskThaiMobile('66812345678')).toBe('081-xxx-5678')
    expect(maskThaiMobile('66910001111')).toBe('091-xxx-1111')
  })
})
