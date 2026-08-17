import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../database/client'
import { customerSessions, storeCustomers, stores } from '../database/schema'
import { createSessionToken, hashSessionToken } from './auth'
import { toPublicStoreCustomer } from './store-customers'

const COOKIE_NAME = 'urpoint_customer_session'
const SESSION_SECONDS = 60 * 60 * 24 * 7

export type CustomerSession = {
  store: {
    id: string
    name: string
    slug: string
  }
  customer: ReturnType<typeof toPublicStoreCustomer>
}

export async function createCustomerSession(event: H3Event, storeCustomerId: string) {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000)

  await useDb().insert(customerSessions).values({
    tokenHash: hashSessionToken(token),
    storeCustomerId,
    expiresAt,
  })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function getCustomerSession(
  event: H3Event,
  storeSlug?: string,
): Promise<CustomerSession | null> {
  const token = getCookie(event, COOKIE_NAME)

  if (!token) {
    return null
  }

  const [row] = await useDb()
    .select({
      customer: storeCustomers,
      storeId: stores.id,
      storeName: stores.name,
      storeSlug: stores.slug,
    })
    .from(customerSessions)
    .innerJoin(storeCustomers, eq(customerSessions.storeCustomerId, storeCustomers.id))
    .innerJoin(stores, eq(storeCustomers.storeId, stores.id))
    .where(and(
      eq(customerSessions.tokenHash, hashSessionToken(token)),
      gt(customerSessions.expiresAt, new Date()),
    ))
    .limit(1)

  if (!row) {
    return null
  }

  if (storeSlug && row.storeSlug !== storeSlug) {
    return null
  }

  return {
    store: {
      id: row.storeId,
      name: row.storeName,
      slug: row.storeSlug,
    },
    customer: toPublicStoreCustomer(row.customer),
  }
}

export async function deleteCustomerSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)

  if (token) {
    await useDb()
      .delete(customerSessions)
      .where(eq(customerSessions.tokenHash, hashSessionToken(token)))
  }

  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
