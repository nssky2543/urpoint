import { describe, expect, test } from 'bun:test'
import { isLineReturnQuery, stripLineReturnSearch } from './liff-return'

describe('liff return query', () => {
  test('ignores a clean member page', () => {
    expect(isLineReturnQuery({})).toBe(false)
    expect(isLineReturnQuery({ foo: '1' })).toBe(false)
  })

  test('detects LINE LIFF redirect params', () => {
    expect(isLineReturnQuery({
      code: 'abc',
      state: 'xyz',
      liffClientId: '2010909637',
      liffRedirectUri: 'https://example.com/m/demo',
    })).toBe(true)
    expect(isLineReturnQuery({ 'liff.referrer': 'https://example.com/' })).toBe(true)
  })

  test('strips LINE params without touching other query values', () => {
    const result = stripLineReturnSearch('?code=a&state=b&liffClientId=1&utm=keep')
    expect(result.changed).toBe(true)
    expect(result.search).toBe('?utm=keep')
    expect(stripLineReturnSearch('').changed).toBe(false)
  })
})
