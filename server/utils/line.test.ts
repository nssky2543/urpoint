import { createHmac } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  verifyLineSignature,
} from './line-crypto'
import {
  buildLineUrls,
  buildLineRichMenuObject,
  computeConnectionCompleteness,
  configureMessagingChannel,
  createPkcePair,
  createRichMenu,
  getLiffApp,
  issueLineChannelAccessToken,
  normalizeChannelId,
  normalizeLiffId,
  normalizeOptionalSecret,
  channelIdFromLiffId,
  peekLineIdTokenClaims,
  resolvePublicBaseUrl,
  setDefaultRichMenu,
  uploadRichMenuImage,
  upsertLiffApp,
  validateRichMenu,
  verifyLineChannelAccessToken,
} from './line'
import {
  canAccessLineStep,
  canAdvanceLineStep,
  getHighestAccessibleLineStep,
} from '../../shared/utils/line-steps'

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('line credential crypto', () => {
  test('round-trips secrets and rejects tampering', () => {
    const payload = encryptSecret('super-secret-token', TEST_KEY)

    expect(payload).not.toContain('super-secret-token')
    expect(decryptSecret(payload, TEST_KEY)).toBe('super-secret-token')

    const [iv, tag, data] = payload.split('.')
    expect(() => decryptSecret(`${iv}.${tag}.${data?.slice(0, -2)}aa`, TEST_KEY)).toThrow()
  })

  test('masks secrets without returning the full value', () => {
    const masked = maskSecret('abcdefghijklmnop')

    expect(masked.endsWith('mnop')).toBe(true)
    expect(masked).not.toContain('abcdefgh')
    expect(maskSecret(null)).toBe('')
  })
})

describe('line webhook signature', () => {
  test('accepts a valid signature and rejects an invalid one', () => {
    const secret = 'channel-secret'
    const body = '{"destination":"U123","events":[]}'
    const signature = createHmac('sha256', secret).update(body).digest('base64')

    expect(verifyLineSignature(secret, body, signature)).toBe(true)
    expect(verifyLineSignature(secret, body, 'bad-signature')).toBe(false)
  })
})

