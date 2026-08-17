import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { storeLineConnections } from '../../../database/schema'
import {
  buildLineUrls,
  getLiffApp,
  issueLineChannelAccessToken,
  normalizeLiffId,
  upsertLiffApp,
} from '../../../utils/line'
import { decryptSecret } from '../../../utils/line-crypto'
import { getStoreLineConnection, toPublicLineSettings } from '../../../utils/line-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const body = await readBody<Record<string, unknown>>(event)
  const row = await getStoreLineConnection(store.id)

  if (!row?.loginVerifiedAt || !row.loginChannelId || !row.loginChannelSecretEnc) {
    throw createError({ statusCode: 400, statusMessage: 'กรุณายืนยัน LINE Login ในขั้นตอนแรก' })
  }

  const liffId = body?.liffId === undefined
    ? row.liffId
    : normalizeLiffId(body.liffId)
  if (liffId && !/^[0-9A-Za-z-]{8,64}$/.test(liffId)) {
    throw createError({ statusCode: 400, statusMessage: 'LIFF ID ไม่ถูกต้อง' })
  }

  const loginSecret = decryptSecret(row.loginChannelSecretEnc)
  const token = await issueLineChannelAccessToken({
    channelId: row.loginChannelId,
    channelSecret: loginSecret,
  })
  const urls = buildLineUrls({
    storeSlug: store.slug,
    webhookKey: row.webhookKey,
    liffId,
  })
  let verifiedLiffId = liffId
  if (liffId) {
    const existing = await getLiffApp(token.accessToken, liffId)
    if (!existing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ไม่พบ LIFF ID นี้ใน LINE Login Channel',
      })
    }
  }

  if (!liffId || urls.endpointUrl.startsWith('https://')) {
    const liff = await upsertLiffApp({
      accessToken: token.accessToken,
      liffId,
      endpointUrl: urls.endpointUrl,
      description: `UrPoint ${store.name}`,
    })
    verifiedLiffId = liff.liffId
  }

  const now = new Date()
  const [updated] = await useDb()
    .update(storeLineConnections)
    .set({
      liffId: verifiedLiffId,
      loginVerifiedAt: now,
      liffVerifiedAt: now,
      setupStep: 3,
      isActive: false,
      updatedAt: now,
    })
    .where(eq(storeLineConnections.storeId, store.id))
    .returning()

  return toPublicLineSettings(store, updated!)
})
