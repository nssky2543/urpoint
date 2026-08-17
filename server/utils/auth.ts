import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto'

const KEY_LENGTH = 64

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) {
        reject(error)
        return
      }

      resolve(key)
    })
  })
}

export function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase()
}

export function validateCredentials(usernameInput: unknown, passwordInput: unknown) {
  if (typeof usernameInput !== 'string' || typeof passwordInput !== 'string') {
    throw new Error('กรอกชื่อผู้ใช้และรหัสผ่าน')
  }

  const username = normalizeUsername(usernameInput)

  if (!/^[\p{L}\p{N}_]{3,32}$/u.test(username)) {
    throw new Error('ชื่อผู้ใช้ต้องมี 3–32 ตัวอักษร และใช้ได้เฉพาะตัวอักษร ตัวเลข หรือ _')
  }

  if (passwordInput.length < 8) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  }

  if (passwordInput.length > 128) {
    throw new Error('รหัสผ่านต้องไม่เกิน 128 ตัวอักษร')
  }

  return { username, password: passwordInput }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, saltHex, hashHex] = storedHash.split(':')

  if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
    return false
  }

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
