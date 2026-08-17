import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../database/client'
import { pointLedger, storeCustomers } from '../../../database/schema'
import { nextPointsBalance, normalizePointsReason } from '../../../utils/points'
import { toPublicStoreCustomer } from '../../../utils/store-customers'
import { requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { user, store } = await requireSessionStore(event)
  const customerId = getRouterParam(event, 'id')?.trim()

  if (!customerId) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบลูกค้า' })
  }

  const body = await readBody(event)
  const delta = body?.delta

  if (!Number.isInteger(delta)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'จำนวนแต้มต้องเป็นจำนวนเต็มที่ไม่เป็นศูนย์',
    })
  }

  let reason: string | null
  try {
    reason = normalizePointsReason(body?.reason)
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'เหตุผลไม่ถูกต้อง',
    })
  }

  const db = useDb()

  const customer = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(storeCustomers)
      .where(and(
        eq(storeCustomers.id, customerId),
        eq(storeCustomers.storeId, store.id),
      ))
      .limit(1)

    if (!current) {
      throw createError({ statusCode: 404, statusMessage: 'ไม่พบลูกค้า' })
    }

    let nextBalance: number
    try {
      nextBalance = nextPointsBalance(current.pointsBalance, delta)
    }
    catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error instanceof Error ? error.message : 'ปรับแต้มไม่สำเร็จ',
      })
    }

    const now = new Date()

    await tx.insert(pointLedger).values({
      storeId: store.id,
      customerId: current.id,
      delta,
      reason,
      createdByUserId: user.id,
    })

    const [updated] = await tx
      .update(storeCustomers)
      .set({
        pointsBalance: nextBalance,
        updatedAt: now,
      })
      .where(eq(storeCustomers.id, current.id))
      .returning()

    return updated!
  })

  return {
    customer: toPublicStoreCustomer(customer),
  }
})
