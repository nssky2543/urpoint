import { eq } from 'drizzle-orm'
import { BUSINESS_TYPE_LABELS } from '#shared/utils/business-type'
import { useDb } from '../../database/client'
import { storeLineConnections } from '../../database/schema'
import { countStoreCustomers, requireSessionStore } from '../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)

  const [lineConnection] = await useDb()
    .select({
      isActive: storeLineConnections.isActive,
    })
    .from(storeLineConnections)
    .where(eq(storeLineConnections.storeId, store.id))
    .limit(1)

  const customerCount = await countStoreCustomers(store.id)
  const lineActive = lineConnection?.isActive ?? false

  return {
    store: {
      name: store.name,
      slug: store.slug,
      businessType: store.businessType,
      businessTypeLabel: BUSINESS_TYPE_LABELS[store.businessType],
      staffBookingEnabled: store.staffBookingEnabled,
    },
    customerCount,
    lineActive,
  }
})
