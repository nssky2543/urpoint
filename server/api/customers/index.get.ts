import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../database/client'
import { storeCustomers, storeLineConnections } from '../../database/schema'
import { getAppBaseUrl } from '../../utils/line'
import { toPublicStoreCustomer } from '../../utils/store-customers'
import { countStoreCustomers, requireSessionStore } from '../../utils/store'

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

  const customers = await useDb()
    .select()
    .from(storeCustomers)
    .where(eq(storeCustomers.storeId, store.id))
    .orderBy(desc(storeCustomers.lastSeenAt))

  const total = await countStoreCustomers(store.id)
  const appUrl = getAppBaseUrl()
  const lineActive = lineConnection?.isActive ?? false

  return {
    customers: customers.map(toPublicStoreCustomer),
    total,
    lineActive,
    memberUrl: `${appUrl}/m/${store.slug}`,
    liffUrl: lineActive && lineConnection?.liffId
      ? `https://liff.line.me/${lineConnection.liffId}`
      : null,
  }
})
