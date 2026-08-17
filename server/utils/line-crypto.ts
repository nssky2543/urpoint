import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function resolveCredentialKey(keyHex?: string) {
  const resolved = keyHex ?? useRuntimeConfig().lineCredentialKey

  if (typeof resolved !== 'string' || !/^[0-9a-fA-F]{64}$/.test(resolved)) {
    throw new Error('NUXT_LINE_CREDENTIAL_KEY must be a 64-char hex string')
  }

  return Buffer.from(resolved, 'hex')
}

export function encryptSecret(plaintext: string, keyHex?: string) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, resolveCredentialKey(keyHex), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload: string, keyHex?: string) {
  const [ivB64, tagB64, dataB64] = payload.split('.')

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret payload')
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    resolveCredentialKey(keyHex),
    Buffer.from(ivB64, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskSecret(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }

  return `${'*'.repeat(Math.min(28, value.length - 4))}${value.slice(-4)}`
}

export function verifyLineSignature(channelSecret: string, body: string, signature: string) {
  const expected = createHmac('sha256', channelSecret).update(body).digest('base64')

  try {
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    return actualBuffer.length === expectedBuffer.length
      && timingSafeEqual(actualBuffer, expectedBuffer)
  } catch {
    return false
  }
}
