import { describe, expect, test } from 'bun:test'
import {
  canResendOtp,
  hashOtpCode,
  isOtpExpired,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MS,
  OTP_TTL_MS,
  otpMatches,
  remainingOtpAttempts,
  shouldInvalidateOtp,
} from './customer-otp'

describe('customer otp', () => {
  test('hashes codes consistently and matches only the same value', () => {
    const hash = hashOtpCode('123456')

    expect(hash).toHaveLength(64)
    expect(otpMatches('123456', hash)).toBe(true)
    expect(otpMatches('000000', hash)).toBe(false)
  })

  test('enforces resend cooldown and expiry', () => {
    const sentAt = new Date('2026-08-17T12:00:00.000Z')
    const tooSoon = new Date(sentAt.getTime() + OTP_RESEND_MS - 1)
    const ready = new Date(sentAt.getTime() + OTP_RESEND_MS)
    const expiresAt = new Date(sentAt.getTime() + OTP_TTL_MS)

    expect(canResendOtp(sentAt, tooSoon)).toBe(false)
    expect(canResendOtp(sentAt, ready)).toBe(true)
    expect(isOtpExpired(expiresAt, expiresAt)).toBe(true)
    expect(isOtpExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(false)
  })

  test('invalidates after max attempts', () => {
    expect(remainingOtpAttempts(0)).toBe(OTP_MAX_ATTEMPTS)
    expect(shouldInvalidateOtp(OTP_MAX_ATTEMPTS - 1)).toBe(false)
    expect(shouldInvalidateOtp(OTP_MAX_ATTEMPTS)).toBe(true)
  })
})
