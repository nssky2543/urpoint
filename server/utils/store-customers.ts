import { and, eq } from 'drizzle-orm'
import { maskThaiMobile } from '#shared/utils/phone'
import { useDb } from '../database/client'
import { storeCustomers } from '../database/schema'

export type UpsertStoreCustomerByLineInput = {
  storeId: string
  lineUserId: string
  displayName: string | null
  pictureUrl: string | null
}

export async function upsertStoreCustomerByLine(input: UpsertStoreCustomerByLineInput) {
  const now = new Date()
  const db = useDb()

  const [existing] = await db
    .select({ id: storeCustomers.id })
    .from(storeCustomers)
    .where(and(
      eq(storeCustomers.storeId, input.storeId),
      eq(storeCustomers.lineUserId, input.lineUserId),
    ))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(storeCustomers)
      .set({
        displayName: input.displayName,
        pictureUrl: input.pictureUrl,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(storeCustomers.id, existing.id))
      .returning()

    return { customer: updated!, isNew: false }
  }

  const [created] = await db
    .insert(storeCustomers)
    .values({
      storeId: input.storeId,
      lineUserId: input.lineUserId,
      displayName: input.displayName,
      pictureUrl: input.pictureUrl,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning()

  return { customer: created!, isNew: true }
}

export async function upsertStoreCustomerByPhone(input: {
  storeId: string
  phone: string
}) {
  const now = new Date()
  const db = useDb()

  const [existing] = await db
    .select({ id: storeCustomers.id })
    .from(storeCustomers)
    .where(and(
      eq(storeCustomers.storeId, input.storeId),
      eq(storeCustomers.phone, input.phone),
    ))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(storeCustomers)
      .set({
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(storeCustomers.id, existing.id))
      .returning()

    return { customer: updated!, isNew: false }
  }

  const [created] = await db
    .insert(storeCustomers)
    .values({
      storeId: input.storeId,
      phone: input.phone,
      displayName: maskThaiMobile(input.phone),
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning()

  return { customer: created!, isNew: true }
}

/** @deprecated use upsertStoreCustomerByLine */
export const upsertStoreCustomer = upsertStoreCustomerByLine

export function toPublicStoreCustomer(customer: typeof storeCustomers.$inferSelect) {
  return {
    id: customer.id,
    displayName: customer.displayName,
    pictureUrl: customer.pictureUrl,
    phone: customer.phone,
    lineUserId: customer.lineUserId,
    pointsBalance: customer.pointsBalance,
    loginMethods: {
      line: Boolean(customer.lineUserId),
      phone: Boolean(customer.phone),
    },
    status: customer.status,
    firstSeenAt: customer.firstSeenAt.toISOString(),
    lastSeenAt: customer.lastSeenAt.toISOString(),
  }
}
