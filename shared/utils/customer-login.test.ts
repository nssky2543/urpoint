import { describe, expect, test } from 'bun:test'
import {
  assertLoginMethods,
  canEnableLineLogin,
  effectiveCustomerLoginMethods,
} from './customer-login'

describe('customer login methods', () => {
  test('allows LINE only after OA is active', () => {
    expect(canEnableLineLogin(true)).toBe(true)
    expect(canEnableLineLogin(false)).toBe(false)
  })

  test('hides LINE on the public page until OA is active', () => {
    expect(effectiveCustomerLoginMethods({
      lineEnabled: true,
      otpEnabled: true,
      lineActive: false,
    })).toEqual({ lineEnabled: false, otpEnabled: true })
  })

  test('rejects LINE before OA setup', () => {
    expect(() => assertLoginMethods({
      lineEnabled: true,
      otpEnabled: true,
      lineActive: false,
    })).toThrow('ต้องเชื่อมต่อ LINE OA')
  })

  test('requires at least one method', () => {
    expect(() => assertLoginMethods({
      lineEnabled: false,
      otpEnabled: false,
      lineActive: true,
    })).toThrow('อย่างน้อย 1 วิธี')
  })

  test('accepts LINE, OTP, or both when OA is ready', () => {
    expect(() => assertLoginMethods({
      lineEnabled: true,
      otpEnabled: false,
      lineActive: true,
    })).not.toThrow()

    expect(() => assertLoginMethods({
      lineEnabled: false,
      otpEnabled: true,
      lineActive: false,
    })).not.toThrow()

    expect(() => assertLoginMethods({
      lineEnabled: true,
      otpEnabled: true,
      lineActive: true,
    })).not.toThrow()
  })
})
