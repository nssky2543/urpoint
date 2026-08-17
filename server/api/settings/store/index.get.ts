import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import { getAppBaseUrl } from '../../../utils/line'
import { requireSessionStore } from '../../../utils/store'

function toPublicStore(
  store: Awaited<ReturnType<typeof requireSessionStore>>['store'],
  extra: {
    lineActive: boolean
    liffId: string | null
  },
) {
  const appUrl = getAppBaseUrl()
  const liffUrl = extra.lineActive && extra.liffId
    ? `https://liff.line.me/${extra.liffId}`
    : null

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    phone: store.phone,
    businessType: store.businessType,
    staffBookingEnabled: store.staffBookingEnabled,
    customerLoginLineEnabled: store.customerLoginLineEnabled,
    customerLoginOtpEnabled: store.customerLoginOtpEnabled,
    onboarded: Boolean(store.onboardedAt),
    memberUrl: `${appUrl}/m/${store.slug}`,
    liffUrl,
  }
}

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)

  const [lineConnection] = await useDb()
    .select({
      isActive: storeLineConnections.isActive,
      liffId: storeLineConnections.liffId,
    })
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, store.id))
    .limit(1)

  const lineActive = lineConnection?.isActive ?? false

  return {
    store: toPublicStore(store, {
      lineActive,
      liffId: lineConnection?.liffId ?? null,
    }),
    lineActive,
  }
})
