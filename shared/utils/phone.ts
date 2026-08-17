const THAI_MOBILE = /^66[689]\d{8}$/

export function isThaiMobile(value: unknown): value is string {
  return typeof value === 'string' && THAI_MOBILE.test(value)
}

export function normalizeThaiMobile(input: unknown) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('กรอกเบอร์โทรศัพท์')
  }

  const digits = input.replace(/[^\d]/g, '')
  let normalized = digits

  if (digits.startsWith('66') && digits.length === 11) {
    normalized = digits
  }
  else if (digits.startsWith('0') && digits.length === 10) {
    normalized = `66${digits.slice(1)}`
  }
  else if (digits.length === 9 && /^[689]/.test(digits)) {
    normalized = `66${digits}`
  }
  else {
    throw new Error('เบอร์มือถือไทยไม่ถูกต้อง')
  }

  if (!isThaiMobile(normalized)) {
    throw new Error('เบอร์มือถือไทยไม่ถูกต้อง')
  }

  return normalized
}

export function maskThaiMobile(phone: string) {
  const local = phone.startsWith('66') ? `0${phone.slice(2)}` : phone
  if (local.length < 8) {
    return local
  }

  return `${local.slice(0, 3)}-xxx-${local.slice(-4)}`
}
