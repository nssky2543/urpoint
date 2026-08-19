import {
  createHash,
  randomBytes,
} from 'node:crypto'
import { getRequestHeader } from 'h3'
import type { H3Event } from 'h3'

export type LineBotInfo = {
  userId: string
  basicId: string
  displayName: string
  premiumId?: string
  pictureUrl?: string
  chatMode: string
  markAsReadMode: string
}

export function getAppBaseUrl() {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/+$/, '')
  }

  try {
    const configured = useRuntimeConfig().public.appUrl
    if (typeof configured === 'string' && configured.trim()) {
      return configured.replace(/\/+$/, '')
    }
  } catch {
    // unit tests / non-Nuxt callers
  }

  return 'http://localhost:3000'
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function resolvePublicBaseUrl(input: {
  host?: string | null
  forwardedHost?: string | null
  forwardedProto?: string | null
}) {
  const configured = getAppBaseUrl()
  const host = (input.forwardedHost || input.host || '').split(',')[0].trim().replace(/\/+$/, '')

  if (!host) {
    return configured
  }

  let configuredHostname = ''
  try {
    configuredHostname = new URL(configured).hostname
  }
  catch {
    configuredHostname = ''
  }

  const hostname = host.split(':')[0] || host
  const forwardedProto = (input.forwardedProto || '').split(',')[0].trim().toLowerCase()
  const proto = forwardedProto === 'http' || forwardedProto === 'https'
    ? forwardedProto
    : isLocalHostname(hostname)
      ? 'http'
      : 'https'

  const origin = `${proto}://${host}`

  // Only trust a public forwarded origin when env still points at localhost.
  if (isLocalHostname(configuredHostname) && !isLocalHostname(hostname)) {
    return origin
  }

  return configured
}

export function resolvePublicBaseUrlFromEvent(event: H3Event) {
  return resolvePublicBaseUrl({
    host: getRequestHeader(event, 'host'),
    forwardedHost: getRequestHeader(event, 'x-forwarded-host'),
    forwardedProto: getRequestHeader(event, 'x-forwarded-proto'),
  })
}

export function buildLineUrls(input: {
  storeSlug: string
  webhookKey: string
  liffId?: string | null
  baseUrl?: string | null
}) {
  const base = (input.baseUrl || getAppBaseUrl()).replace(/\/+$/, '')
  const liffId = input.liffId?.trim() || ''

  return {
    callbackUrl: `${base}/api/line/callback`,
    endpointUrl: `${base}/m/${input.storeSlug}`,
    webhookUrl: `${base}/api/line/${input.webhookKey}/webhook`,
    liffUrl: liffId ? `https://liff.line.me/${liffId}` : '',
    loginStartUrl: `${base}/api/line/login/start`,
  }
}

export function normalizeChannelId(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

export function normalizeLiffId(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  const fromUrl = trimmed.match(/liff\.line\.me\/([0-9A-Za-z-]+)/i)
  if (fromUrl?.[1]) {
    return fromUrl[1]
  }

  return trimmed
}

export function normalizeOptionalSecret(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function createOauthState() {
  return randomBytes(24).toString('base64url')
}

export function createOauthNonce() {
  return randomBytes(16).toString('base64url')
}

export function createPkcePair() {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export function buildAuthorizeUrl(input: {
  channelId: string
  redirectUri: string
  state: string
  nonce: string
  codeChallenge: string
}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.channelId,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: 'openid profile',
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
}

export async function issueLineChannelAccessToken(
  input: { channelId: string, channelSecret: string },
  fetchFn: typeof fetch = fetch,
) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: input.channelId,
    client_secret: input.channelSecret,
  })
  const response = await fetchFn('https://api.line.me/v2/oauth/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LINE ปฏิเสธ Channel ID หรือ Channel Secret',
    })
  }

  const result = await response.json() as {
    access_token: string
    expires_in: number
    token_type: string
  }
  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
    tokenType: result.token_type,
  }
}

export async function upsertLiffApp(
  input: {
    accessToken: string
    liffId?: string | null
    endpointUrl: string
    description: string
  },
  fetchFn: typeof fetch = fetch,
) {
  if (!input.endpointUrl.startsWith('https://')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LIFF Endpoint URL ต้องเป็น HTTPS',
    })
  }

  const liffId = input.liffId?.trim()
  const response = await fetchFn(
    liffId
      ? `https://api.line.me/liff/v1/apps/${encodeURIComponent(liffId)}`
      : 'https://api.line.me/liff/v1/apps',
    {
      method: liffId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        view: {
          type: 'full',
          url: input.endpointUrl,
        },
        description: input.description.slice(0, 20),
        scope: ['openid', 'profile'],
        botPrompt: 'none',
      }),
    },
  )

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: await lineErrorMessage(response, 'สร้างหรืออัปเดต LIFF กับ LINE ไม่สำเร็จ'),
    })
  }

  const result = await readResponseJson<{ liffId?: string }>(response)
  return { liffId: result?.liffId || liffId || '' }
}

async function readResponseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text) as T
  }
  catch {
    return null
  }
}

async function lineErrorMessage(response: Response, fallback: string) {
  const result = await readResponseJson<{ message?: string }>(response)
  const message = result?.message?.trim()
  return message || fallback
}

