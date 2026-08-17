export function nextPointsBalance(current: number, delta: number) {
  if (!Number.isInteger(current) || current < 0) {
    throw new Error('ยอดแต้มปัจจุบันไม่ถูกต้อง')
  }

  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('จำนวนแต้มต้องเป็นจำนวนเต็มที่ไม่เป็นศูนย์')
  }

  if (Math.abs(delta) > 100_000) {
    throw new Error('จำนวนแต้มต่อครั้งสูงเกินไป')
  }

  const next = current + delta
  if (next < 0) {
    throw new Error('ยอดแต้มต้องไม่ติดลบ')
  }

  return next
}

export function normalizePointsReason(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error('เหตุผลไม่ถูกต้อง')
  }

  const reason = value.trim()
  if (reason.length > 120) {
    throw new Error('เหตุผลต้องไม่เกิน 120 ตัวอักษร')
  }

  return reason || null
}
