export default defineNuxtRouteMiddleware(async (to) => {
  const slug = String(to.params.storeSlug || '').trim()
  if (!slug) {
    return
  }

  const requestFetch = useRequestFetch()

  try {
    const data = await requestFetch<{ customer: unknown | null }>(
      `/api/customer/me?slug=${encodeURIComponent(slug)}`,
    )
    if (data?.customer) {
      return
    }
  }
  catch {
    // Fall through to login redirect
  }

  return navigateTo(`/m/${slug}`)
})
