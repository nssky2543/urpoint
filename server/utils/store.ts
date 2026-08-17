import {
  defaultStaffBookingEnabled,
  isBusinessType,
  type BusinessType,
} from '#shared/utils/business-type'
import { normalizeStoreSlug } from '#shared/utils/store-slug'
import { and, eq, ne, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { randomBytes } from 'node:crypto'
import { useDb } from '../database/client'
import { storeCustomers, storeLineConnections, stores } from '../database/schema'
import { getSessionUser, type SessionUser } from './session'

export type SessionStore = {
  id: string
  name: string
  slug: string
  ownerUserId: string
  phone: string | null
  businessType: BusinessType
  staffBookingEnabled: boolean
  customerLoginLineEnabled: boolean
  customerLoginOtpEnabled: boolean
  onboardedAt: Date | null
}

export type SessionContext = {
  user: SessionUser
  store: SessionStore
}

type DbLike = {
  insert: ReturnType<typeof useDb>['insert']
}

const storeSelectFields = {
  id: stores.id,
  name: stores.name,
  slug: stores.slug,
  ownerUserId: stores.ownerUserId,
  phone: stores.phone,
  businessType: stores.businessType,
  staffBookingEnabled: stores.staffBookingEnabled,
  customerLoginLineEnabled: stores.customerLoginLineEnabled,
  customerLoginOtpEnabled: stores.customerLoginOtpEnabled,
  onboardedAt: stores.onboardedAt,
}

export function createStoreSlug(username: string) {
  try {
    return normalizeStoreSlug(username)
  }
  catch {
    return `store-${randomBytes(4).toString('hex')}`
  }
}

export function parseStoreSlugInput(value: unknown) {
  try {
    return normalizeStoreSlug(value)
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'ลิงก์ร้านไม่ถูกต้อง',
    })
  }
}

export async function isStoreSlugTaken(slug: string, excludeStoreId?: string) {
  const [row] = await useDb()
    .select({ id: stores.id })
    .from(stores)
    .where(excludeStoreId
      ? and(eq(stores.slug, slug), ne(stores.id, excludeStoreId))
      : eq(stores.slug, slug))
    .limit(1)

  return Boolean(row)
}

export function createWebhookKey() {
  return randomBytes(24).toString('base64url')
}

export function parseBusinessTypeInput(value: unknown): BusinessType {
  if (!isBusinessType(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรุณาเลือกประเภทธุรกิจ (barber หรือ spa)',
    })
  }

  return value
}

export async function createDefaultStore(
  userId: string,
  displayName: string,
  businessType: BusinessType = 'barber',
  db: DbLike = useDb(),
) {
  const slugBase = createStoreSlug(displayName)
  const slug = slugBase
  const name = 'ร้านของคุณ'

  try {
    const [store] = await db
      .insert(stores)
      .values({
        ownerUserId: userId,
        name,
        slug,
        businessType,
        staffBookingEnabled: defaultStaffBookingEnabled(businessType),
      })
      .returning(storeSelectFields)

    if (!store) {
      throw new Error('Store was not created')
    }

    await db.insert(storeLineConnections).values({
      storeId: store.id,
      webhookKey: createWebhookKey(),
    })

    return store
  } catch (error) {
    if ((error as { code?: string }).code !== '23505') {
      throw error
    }

    const [store] = await db
      .insert(stores)
      .values({
        ownerUserId: userId,
        name,
        slug: `${slugBase.slice(0, 39)}-${randomBytes(4).toString('hex')}`,
        businessType,
        staffBookingEnabled: defaultStaffBookingEnabled(businessType),
      })
      .returning(storeSelectFields)

    if (!store) {
      throw new Error('Store was not created')
    }

    await db.insert(storeLineConnections).values({
      storeId: store.id,
      webhookKey: createWebhookKey(),
    })

    return store
  }
}

export async function requireSessionStore(event: H3Event): Promise<SessionContext> {
  const user = await getSessionUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'กรุณาเข้าสู่ระบบ',
    })
  }

  const [store] = await useDb()
    .select(storeSelectFields)
    .from(stores)
    .where(eq(stores.ownerUserId, user.id))
    .limit(1)

  if (!store) {
    // ponytail: auto-heal accounts created before stores existed
    const created = await createDefaultStore(user.id, user.name)
    return { user, store: created }
  }

  return { user, store }
}

export function validateStoreName(nameInput: unknown) {
  if (typeof nameInput !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'กรุณากรอกชื่อร้าน',
    })
  }

  const name = nameInput.trim()

  if (name.length < 2 || name.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ชื่อร้านต้องมี 2–80 ตัวอักษร',
    })
  }

  return name
}

export function validateStorePhone(phoneInput: unknown) {
  if (phoneInput === null || phoneInput === undefined || phoneInput === '') {
    return null
  }

  if (typeof phoneInput !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'เบอร์โทรไม่ถูกต้อง',
    })
  }

  const phone = phoneInput.trim()

  if (phone.length > 32) {
    throw createError({
      statusCode: 400,
      statusMessage: 'เบอร์โทรต้องไม่เกิน 32 ตัวอักษร',
    })
  }

  return phone
}

export async function countStoreCustomers(storeId: string) {
  const [row] = await useDb()
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(storeCustomers)
    .where(eq(storeCustomers.storeId, storeId))

  return row?.total ?? 0
}
