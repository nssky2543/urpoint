const LINE_RETURN_KEYS = ['code', 'state', 'liffClientId', 'liffRedirectUri', 'liff.state'] as const

export function isLineReturnQuery(query: Record<string, unknown>) {
  const keys = Object.keys(query)
  if (keys.some(key => key.startsWith('liff.') || key === 'liffClientId' || key === 'liffRedirectUri')) {
    return true
  }
  return keys.includes('code') && keys.includes('state') && keys.includes('liffClientId')
}

export function stripLineReturnSearch(search: string) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  let changed = false

  for (const key of [...params.keys()]) {
    const drop = key.startsWith('liff') || LINE_RETURN_KEYS.includes(key as typeof LINE_RETURN_KEYS[number])
    if (drop) {
      params.delete(key)
      changed = true
    }
  }

  const next = params.toString()
  return {
    changed,
    search: next ? `?${next}` : '',
  }
}
