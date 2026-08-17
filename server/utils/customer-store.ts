import { eq } from 'drizzle-orm'
import { effectiveCustomerLoginMethods } from '#shared/utils/customer-login'
import { useDb } from '../database/client'
import { storeLineConnections, stores } from '../database/schema'
import { getAppBaseUrl } from './line'

export async function getPublicMemberStore(slug: string) {
  const [row] = await useDb()
    .select({
      store: stores,
      connection: storeLineConnections,
    })
    .from(stores)
    .leftJoin(storeLineConnections, eq(storeLineConnections.storeId, stores.id))
    .where(eq(stores.slug, slug))
    .limit(1)

  if (!row?.store) {
    return null
  }

  const lineActive = row.connection?.isActive ?? false
  const methods = effectiveCustomerLoginMethods({
    lineEnabled: row.store.customerLoginLineEnabled,
    otpEnabled: row.store.customerLoginOtpEnabled,
    lineActive,
  })
  const liffId = methods.lineEnabled ? (row.connection?.liffId || null) : null
  const appUrl = getAppBaseUrl()

  return {
    store: row.store,
    connection: row.connection,
    lineActive,
    lineEnabled: methods.lineEnabled,
    otpEnabled: methods.otpEnabled,
    liffId,
    memberUrl: `${appUrl}/m/${row.store.slug}`,
    liffUrl: liffId ? `https://liff.line.me/${liffId}` : null,
  }
}

export function toHttpError(error: unknown, fallback: string): never {
  if (error instanceof Error && error.message) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    })
  }

  throw createError({
    statusCode: 400,
    statusMessage: fallback,
  })
}
