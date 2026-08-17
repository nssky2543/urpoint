import { describe, expect, test } from 'bun:test'
import {
  hashPassword,
  hashSessionToken,
  normalizeUsername,
  validateCredentials,
  verifyPassword,
} from './auth'

describe('password security', () => {
  test('verifies the right password and rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')

    expect(hash).not.toContain('correct horse battery staple')
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
    expect(await verifyPassword('wrong password', hash)).toBe(false)
  })
})

describe('session token hashing', () => {
  test('is deterministic without storing the original token', () => {
    const hash = hashSessionToken('secret-session-token')

    expect(hash).toBe(hashSessionToken('secret-session-token'))
    expect(hash).not.toContain('secret-session-token')
    expect(hash).not.toBe(hashSessionToken('another-token'))
  })
})

describe('credential validation', () => {
  test('normalizes usernames and accepts valid credentials', () => {
    expect(normalizeUsername('  Store_Owner  ')).toBe('store_owner')
    expect(validateCredentials('Store_Owner', 'password123')).toEqual({
      username: 'store_owner',
      password: 'password123',
    })
  })

  test('rejects short passwords', () => {
    expect(() => validateCredentials('store_owner', 'short')).toThrow(
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    )
  })
})
