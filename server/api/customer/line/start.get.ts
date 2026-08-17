import { useDb } from '../../../database/client'
import { lineOauthStates } from '../../../database/schema'
import { getPublicMemberStore } from '../../../utils/customer-store'
import {
  buildAuthorizeUrl,
  buildLineUrls,
  createOauthNonce,
  createOauthState,
  createPkcePair,
} from '../../../utils/line'
import { decryptSecret } from '../../../utils/line-crypto'

export default defineEventHandler(async (event) => {
  const slug = typeof getQuery(event).slug === 'string'
    ? String(getQuery(event).slug).trim()
    : ''

  const row = await getPublicMemberStore(slug)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  if (!row.lineEnabled || !row.connection?.loginChannelId || !row.connection.loginChannelSecretEnc) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วย LINE',
    })
  }

  try {
    decryptSecret(row.connection.loginChannelSecretEnc)
  }
  catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'ถอดรหัส Channel Secret ไม่สำเร็จ',
    })
  }

  const state = createOauthState()
  const nonce = createOauthNonce()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const urls = buildLineUrls({
    storeSlug: row.store.slug,
    webhookKey: row.connection.webhookKey,
    liffId: row.connection.liffId,
  })

  await useDb().insert(lineOauthStates).values({
    state,
    storeId: row.store.id,
    purpose: 'customer',
    codeVerifier,
    nonce,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  return sendRedirect(event, buildAuthorizeUrl({
    channelId: row.connection.loginChannelId,
    redirectUri: urls.callbackUrl,
    state,
    nonce,
    codeChallenge,
  }))
})
