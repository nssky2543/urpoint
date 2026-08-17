import { and, eq } from 'drizzle-orm'
import { normalizeThaiMobile } from '#shared/utils/phone'
import { useDb } from '../../../database/client'
import { customerOtpChallenges } from '../../../database/schema'
import {
  canResendOtp,
  generateOtpCode,
  hashOtpCode,
  isDevOtpEnabled,
  OTP_TTL_MS,
} from '../../../utils/customer-otp'
import { getPublicMemberStore, toHttpError } from '../../../utils/customer-store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storeSlug = typeof body?.storeSlug === 'string' ? body.storeSlug.trim() : ''

  let phone: string
  try {
    phone = normalizeThaiMobile(body?.phone)
  }
  catch (error) {
    toHttpError(error, 'เบอร์โทรศัพท์ไม่ถูกต้อง')
  }

  const row = await getPublicMemberStore(storeSlug)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  if (!row.otpEnabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วยเบอร์โทร',
    })
  }

  const now = new Date()
  const db = useDb()
  const [existing] = await db
    .select()
    .from(customerOtpChallenges)
    .where(and(
      eq(customerOtpChallenges.storeId, row.store.id),
      eq(customerOtpChallenges.phone, phone),
    ))
    .limit(1)

  if (existing && !canResendOtp(existing.sentAt, now)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'รอสักครู่ก่อนขอรหัสใหม่',
    })
  }

  const code = generateOtpCode()
  const codeHash = hashOtpCode(code)
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS)

  if (existing) {
    await db
      .update(customerOtpChallenges)
      .set({
        codeHash,
        expiresAt,
        attemptCount: 0,
        sentAt: now,
      })
      .where(eq(customerOtpChallenges.id, existing.id))
  }
  else {
    await db.insert(customerOtpChallenges).values({
      storeId: row.store.id,
      phone,
      codeHash,
      expiresAt,
      sentAt: now,
    })
  }

  return {
    ok: true,
    expiresIn: OTP_TTL_MS / 1000,
    ...(isDevOtpEnabled() ? { devCode: code } : {}),
  }
})
