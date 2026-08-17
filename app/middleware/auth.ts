type AuthUser = {
  id: string
  email: string
  name: string
  username: string
  avatarUrl: string | null
}

type AuthMe = {
  user: AuthUser
  store: {
    onboarded: boolean
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authUser = useState<AuthUser | null>('auth:user', () => null)
  const storeOnboarded = useState<boolean>('store:onboarded', () => false)

  try {
    const response = await $fetch<AuthMe>('/api/auth/me', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    authUser.value = response.user
    storeOnboarded.value = response.store.onboarded
  } catch {
    authUser.value = null
    storeOnboarded.value = false
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  if (!storeOnboarded.value && to.path !== '/settings/store') {
    return navigateTo('/settings/store')
  }
})