describe('line helpers', () => {
  test('verifies LINE Login credentials by issuing a real channel token', async () => {
    let request: { url: string, init?: RequestInit } | undefined
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      request = { url: String(url), init }
      return Response.json({
        access_token: 'line-login-token',
        expires_in: 2592000,
        token_type: 'Bearer',
      })
    }) as typeof fetch

    const token = await issueLineChannelAccessToken({
      channelId: '2010909637',
      channelSecret: 'login-secret',
    }, fetchFn)

    expect(token.accessToken).toBe('line-login-token')
    expect(request?.url).toBe('https://api.line.me/v2/oauth/accessToken')
    expect(String(request?.init?.body)).toContain('grant_type=client_credentials')
    expect(String(request?.init?.body)).toContain('client_id=2010909637')
  })

  test('creates a LIFF app through LINE when no LIFF ID exists', async () => {
    let request: { url: string, init?: RequestInit } | undefined
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      request = { url: String(url), init }
      return Response.json({ liffId: '2001234567-AbCdEfGh' })
    }) as typeof fetch

    const result = await upsertLiffApp({
      accessToken: 'login-token',
      liffId: '',
      endpointUrl: 'https://example.com/m/demo',
      description: 'UrPoint - Demo',
    }, fetchFn)

    expect(result.liffId).toBe('2001234567-AbCdEfGh')
    expect(request?.url).toBe('https://api.line.me/liff/v1/apps')
    expect(request?.init?.method).toBe('POST')
    expect(String(request?.init?.body)).toContain('https://example.com/m/demo')
  })

  test('updates an existing LIFF app when LINE returns an empty body', async () => {
    let request: { url: string, init?: RequestInit } | undefined
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      request = { url: String(url), init }
      return new Response(null, { status: 200 })
    }) as typeof fetch

    const result = await upsertLiffApp({
      accessToken: 'login-token',
      liffId: '2010909637-Ngw5nvws',
      endpointUrl: 'https://testlineapp.kpnsystems.com/m/n-phink2',
      description: 'UrPoint test barber',
    }, fetchFn)

    expect(result.liffId).toBe('2010909637-Ngw5nvws')
    expect(request?.url).toBe('https://api.line.me/liff/v1/apps/2010909637-Ngw5nvws')
    expect(request?.init?.method).toBe('PUT')
  })

  test('extracts LIFF ID from a LIFF URL', () => {
    expect(normalizeLiffId('https://liff.line.me/2010909637-Ngw5nvws')).toBe('2010909637-Ngw5nvws')
    expect(normalizeLiffId('  2010909637-Ngw5nvws  ')).toBe('2010909637-Ngw5nvws')
  })

  test('verifies an existing LIFF app without changing its endpoint', async () => {
    let requestUrl = ''
    const fetchFn = (async (url: string | URL | Request) => {
      requestUrl = String(url)
      return Response.json({
        apps: [{
          liffId: '2010909637-D4Fy34Rp',
          view: {
            type: 'full',
            url: 'https://my.pointupcrm.com/m/tenant-4d3d',
          },
        }],
      })
    }) as typeof fetch

    const app = await getLiffApp(
      'login-token',
      '2010909637-D4Fy34Rp',
      fetchFn,
    )

    expect(requestUrl).toBe('https://api.line.me/liff/v1/apps')
    expect(app?.view.url).toBe('https://my.pointupcrm.com/m/tenant-4d3d')
  })

  test('confirms that an access token belongs to the Messaging channel', async () => {
    let request: { url: string, init?: RequestInit } | undefined
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      request = { url: String(url), init }
      return Response.json({
        client_id: '2000000001',
        expires_in: 2592000,
        scope: '',
      })
    }) as typeof fetch

    const result = await verifyLineChannelAccessToken(
      'messaging-token',
      '2000000001',
      fetchFn,
    )

    expect(result.clientId).toBe('2000000001')
    expect(request?.url).toBe('https://api.line.me/v2/oauth/verify')
    expect(request?.init?.method).toBe('POST')
    expect(String(request?.init?.body)).toBe('access_token=messaging-token')
  })

  test('configures and tests the webhook through Messaging API', async () => {
    const requests: Array<{ url: string, init?: RequestInit }> = []
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init })
      if (String(url).endsWith('/v2/bot/info')) {
        return Response.json({
          userId: 'Ubot',
          basicId: '@demo',
          displayName: 'Demo OA',
          chatMode: 'chat',
          markAsReadMode: 'manual',
        })
      }
      if (init?.method === 'POST') {
        return Response.json({ success: true, statusCode: 200 })
      }
      if (init?.method === 'GET') {
        return Response.json({
          endpoint: 'https://example.com/api/line/key/webhook',
          active: true,
        })
      }
      return Response.json({})
    }) as typeof fetch

    const result = await configureMessagingChannel({
      accessToken: 'messaging-token',
      webhookUrl: 'https://example.com/api/line/key/webhook',
    }, fetchFn)

    expect(result.bot.displayName).toBe('Demo OA')
    expect(result.webhook.active).toBe(true)
    expect(requests.map(item => `${item.init?.method ?? 'GET'} ${item.url}`)).toEqual([
      'GET https://api.line.me/v2/bot/info',
      'PUT https://api.line.me/v2/bot/channel/webhook/endpoint',
      'POST https://api.line.me/v2/bot/channel/webhook/test',
      'GET https://api.line.me/v2/bot/channel/webhook/endpoint',
    ])
  })

  test('locks every step until the immediately previous step succeeds', () => {
    const onlyStep1 = {
      step1: true,
      step2: false,
      step3: false,
      step4: false,
      complete: false,
    }

    expect(canAccessLineStep(2, onlyStep1)).toBe(true)
    expect(canAccessLineStep(3, onlyStep1)).toBe(false)
    expect(canAccessLineStep(4, onlyStep1)).toBe(false)
    expect(getHighestAccessibleLineStep(onlyStep1)).toBe(2)
    expect(canAdvanceLineStep(1, onlyStep1)).toBe(true)
    expect(canAdvanceLineStep(2, onlyStep1)).toBe(false)
  })

  test('unlocks step four only after step three succeeds', () => {
    const throughStep3 = {
      step1: true,
      step2: true,
      step3: true,
      step4: false,
      complete: false,
    }

    expect(canAccessLineStep(4, throughStep3)).toBe(true)
    expect(getHighestAccessibleLineStep(throughStep3)).toBe(4)
    expect(canAdvanceLineStep(3, throughStep3)).toBe(true)
  })

  test('builds store-scoped URLs', () => {
    const urls = buildLineUrls({
      storeSlug: 'demo-shop',
      webhookKey: 'whkey123',
      liffId: '2001234567-AbCdEfGh',
    })

    expect(urls.endpointUrl).toContain('/m/demo-shop')
    expect(urls.webhookUrl).toContain('/api/line/whkey123/webhook')
    expect(urls.liffUrl).toBe('https://liff.line.me/2001234567-AbCdEfGh')
    expect(urls.callbackUrl).toContain('/api/line/callback')
  })

  test('prefers the public forwarded origin over localhost env', () => {
    const previous = process.env.NUXT_PUBLIC_APP_URL
    process.env.NUXT_PUBLIC_APP_URL = 'http://localhost:3000'

    try {
      expect(resolvePublicBaseUrl({
        host: 'localhost:3000',
        forwardedHost: 'testlineapp.kpnsystems.com',
        forwardedProto: 'https',
      })).toBe('https://testlineapp.kpnsystems.com')

      expect(resolvePublicBaseUrl({
        host: 'localhost:3000',
      })).toBe('http://localhost:3000')

      expect(buildLineUrls({
        storeSlug: 'demo-shop',
        webhookKey: 'whkey123',
        baseUrl: 'https://testlineapp.kpnsystems.com',
      }).callbackUrl).toBe('https://testlineapp.kpnsystems.com/api/line/callback')
    }
    finally {
      process.env.NUXT_PUBLIC_APP_URL = previous
    }
  })

  test('keeps a configured public origin even if forwarded host is spoofed', () => {
    const previous = process.env.NUXT_PUBLIC_APP_URL
    process.env.NUXT_PUBLIC_APP_URL = 'https://app.example.com'

    try {
      expect(resolvePublicBaseUrl({
        host: 'app.example.com',
        forwardedHost: 'evil.example',
        forwardedProto: 'https',
      })).toBe('https://app.example.com')
    }
    finally {
      process.env.NUXT_PUBLIC_APP_URL = previous
    }
  })

  test('normalizes channel inputs and optional secrets', () => {
    expect(normalizeChannelId('  2010909643  ')).toBe('2010909643')
    expect(normalizeLiffId('https://liff.line.me/2010909637-Ngw5nvws')).toBe('2010909637-Ngw5nvws')
    expect(normalizeOptionalSecret('   ')).toBeNull()
    expect(normalizeOptionalSecret('keep-me')).toBe('keep-me')
    expect(channelIdFromLiffId('2010909637-Ngw5nvws')).toBe('2010909637')
    expect(channelIdFromLiffId('https://liff.line.me/2010909637-Ngw5nvws')).toBe('2010909637')
    expect(channelIdFromLiffId('bad')).toBe('')

    const token = [
      Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
      Buffer.from(JSON.stringify({ aud: '2010909637', exp: 1, sub: 'U123' })).toString('base64url'),
      'sig',
    ].join('.')
    expect(peekLineIdTokenClaims(token)).toEqual({
      aud: '2010909637',
      exp: 1,
      sub: 'U123',
    })
  })

  test('creates PKCE verifier and challenge', () => {
    const pair = createPkcePair()
    expect(pair.codeVerifier.length).toBeGreaterThanOrEqual(43)
    expect(pair.codeChallenge).not.toBe(pair.codeVerifier)
  })

  test('computes connection completeness without exposing secrets', () => {
    const incomplete = computeConnectionCompleteness({
      loginChannelId: '1',
      hasLoginSecret: true,
      loginVerifiedAt: null,
      liffId: '',
      liffVerifiedAt: null,
      messagingChannelId: '2',
      hasMessagingSecret: true,
      hasAccessToken: true,
    })
    expect(incomplete.step1).toBe(false)
    expect(incomplete.step2).toBe(false)
    expect(incomplete.complete).toBe(false)

    const complete = computeConnectionCompleteness({
      loginChannelId: '1',
      hasLoginSecret: true,
      loginVerifiedAt: new Date(),
      liffId: 'liff',
      liffVerifiedAt: new Date(),
      messagingChannelId: '2',
      hasMessagingSecret: true,
      hasAccessToken: true,
      botVerifiedAt: new Date(),
      webhookVerifiedAt: new Date(),
    })
    expect(complete.complete).toBe(true)
  })

  test('builds and publishes a rich menu through Messaging API helpers', async () => {
    const richMenu = buildLineRichMenuObject({
      name: 'เมนูร้าน',
      chatBarText: 'เมนู',
      layout: 'two',
      slots: [
        { label: 'หน้าแรก', uri: 'https://example.com/m/demo', showLabel: true },
        { label: 'ติดต่อ', uri: 'tel:0812345678', showLabel: true },
      ],
    })

    expect(richMenu.areas).toHaveLength(2)
    expect(richMenu.size).toEqual({ width: 2500, height: 843 })

    const requests: Array<{ url: string, method?: string }> = []
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), method: init?.method })
      if (String(url).endsWith('/richmenu') && init?.method === 'POST') {
        return Response.json({ richMenuId: 'richmenu-1' })
      }
      return new Response(null, { status: 200 })
    }) as typeof fetch

    await validateRichMenu('token', richMenu, fetchFn)
    const created = await createRichMenu('token', richMenu, fetchFn)
    await uploadRichMenuImage('token', created.richMenuId, Buffer.from('png'), 'image/png', fetchFn)
    await setDefaultRichMenu('token', created.richMenuId, fetchFn)

    expect(created.richMenuId).toBe('richmenu-1')
    expect(requests.map(item => `${item.method} ${item.url}`)).toEqual([
      'POST https://api.line.me/v2/bot/richmenu/validate',
      'POST https://api.line.me/v2/bot/richmenu',
      'POST https://api-data.line.me/v2/bot/richmenu/richmenu-1/content',
      'POST https://api.line.me/v2/bot/user/all/richmenu/richmenu-1',
    ])
  })
})
