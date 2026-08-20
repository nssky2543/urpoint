import { eq } from 'drizzle-orm'
import { effectiveCustomerLoginMethods } from '#shared/utils/customer-login'
import { useDb } from '../../database/client'
import { stores, storeLineConnections } from '../../database/schema'
import { createCustomerSession } from '../../utils/customer-session'
import {
  channelIdFromLiffId,
  peekLineIdTokenClaims,
  verifyLineIdToken,
} from '../../utils/line'
import { toPublicStoreCustomer, upsertStoreCustomerByLine } from '../../utils/store-customers'

async function verifyWithChannelCandidates(input: {
  idToken: string
  channelIds: string[]
}) {
  const unique = [...new Set(input.channelIds.map(id => id.trim()).filter(Boolean))]
  let lastError: unknown

  for (const channelId of unique) {
    try {
      return await verifyLineIdToken({
        idToken: input.idToken,
        channelId,
      })
    }
    catch (error) {
      lastError = error
    }
  }

  throw lastError || createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: 'ยืนยัน LINE ID token ไม่สำเร็จ',
  })
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const storeSlug = typeof body?.storeSlug === 'string' ? body.storeSlug.trim() : ''
  const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : ''

  if (!storeSlug || !idToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'ต้องส่ง storeSlug และ idToken',
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
      statusMessage: 'Not Found',
      message: 'ร้านนี้ยังไม่เปิดใช้งาน LINE',
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
      statusMessage: 'Bad Request',
      message: 'ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วย LINE',
    })
  }

  const claims = peekLineIdTokenClaims(idToken)
  const channelCandidates = [
    row.connection.loginChannelId,
    channelIdFromLiffId(row.connection.liffId),
    claims?.aud || '',
  ].filter((id) => {
    if (!id) return false
    // Only accept aud that belongs to this store's known channels.
    return id === row.connection.loginChannelId
      || id === channelIdFromLiffId(row.connection.liffId)
  })

  const identity = await verifyWithChannelCandidates({
    idToken,
    channelIds: channelCandidates,
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
