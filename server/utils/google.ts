import {
  createHash,
  randomBytes,
} from 'node:crypto'
import { getAppBaseUrl } from './line'

export const GOOGLE_PROVIDER = 'google'

export type GoogleOAuthIntent = 'login' | 'register'

export type GoogleProfile = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture: string | null
}

export function getGoogleCallbackUrl() {
  return `${getAppBaseUrl()}/api/auth/google/callback`
}

export function getGoogleCredentials() {
  let clientId = process.env.NUXT_GOOGLE_CLIENT_ID || ''
  let clientSecret = process.env.NUXT_GOOGLE_CLIENT_SECRET || ''

  try {
    const config = useRuntimeConfig()
    clientId = (config.googleClientId as string | undefined) || clientId
    clientSecret = (config.googleClientSecret as string | undefined) || clientSecret
  } catch {
    // unit tests / non-Nuxt callers
  }

  clientId = clientId.trim()
  clientSecret = clientSecret.trim()

  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'ยังไม่ได้ตั้งค่า Google Login (NUXT_GOOGLE_CLIENT_ID / NUXT_GOOGLE_CLIENT_SECRET)',
    })
  }

  return { clientId, clientSecret }
}

export function parseGoogleIntent(value: unknown): GoogleOAuthIntent {
  if (value === 'register') {
    return 'register'
  }
  return 'login'
}

export function safeAuthRedirect(value: unknown) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    ? value
    : '/dashboard'
}

export function usernameFromEmail(email: string) {
  const local = email.split('@')[0] || 'user'
  const base = local
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'user'
  return `${base}_${randomBytes(3).toString('hex')}`
}

export function displayNameFromGoogle(name: string | undefined, email: string) {
  const trimmed = name?.trim()
  if (trimmed) {
    return trimmed.slice(0, 120)
  }
  return (email.split('@')[0] || 'ร้านค้า').slice(0, 120)
}

export function createGooglePkcePair() {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export function buildGoogleAuthorizeUrl(input: {
  clientId: string
  redirectUri: string
  state: string
  nonce: string
  codeChallenge: string
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCode(
  input: {
    code: string
    redirectUri: string
    clientId: string
    clientSecret: string
    codeVerifier: string
  },
  fetchFn: typeof fetch = fetch,
) {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  })

  const response = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json() as {
    error?: string
    access_token?: string
    id_token?: string
  }

  if (!response.ok || !payload.access_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'แลกโค้ด Google ไม่สำเร็จ',
    })
  }

  return payload
}

export async function fetchGoogleProfile(
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<GoogleProfile> {
  const response = await fetchFn('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = await response.json() as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!response.ok || !payload.sub || !payload.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'อ่านข้อมูลบัญชี Google ไม่สำเร็จ',
    })
  }

  if (payload.email_verified === false) {
    throw createError({
      statusCode: 400,
      statusMessage: 'อีเมล Google ยังไม่ได้ยืนยัน',
    })
  }

  return {
    sub: payload.sub,
    email: payload.email.trim().toLocaleLowerCase(),
    emailVerified: true,
    name: displayNameFromGoogle(payload.name, payload.email),
    picture: payload.picture?.trim() || null,
  }
}

export function googleAuthErrorRedirect(intent: GoogleOAuthIntent, code: string) {
  const path = intent === 'register' ? '/register' : '/login'
  return `${path}?error=${encodeURIComponent(code)}`
}
