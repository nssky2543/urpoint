import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import {
  buildLineUrls,
  configureMessagingChannel,
  fetchBotInfo,
  getMessagingWebhook,
  normalizeChannelId,
  normalizeOptionalSecret,
  resolvePublicBaseUrlFromEvent,
  verifyLineChannelAccessToken,
} from '../../../utils/line'
import { decryptSecret, encryptSecret } from '../../../utils/line-crypto'
import { getStoreLineConnection, toPublicLineSettings } from '../../../utils/line-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody<Record<string, unknown>>(event)
  const row = await getStoreLineConnection(store.id)

  if (!row?.liffVerifiedAt) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณาสร้างหรืออัปเดต LIFF ในขั้นตอนที่สอง' })
  }

  const channelId = normalizeChannelId(body?.messagingChannelId)
  const submittedSecret = normalizeOptionalSecret(body?.messagingChannelSecret)
  const submittedToken = normalizeOptionalSecret(body?.accessToken)
  if (!/^\d{5,20}$/.test(channelId)) {
    throw createError({ statusCode: 400, statusMessage: 'Messaging Channel ID ไม่ถูกต้อง' })
  }

  const sameChannel = row.messagingChannelId === channelId
  const channelSecret = submittedSecret
    ?? (sameChannel && row.messagingChannelSecretEnc
      ? decryptSecret(row.messagingChannelSecretEnc)
      : null)
  const accessToken = submittedToken
    ?? (sameChannel && row.accessTokenEnc ? decryptSecret(row.accessTokenEnc) : null)

  if (!channelSecret || !accessToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรุณากรอก Messaging Channel Secret และ Access Token',
    })
  }

  await verifyLineChannelAccessToken(accessToken, channelId)

  const db = useDb()
  await db
    .update(storeLineConnections)
    .set({
      messagingChannelId: channelId,
      messagingChannelSecretEnc: encryptSecret(channelSecret),
      accessTokenEnc: encryptSecret(accessToken),
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(storeLineConnections.storeId, store.id))

  const webhookUrl = buildLineUrls({
    storeSlug: store.slug,
    webhookKey: row.webhookKey,
    liffId: row.liffId,
    baseUrl: resolvePublicBaseUrlFromEvent(event),
  }).webhookUrl

  let result: Awaited<ReturnType<typeof configureMessagingChannel>>
  try {
    if (webhookUrl.startsWith('https://')) {
      result = await configureMessagingChannel({ accessToken, webhookUrl })
    } else {
      // ponytail: local HTTP only verifies existing LINE settings; public HTTPS is required before activation
      const [bot, webhook] = await Promise.all([
        fetchBotInfo(accessToken),
        getMessagingWebhook(accessToken),
      ])
      if (!webhook.endpoint.startsWith('https://')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'LINE Channel นี้ยังไม่ได้ตั้งค่า Webhook URL แบบ HTTPS',
        })
      }
      result = { bot, webhook }
    }
  } catch (error) {
    await db
      .update(storeLineConnections)
      .set({
        messagingChannelId: row.messagingChannelId,
        messagingChannelSecretEnc: row.messagingChannelSecretEnc,
        accessTokenEnc: row.accessTokenEnc,
        botUserId: row.botUserId,
        botDisplayName: row.botDisplayName,
        botBasicId: row.botBasicId,
        botVerifiedAt: row.botVerifiedAt,
        webhookVerifiedAt: row.webhookVerifiedAt,
        setupStep: row.setupStep,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(storeLineConnections.storeId, store.id))
    throw error
  }

  const now = new Date()
  const [updated] = await db
    .update(storeLineConnections)
    .set({
      botUserId: result.bot.userId,
      botDisplayName: result.bot.displayName,
      botBasicId: result.bot.basicId,
      botVerifiedAt: now,
      webhookVerifiedAt: now,
      setupStep: 4,
      isActive: false,
      updatedAt: now,
    })
    .where(eq(storeLineConnections.storeId, store.id))
    .returning()

  return toPublicLineSettings(store, updated!, event)
})
