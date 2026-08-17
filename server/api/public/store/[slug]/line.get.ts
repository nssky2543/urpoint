import { eq } from 'drizzle-orm'
import { useDb } from '../../../../database/client'
import { storeLineConnections, stores } from '../../../../database/schema'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  const [row] = await useDb()
    .select({
      name: stores.name,
      slug: stores.slug,
      liffId: storeLineConnections.liffId,
      isActive: storeLineConnections.isActive,
    })
    .from(stores)
    .innerJoin(storeLineConnections, eq(storeLineConnections.storeId, stores.id))
    .where(eq(stores.slug, slug))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  return {
    store: {
      name: row.name,
      slug: row.slug,
    },
    liffId: row.liffId ?? '',
    isActive: row.isActive,
  }
})
