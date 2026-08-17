import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import { getStoreLineConnection, toPublicLineSettings } from '../../../utils/line-settings'
import { createWebhookKey, requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  let row = await getStoreLineConnection(store.id)

  if (!row) {
    const [created] = await useDb()
      .insert(storeLineConnections)
      .values({
        storeId: store.id,
        webhookKey: createWebhookKey(),
      })
      .returning()

    row = created!
  }

  return toPublicLineSettings(store, row)
})
