import { useDb } from '../../../database/client'
import { lineOauthStates } from '../../../database/schema'
import {
  buildAuthorizeUrl,
  buildLineUrls,
  createOauthNonce,
  createOauthState,
  createPkcePair,
} from '../../../utils/line'
import { decryptSecret } from '../../../utils/line-crypto'
import { getStoreLineConnection } from '../../../utils/line-settings'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const row = await getStoreLineConnection(store.id)

  if (!row?.loginChannelId || !row.loginChannelSecretEnc) {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรอก LINE Login Channel ก่อนทดสอบเข้าสู่ระบบ',
    })
  }

  try {
    decryptSecret(row.loginChannelSecretEnc)
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'ถอดรหัส Channel Secret ไม่สำเร็จ',
    })
  }

  const state = createOauthState()
  const nonce = createOauthNonce()
  const { codeVerifier, codeChallenge } = createPkcePair()
  const urls = buildLineUrls({
    storeSlug: store.slug,
    webhookKey: row.webhookKey,
    liffId: row.liffId,
  })

  await useDb().insert(lineOauthStates).values({
    state,
    storeId: store.id,
    purpose: 'owner_test',
    codeVerifier,
    nonce,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  return sendRedirect(event, buildAuthorizeUrl({
    channelId: row.loginChannelId,
    redirectUri: urls.callbackUrl,
    state,
    nonce,
    codeChallenge,
  }))
})
