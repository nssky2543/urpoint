import { and, eq, gt } from 'drizzle-orm'
import { useDb } from '../../database/client'
import { lineOauthStates, storeLineConnections, stores } from '../../database/schema'
import { createCustomerSession } from '../../utils/customer-session'
import {
  buildLineUrls,
  exchangeLineLoginCode,
  verifyLineIdToken,
  resolvePublicBaseUrlFromEvent,
} from '../../utils/line'
import { decryptSecret } from '../../utils/line-crypto'
import { upsertStoreCustomerByLine } from '../../utils/store-customers'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  const error = typeof query.error === 'string' ? query.error : ''

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `LINE Login ถูกยกเลิก: ${error}`,
    })
  }

  if (!code || !state) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LINE Login callback ไม่ครบ',
    })
  }

  const db = useDb()
  const [oauth] = await db
    .select()
    .from(lineOauthStates)
    .where(and(
      eq(lineOauthStates.state, state),
      gt(lineOauthStates.expiresAt, new Date()),
    ))
    .limit(1)

  if (!oauth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'state ของ LINE Login ไม่ถูกต้องหรือหมดอายุ',
    })
  }

  await db.delete(lineOauthStates).where(eq(lineOauthStates.state, state))

  const [row] = await db
    .select({
      connection: storeLineConnections,
      store: stores,
    })
    .from(storeLineConnections)
    .innerJoin(stores, eq(storeLineConnections.storeId, stores.id))
    .where(eq(storeLineConnections.storeId, oauth.storeId))
    .limit(1)

  if (!row?.connection.loginChannelId || !row.connection.loginChannelSecretEnc) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ไม่พบ LINE Login Channel ของร้าน',
    })
  }

  const urls = buildLineUrls({
    storeSlug: row.store.slug,
    webhookKey: row.connection.webhookKey,
    liffId: row.connection.liffId,
    baseUrl: resolvePublicBaseUrlFromEvent(event),
  })
  const redirectUri = getCookie(event, 'urpoint_line_redirect') || urls.callbackUrl
  deleteCookie(event, 'urpoint_line_redirect', { path: '/' })

  const tokens = await exchangeLineLoginCode({
    code,
    redirectUri,
    channelId: row.connection.loginChannelId,
    channelSecret: decryptSecret(row.connection.loginChannelSecretEnc),
    codeVerifier: oauth.codeVerifier,
  })

  if (!tokens.id_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LINE ไม่ได้ส่ง ID token กลับมา',
    })
  }

  const identity = await verifyLineIdToken({
    idToken: tokens.id_token,
    channelId: row.connection.loginChannelId,
    nonce: oauth.nonce,
  })

  if (oauth.purpose === 'customer') {
    if (!row.store.customerLoginLineEnabled || !row.connection.isActive) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วย LINE',
      })
    }

    const { customer } = await upsertStoreCustomerByLine({
      storeId: row.store.id,
      lineUserId: identity.sub,
      displayName: identity.name ?? null,
      pictureUrl: identity.picture ?? null,
    })

    await createCustomerSession(event, customer.id)
    return sendRedirect(event, `/m/${row.store.slug}`)
  }

  return {
    ok: true,
    storeSlug: row.store.slug,
    lineUserId: identity.sub,
    displayName: identity.name ?? null,
  }
})
