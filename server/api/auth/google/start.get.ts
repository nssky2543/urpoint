import { eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { googleOauthStates } from '../../../database/schema'
import {
  buildGoogleAuthorizeUrl,
  createGooglePkcePair,
  getGoogleCallbackUrl,
  getGoogleCredentials,
  parseGoogleIntent,
  safeAuthRedirect,
} from '../../../utils/google'
import { createOauthNonce, createOauthState } from '../../../utils/line'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const intent = parseGoogleIntent(query.intent)
  const redirect = safeAuthRedirect(query.redirect)
  const { clientId } = getGoogleCredentials()
  const state = createOauthState()
  const nonce = createOauthNonce()
  const { codeVerifier, codeChallenge } = createGooglePkcePair()
  const redirectUri = getGoogleCallbackUrl()

  await useDb().insert(googleOauthStates).values({
    state,
    codeVerifier,
    nonce,
    intent,
    redirect,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  })

  return sendRedirect(event, buildGoogleAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    nonce,
    codeChallenge,
  }))
})
