import { eq } from 'drizzle-orm'
import { defaultStaffBookingEnabled } from '#shared/utils/business-type'
import { assertLoginMethods } from '#shared/utils/customer-login'
import { useDb } from '../../../database/client'
import { storeLineConnections, stores } from '../../../database/schema'
import { toHttpError } from '../../../utils/customer-store'
import { getAppBaseUrl } from '../../../utils/line'
import {
  isStoreSlugTaken,
  parseBusinessTypeInput,
  parseStoreSlugInput,
  requireSessionStore,
  validateStoreName,
  validateStorePhone,
} from '../../../utils/store'

function parseBoolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} ต้องเป็น true หรือ false`,
    })
  }

  return value
}

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody(event)

  const [lineConnection] = await useDb()
    .select({
      isActive: storeLineConnections.isActive,
      liffId: storeLineConnections.liffId,
    })
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, store.id))
    .limit(1)

  const lineActive = lineConnection?.isActive ?? false
  const updates: Partial<typeof stores.$inferInsert> = {}

  if (body?.name !== undefined) {
    updates.name = validateStoreName(body.name)
  }

  if (body?.phone !== undefined) {
    updates.phone = validateStorePhone(body.phone)
  }

  if (body?.slug !== undefined) {
    const slug = parseStoreSlugInput(body.slug)
    if (slug !== store.slug) {
      if (await isStoreSlugTaken(slug, store.id)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'ลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น',
        })
      }
      updates.slug = slug
    }
  }

  if (body?.businessType !== undefined) {
    updates.businessType = parseBusinessTypeInput(body.businessType)
    if (typeof body.staffBookingEnabled !== 'boolean') {
      updates.staffBookingEnabled = defaultStaffBookingEnabled(updates.businessType)
    }
  }

  if (body?.staffBookingEnabled !== undefined) {
    updates.staffBookingEnabled = parseBoolean(body.staffBookingEnabled, 'staffBookingEnabled')
  }

  const nextLineEnabled = body?.customerLoginLineEnabled !== undefined
    ? parseBoolean(body.customerLoginLineEnabled, 'customerLoginLineEnabled')
    : store.customerLoginLineEnabled
  const nextOtpEnabled = body?.customerLoginOtpEnabled !== undefined
    ? parseBoolean(body.customerLoginOtpEnabled, 'customerLoginOtpEnabled')
    : store.customerLoginOtpEnabled

  const loginLineEnabled = lineActive ? nextLineEnabled : false

  try {
    assertLoginMethods({
      lineEnabled: loginLineEnabled,
      otpEnabled: nextOtpEnabled,
      lineActive,
    })
  }
  catch (error) {
    toHttpError(error, 'ตั้งค่าวิธีเข้าสู่ระบบไม่ถูกต้อง')
  }

  if (loginLineEnabled !== store.customerLoginLineEnabled) {
    updates.customerLoginLineEnabled = loginLineEnabled
  }

  if (nextOtpEnabled !== store.customerLoginOtpEnabled) {
    updates.customerLoginOtpEnabled = nextOtpEnabled
  }

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ไม่มีข้อมูลที่จะอัปเดต',
    })
  }

  updates.updatedAt = new Date()

  if (!store.onboardedAt) {
    updates.onboardedAt = new Date()
  }

  let updated

  try {
    const [row] = await useDb()
      .update(stores)
      .set(updates)
      .where(eq(stores.id, store.id))
      .returning({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        phone: stores.phone,
        businessType: stores.businessType,
        staffBookingEnabled: stores.staffBookingEnabled,
        customerLoginLineEnabled: stores.customerLoginLineEnabled,
        customerLoginOtpEnabled: stores.customerLoginOtpEnabled,
        onboardedAt: stores.onboardedAt,
      })

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'ไม่พบร้าน',
      })
    }

    updated = row
  }
  catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw createError({
        statusCode: 409,
        statusMessage: 'ลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น',
      })
    }
    throw error
  }

  const appUrl = getAppBaseUrl()
  const liffUrl = lineActive && lineConnection?.liffId
    ? `https://liff.line.me/${lineConnection.liffId}`
    : null

  return {
    store: {
      ...updated,
      onboarded: Boolean(updated.onboardedAt),
      memberUrl: `${appUrl}/m/${updated.slug}`,
      liffUrl,
    },
  }
})
