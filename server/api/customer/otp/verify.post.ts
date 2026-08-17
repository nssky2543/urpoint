import { and, eq } from 'drizzle-orm'
import { normalizeThaiMobile } from '#shared/utils/phone'
import { useDb } from '../../../database/client'
import { customerOtpChallenges } from '../../../database/schema'
import {
  isOtpExpired,
  otpMatches,
  shouldInvalidateOtp,
} from '../../../utils/customer-otp'
import { createCustomerSession } from '../../../utils/customer-session'
import { getPublicMemberStore, toHttpError } from '../../../utils/customer-store'
import { toPublicStoreCustomer, upsertStoreCustomerByPhone } from '../../../utils/store-customers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storeSlug = typeof body?.storeSlug === 'string' ? body.storeSlug.trim() : ''
  const code = typeof body?.code === 'string' ? body.code.trim() : ''

  let phone: string
  try {
    phone = normalizeThaiMobile(body?.phone)
  }
  catch (error) {
    toHttpError(error, 'เบอร์โทรศัพท์ไม่ถูกต้อง')
  }

  if (!/^\d{6}$/.test(code)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'รหัส OTP ไม่ถูกต้อง',
    })
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

  const db = useDb()
  const [challenge] = await db
    .select()
    .from(customerOtpChallenges)
    .where(and(
      eq(customerOtpChallenges.storeId, row.store.id),
      eq(customerOtpChallenges.phone, phone),
    ))
    .limit(1)

  if (!challenge || isOtpExpired(challenge.expiresAt)) {
    if (challenge) {
      await db.delete(customerOtpChallenges).where(eq(customerOtpChallenges.id, challenge.id))
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'รหัส OTP หมดอายุหรือไม่พบ กรุณาขอรหัสใหม่',
    })
  }

  if (!otpMatches(code, challenge.codeHash)) {
    const attemptCount = challenge.attemptCount + 1

    if (shouldInvalidateOtp(attemptCount)) {
      await db.delete(customerOtpChallenges).where(eq(customerOtpChallenges.id, challenge.id))
      throw createError({
        statusCode: 400,
        statusMessage: 'ใส่รหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่',
      })
    }

    await db
      .update(customerOtpChallenges)
      .set({ attemptCount })
      .where(eq(customerOtpChallenges.id, challenge.id))

    throw createError({
      statusCode: 400,
      statusMessage: 'รหัส OTP ไม่ถูกต้อง',
    })
  }

  await db.delete(customerOtpChallenges).where(eq(customerOtpChallenges.id, challenge.id))

  const { customer, isNew } = await upsertStoreCustomerByPhone({
    storeId: row.store.id,
    phone,
  })

  await createCustomerSession(event, customer.id)

  return {
    ok: true,
    isNewMember: isNew,
    store: {
      name: row.store.name,
      slug: row.store.slug,
    },
    member: toPublicStoreCustomer(customer),
  }
})
