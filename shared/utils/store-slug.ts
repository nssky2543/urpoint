const SLUG_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}_-]{0,46}[\p{L}\p{N}])?$/u

export function normalizeStoreSlug(input: unknown) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('กรอกชื่อลิงก์ร้าน')
  }

  const slug = input
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/_+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 48)

  if (slug.length < 3 || slug.length > 48) {
    throw new Error('ลิงก์ร้านต้องมี 3–48 ตัวอักษร')
  }

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('ใช้ได้เฉพาะตัวอักษร ตัวเลข และขีดกลาง')
  }

  return slug
}
