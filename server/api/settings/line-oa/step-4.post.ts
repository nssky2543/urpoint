import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import {
  buildLineUrls,
  fetchBotInfo,
  getMessagingWebhook,
  verifyLineChannelAccessToken,
} from '../../../utils/line'
import { decryptSecret } from '../../../utils/line-crypto'
import { getStoreLineConnection, toPublicLineSettings } from '../../../utils/line-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const row = await getStoreLineConnection(store.id)

  if (
    !row?.loginVerifiedAt
    || !row.liffVerifiedAt
    || !row.botVerifiedAt
    || !row.webhookVerifiedAt
    || !row.messagingChannelId
    || !row.accessTokenEnc
  ) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณายืนยันทุกขั้นตอนกับ LINE ก่อนเปิดใช้งาน' })
  }

  const accessToken = decryptSecret(row.accessTokenEnc)
  const expectedWebhookUrl = buildLineUrls({
    storeSlug: store.slug,
    webhookKey: row.webhookKey,
    liffId: row.liffId,
  }).webhookUrl

  await verifyLineChannelAccessToken(accessToken, row.messagingChannelId)
  const [bot, webhook] = await Promise.all([
    fetchBotInfo(accessToken),
    getMessagingWebhook(accessToken),
  ])

  if (webhook.endpoint !== expectedWebhookUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Webhook URL บน LINE ไม่ตรงกับร้านนี้ กรุณาทำขั้นตอน Messaging API อีกครั้ง',
    })
  }
  if (!webhook.active) {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรุณาเปิด Use webhook ใน LINE Developers Console แล้วลองอีกครั้ง',
    })
  }

  const now = new Date()
  const [updated] = await useDb()
    .update(storeLineConnections)
    .set({
      botUserId: bot.userId,
      botDisplayName: bot.displayName,
      botBasicId: bot.basicId,
      botVerifiedAt: now,
      webhookVerifiedAt: now,
      isActive: true,
      connectedAt: row.connectedAt ?? now,
      setupStep: 4,
      updatedAt: now,
    })
    .where(eq(storeLineConnections.storeId, store.id))
    .returning()

  return toPublicLineSettings(store, updated!)
})
