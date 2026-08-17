import { describe, expect, test } from 'bun:test'
import {
  buildGoogleAuthorizeUrl,
  displayNameFromGoogle,
  parseGoogleIntent,
  safeAuthRedirect,
  usernameFromEmail,
} from './google'

describe('google auth helpers', () => {
  test('builds a Google authorize URL with PKCE and openid scopes', () => {
    const url = new URL(buildGoogleAuthorizeUrl({
      clientId: 'google-client',
      redirectUri: 'http://localhost:3000/api/auth/google/callback',
      state: 'state-1',
      nonce: 'nonce-1',
      codeChallenge: 'challenge-1',
    }))

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('google-client')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('prompt')).toBe('select_account')
  })

  test('derives a unique-ish username from email', () => {
    const username = usernameFromEmail('Somchai.Store@example.com')
    expect(username.startsWith('somchai_store_')).toBe(true)
    expect(username.length).toBeLessThanOrEqual(32)
  })

  test('falls back to email local part when Google name is empty', () => {
    expect(displayNameFromGoogle('  ', 'nueng@example.com')).toBe('nueng')
    expect(displayNameFromGoogle('ณัฐวุฒิ', 'nueng@example.com')).toBe('ณัฐวุฒิ')
  })

  test('accepts only in-app redirects', () => {
    expect(safeAuthRedirect('/customers')).toBe('/customers')
    expect(safeAuthRedirect('https://evil.example')).toBe('/dashboard')
    expect(safeAuthRedirect('//evil.example')).toBe('/dashboard')
  })

  test('defaults unknown intent to login', () => {
    expect(parseGoogleIntent('register')).toBe('register')
    expect(parseGoogleIntent('login')).toBe('login')
    expect(parseGoogleIntent(undefined)).toBe('login')
  })
})
