<script setup lang="ts">
type AuthUser = {
  id: string
  email: string
  name: string
  username: string
  avatarUrl: string | null
}

const route = useRoute()
const authUser = useState<AuthUser | null>('auth:user', () => null)
const { theme, themeLabel, toggleTheme } = useAppTheme()
const sidebarOpen = ref(false)
const loggingOut = ref(false)

const storeOnboarded = useState<boolean>('store:onboarded', () => false)

const pageLabel = computed(() => {
  if (route.path === '/customers') return 'ลูกค้า'
  if (route.path === '/settings/store') return 'ตั้งค่าร้าน'
  if (route.path === '/settings/line-oa') return 'เชื่อมต่อ LINE OA'
  return 'Dashboard'
})

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authUser.value = null
    await navigateTo('/login')
  } finally {
    loggingOut.value = false
  }
}

watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="dashboard-shell" :data-theme="theme">
    <button
      v-if="sidebarOpen"
      class="sidebar-scrim"
      type="button"
      aria-label="ปิดเมนู"
      @click="sidebarOpen = false"
    />

    <aside class="app-sidebar" :class="{ 'is-open': sidebarOpen }">
      <button
        class="icon-button mobile-close"
        type="button"
        aria-label="ปิดเมนู"
        @click="sidebarOpen = false"
      >
        <AppIcon name="close" />
      </button>

      <div class="app-sidebar__brand">
        <BrandMark />
      </div>

      <nav class="app-nav" aria-label="เมนูระบบ">
        <section
          v-if="storeOnboarded"
          class="app-nav__group"
        >
          <div class="app-nav__group-title">
            <AppIcon name="dashboard" />
            <span>ภาพรวม</span>
          </div>
          <div class="app-nav__children">
            <NuxtLink to="/dashboard" class="app-nav__link">
              Dashboard
            </NuxtLink>
          </div>
        </section>

        <section
          v-if="storeOnboarded"
          class="app-nav__group"
        >
          <div class="app-nav__group-title">
            <AppIcon name="users" />
            <span>ลูกค้า</span>
          </div>
          <div class="app-nav__children">
            <NuxtLink to="/customers" class="app-nav__link">
              รายชื่อลูกค้า
            </NuxtLink>
          </div>
        </section>

        <section class="app-nav__group">
          <div class="app-nav__group-title">
            <AppIcon name="settings" />
            <span>ตั้งค่า</span>
          </div>
          <div class="app-nav__children">
            <NuxtLink to="/settings/store" class="app-nav__link">
              ตั้งค่าร้าน
            </NuxtLink>
            <NuxtLink
              v-if="storeOnboarded"
              to="/settings/line-oa"
              class="app-nav__link"
            >
              เชื่อมต่อ LINE OA
            </NuxtLink>
          </div>
        </section>
      </nav>

      <div class="app-sidebar__foot">
        Store workspace · Phase 1
      </div>
    </aside>

    <header class="app-topbar">
      <div class="app-topbar__left">
        <button
          class="icon-button mobile-menu-button"
          type="button"
          aria-label="เปิดเมนู"
          @click="sidebarOpen = true"
        >
          <AppIcon name="menu" />
        </button>
        <span class="app-topbar__crumb">UrPoint / {{ pageLabel }}</span>
      </div>

      <div class="app-topbar__actions">
        <button
          class="icon-button"
          type="button"
          :aria-label="theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'"
          :title="themeLabel"
          @click="toggleTheme"
        >
          <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" />
        </button>
        <button
          class="icon-button"
          type="button"
          :disabled="loggingOut"
          aria-label="ออกจากระบบ"
          title="ออกจากระบบ"
          @click="logout"
        >
          <AppIcon name="logout" />
        </button>
        <div class="user-chip" aria-label="ผู้ใช้ปัจจุบัน">
          <img
            v-if="authUser?.avatarUrl"
            :src="authUser.avatarUrl"
            alt=""
            class="user-chip__photo"
          >
          <span
            v-else
            class="user-chip__avatar"
          >{{ (authUser?.name || authUser?.email || '?').slice(0, 1) }}</span>
          <span>{{ authUser?.name || authUser?.email }}</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>
