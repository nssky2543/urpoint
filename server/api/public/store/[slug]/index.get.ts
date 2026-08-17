import { getPublicMemberStore } from '../../../../utils/customer-store'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim()

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  const row = await getPublicMemberStore(slug)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'ไม่พบร้าน' })
  }

  return {
    store: {
      name: row.store.name,
      slug: row.store.slug,
    },
    lineEnabled: row.lineEnabled,
    otpEnabled: row.otpEnabled,
    liffId: row.liffId,
    memberUrl: row.memberUrl,
    liffUrl: row.liffUrl,
  }
})
