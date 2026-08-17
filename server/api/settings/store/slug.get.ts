import { parseStoreSlugInput, isStoreSlugTaken, requireSessionStore } from '../../../utils/store'

export default defineEventHandler(async (event) => {
  const { store } = await requireSessionStore(event)
  const slug = parseStoreSlugInput(getQuery(event).slug)

  if (slug === store.slug) {
    return {
      slug,
      available: true,
      current: true,
    }
  }

  const taken = await isStoreSlugTaken(slug, store.id)

  return {
    slug,
    available: !taken,
    current: false,
  }
})