export async function getLiffApp(
  accessToken: string,
  liffId: string,
  fetchFn: typeof fetch = fetch,
) {
  const response = await fetchFn('https://api.line.me/liff/v1/apps', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'อ่านข้อมูล LIFF จาก LINE ไม่สำเร็จ',
    })
  }

  const result = await response.json() as {
    apps?: Array<{
      liffId: string
      view: { type: string, url: string }
      description?: string
    }>
  }
  return result.apps?.find(app => app.liffId === liffId)
}

export async function fetchBotInfo(
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<LineBotInfo> {
  const response = await fetchFn('https://api.line.me/v2/bot/info', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ตรวจสอบ Access Token ไม่สำเร็จ',
    })
  }

  return await response.json() as LineBotInfo
}

export async function verifyLineChannelAccessToken(
  accessToken: string,
  expectedChannelId: string,
  fetchFn: typeof fetch = fetch,
) {
  const response = await fetchFn('https://api.line.me/v2/oauth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ access_token: accessToken }),
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LINE ปฏิเสธ Channel Access Token',
    })
  }

  const result = await response.json() as {
    client_id: string
    expires_in: number
    scope: string
  }
  if (result.client_id !== expectedChannelId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Access Token ไม่ตรงกับ Messaging Channel ID',
    })
  }

  return {
    clientId: result.client_id,
    expiresIn: result.expires_in,
    scope: result.scope,
  }
}

export async function getMessagingWebhook(
  accessToken: string,
  fetchFn: typeof fetch = fetch,
) {
  const response = await fetchFn(
    'https://api.line.me/v2/bot/channel/webhook/endpoint',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'อ่านสถานะ Webhook จาก LINE ไม่สำเร็จ',
    })
  }

  return await response.json() as { endpoint: string, active: boolean }
}

export async function configureMessagingChannel(
  input: { accessToken: string, webhookUrl: string },
  fetchFn: typeof fetch = fetch,
) {
  if (!input.webhookUrl.startsWith('https://')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Webhook URL ต้องเป็น HTTPS',
    })
  }

  const bot = await fetchBotInfo(input.accessToken, fetchFn)
  const headers = {
    Authorization: `Bearer ${input.accessToken}`,
    'Content-Type': 'application/json',
  }
  const setResponse = await fetchFn(
    'https://api.line.me/v2/bot/channel/webhook/endpoint',
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ endpoint: input.webhookUrl }),
    },
  )

  if (!setResponse.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ตั้งค่า Webhook URL กับ LINE ไม่สำเร็จ',
    })
  }

  const testResponse = await fetchFn(
    'https://api.line.me/v2/bot/channel/webhook/test',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint: input.webhookUrl }),
    },
  )

  if (!testResponse.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LINE ติดต่อ Webhook URL ไม่สำเร็จ',
    })
  }

  const testText = await testResponse.text()
  const testResult = testText
    ? JSON.parse(testText) as { success?: boolean, reason?: string, detail?: string }
    : { success: true }

  if (testResult.success === false) {
    throw createError({
      statusCode: 400,
      statusMessage: testResult.detail || testResult.reason || 'LINE ทดสอบ Webhook ไม่ผ่าน',
    })
  }

  const webhook = await getMessagingWebhook(input.accessToken, fetchFn)
  return { bot, webhook }
}

export async function exchangeLineLoginCode(input: {
  code: string
  redirectUri: string
  channelId: string
  channelSecret: string
  codeVerifier: string
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.channelId,
    client_secret: input.channelSecret,
    code_verifier: input.codeVerifier,
  })

  const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'แลก authorization code จาก LINE ไม่สำเร็จ',
    })
  }

  return await response.json() as {
    access_token: string
    id_token?: string
    expires_in: number
    token_type: string
  }
}

export async function verifyLineIdToken(input: {
  idToken: string
  channelId: string
  nonce?: string
}) {
  const body = new URLSearchParams({
    id_token: input.idToken,
    client_id: input.channelId,
  })

  if (input.nonce) {
    body.set('nonce', input.nonce)
  }

  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ยืนยัน LINE ID token ไม่สำเร็จ',
    })
  }

  return await response.json() as {
    sub: string
    name?: string
    picture?: string
    aud: string
    exp: number
    nonce?: string
  }
}

export function computeConnectionCompleteness(input: {
  loginChannelId?: string | null
  hasLoginSecret: boolean
  loginVerifiedAt?: Date | null
  liffId?: string | null
  liffVerifiedAt?: Date | null
  messagingChannelId?: string | null
  hasMessagingSecret: boolean
  hasAccessToken: boolean
  botVerifiedAt?: Date | null
  webhookVerifiedAt?: Date | null
}) {
  const step1 = Boolean(
    input.loginChannelId
    && input.hasLoginSecret
    && input.loginVerifiedAt,
  )
  const step2 = Boolean(step1 && input.liffId && input.liffVerifiedAt)
  const step3 = Boolean(
    input.messagingChannelId
    && input.hasMessagingSecret
    && input.hasAccessToken
    && input.botVerifiedAt
    && input.webhookVerifiedAt,
  )
  const step4 = Boolean(step1 && step2 && step3)

  return { step1, step2, step3, step4, complete: step4 }
}
