import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import {
  issueLineChannelAccessToken,
  normalizeChannelId,
  normalizeOptionalSecret,
} from '../../../utils/line'
import { decryptSecret, encryptSecret } from '../../../utils/line-crypto'
import { getStoreLineConnection, toPublicLineSettings } from '../../../utils/line-settings'
import { createWebhookKey, requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody<Record<string, unknown>>(event)
  const channelId = normalizeChannelId(body?.loginChannelId)
  const submittedSecret = normalizeOptionalSecret(body?.loginChannelSecret)

  if (!/^\d{5,20}$/.test(channelId)) {
    throw createError({ statusCode: 400, statusMessage: 'Login Channel ID ไม่ถูกต้อง' })
  }

  let current = await getStoreLineConnection(store.id)
  if (!current) {
    const [created] = await useDb()
      .insert(storeLineConnections)
      .values({ storeId: store.id, webhookKey: createWebhookKey() })
      .returning()
    current = created!
  }

  let channelSecret = submittedSecret
  if (!channelSecret && current.loginChannelId === channelId && current.loginChannelSecretEnc) {
    channelSecret = decryptSecret(current.loginChannelSecretEnc)
  }
  if (!channelSecret) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณากรอก Login Channel Secret' })
  }

  await issueLineChannelAccessToken({ channelId, channelSecret })

  const channelChanged = current.loginChannelId !== channelId
  const [updated] = await useDb()
    .update(storeLineConnections)
    .set({
      loginChannelId: channelId,
      loginChannelSecretEnc: encryptSecret(channelSecret),
      loginVerifiedAt: new Date(),
      liffId: channelChanged ? null : current.liffId,
      liffVerifiedAt: channelChanged ? null : current.liffVerifiedAt,
      setupStep: 2,
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(storeLineConnections.storeId, store.id))
    .returning()

  return toPublicLineSettings(store, updated!)
})
