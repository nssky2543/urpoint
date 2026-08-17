import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { lineWebhookEvents, storeLineConnections } from '../../../database/schema'
import { decryptSecret, verifyLineSignature } from '../../../utils/line-crypto'

type LineWebhookBody = {
  destination?: string
  events?: Array<{
    webhookEventId?: string
    type?: string
    timestamp?: number
    source?: { userId?: string; type?: string }
  }>
}

export default defineEventHandler(async (event) => {
  const webhookKey = getRouterParam(event, 'webhookKey')

  if (!webhookKey) {
    throw createError({ statusCode: 404, statusMessage: 'Webhook not found' })
  }

  const [row] = await useDb()
    .select()
    .from(storeLineConnections)
    .where(eq(storeLineConnections.webhookKey, webhookKey))
    .limit(1)

  if (!row?.messagingChannelSecretEnc) {
    throw createError({ statusCode: 404, statusMessage: 'Webhook not found' })
  }

  const rawBody = await readRawBody(event, 'utf8')

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty webhook body' })
  }

  const signature = getHeader(event, 'x-line-signature')

  if (!signature) {
    throw createError({ statusCode: 401, statusMessage: 'Missing signature' })
  }

  let channelSecret: string
  try {
    channelSecret = decryptSecret(row.messagingChannelSecretEnc)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Webhook credential error' })
  }

  if (!verifyLineSignature(channelSecret, rawBody, signature)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  let payload: LineWebhookBody
  try {
    payload = JSON.parse(rawBody) as LineWebhookBody
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }

  if (row.botUserId && payload.destination && payload.destination !== row.botUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Destination mismatch' })
  }

  const events = Array.isArray(payload.events) ? payload.events : []

  if (!row.webhookVerifiedAt) {
    await useDb()
      .update(storeLineConnections)
      .set({
        webhookVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeLineConnections.storeId, row.storeId))
  }

  for (const item of events) {
    const eventId = item.webhookEventId
    if (!eventId) {
      continue
    }

    try {
      await useDb().insert(lineWebhookEvents).values({
        storeId: row.storeId,
        webhookEventId: eventId,
      })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        continue
      }
      throw error
    }
  }

  setResponseStatus(event, 200)
  return { ok: true }
})
