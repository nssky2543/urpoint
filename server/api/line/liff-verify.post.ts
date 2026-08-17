import { eq } from 'drizzle-orm'
import { effectiveCustomerLoginMethods } from '#shared/utils/customer-login'
import { useDb } from '../../database/client'
import { stores, storeLineConnections } from '../../database/schema'
import { createCustomerSession } from '../../utils/customer-session'
import { verifyLineIdToken } from '../../utils/line'
import { toPublicStoreCustomer, upsertStoreCustomerByLine } from '../../utils/store-customers'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storeSlug = typeof body?.storeSlug === 'string' ? body.storeSlug.trim() : ''
  const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : ''

  if (!storeSlug || !idToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ต้องส่ง storeSlug และ idToken',
    })
  }

  const [row] = await useDb()
    .select({
      store: stores,
      connection: storeLineConnections,
    })
    .from(stores)
    .innerJoin(storeLineConnections, eq(storeLineConnections.storeId, stores.id))
    .where(eq(stores.slug, storeSlug))
    .limit(1)

  if (!row?.connection.loginChannelId || !row.connection.isActive) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ร้านนี้ยังไม่เปิดใช้งาน LINE',
    })
  }

  const methods = effectiveCustomerLoginMethods({
    lineEnabled: row.store.customerLoginLineEnabled,
    otpEnabled: row.store.customerLoginOtpEnabled,
    lineActive: row.connection.isActive,
  })

  if (!methods.lineEnabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วย LINE',
    })
  }

  const identity = await verifyLineIdToken({
    idToken,
    channelId: row.connection.loginChannelId,
  })

  const { customer, isNew } = await upsertStoreCustomerByLine({
    storeId: row.store.id,
    lineUserId: identity.sub,
    displayName: identity.name ?? null,
    pictureUrl: identity.picture ?? null,
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
    displayName: identity.name ?? null,
    pictureUrl: identity.picture ?? null,
  }
})
