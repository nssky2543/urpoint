import { createHash, randomInt } from 'node:crypto'

export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_MS = 60 * 1000
export const OTP_MAX_ATTEMPTS = 5

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtpCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export function otpMatches(code: string, codeHash: string) {
  return hashOtpCode(code) === codeHash
}

export function canResendOtp(sentAt: Date, now = new Date()) {
  return now.getTime() - sentAt.getTime() >= OTP_RESEND_MS
}

export function isOtpExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime()
}

export function remainingOtpAttempts(attemptCount: number) {
  return Math.max(0, OTP_MAX_ATTEMPTS - attemptCount)
}

export function shouldInvalidateOtp(attemptCount: number) {
  return attemptCount >= OTP_MAX_ATTEMPTS
}

export function isDevOtpEnabled() {
  return process.env.NODE_ENV !== 'production'
}
