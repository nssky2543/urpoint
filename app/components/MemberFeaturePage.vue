<script setup lang="ts">
const props = defineProps<{
  title: string
  eyebrow: string
  description: string
}>()

const route = useRoute()
const storeSlug = computed(() => String(route.params.storeSlug || ''))
const { theme, themeLabel } = useAppTheme()

const { data: storeInfo } = await useFetch<{
  store: { name: string, slug: string }
}>(() => `/api/public/store/${storeSlug.value}`)

const storeName = computed(() => storeInfo.value?.store.name || 'ร้าน')
const homeHref = computed(() => `/m/${storeSlug.value}`)

useSeoMeta({
  title: () => `${props.title} — ${storeName.value}`,
})
</script>

<template>
  <main
    class="member-shell"
    :data-theme="theme"
  >
    <div class="phone-frame">
      <div
        class="phone-frame__notch"
        aria-hidden="true"
      />
      <div class="phone-frame__screen">
        <div class="member-feature">
          <header class="member-nav">
            <NuxtLink
              class="member-nav__brand"
              :to="homeHref"
            >
              {{ storeName }} member
            </NuxtLink>
            <button
              class="member-theme-toggle"
              type="button"
              data-theme-toggle
              :aria-label="theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'"
              :title="themeLabel"
            >
              <AppIcon
                :name="theme === 'light' ? 'moon' : 'sun'"
                :size="16"
              />
            </button>
          </header>

          <div class="member-feature__body">
            <NuxtLink
              class="member-feature__back"
              :to="homeHref"
            >
              ← กลับหน้าแรก
            </NuxtLink>
            <p class="member-probe__eyebrow">
              {{ eyebrow }}
            </p>
            <p class="member-feature__store">
              {{ storeName }}
            </p>
            <h1>{{ title }}</h1>
            <p class="member-feature__desc">
              {{ description }}
            </p>

            <slot />
          </div>
        </div>
      </div>
      <div
        class="phone-frame__home"
        aria-hidden="true"
      />
    </div>
  </main>
</template>

<style scoped>
.member-feature {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100%;
}

.member-feature__body {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  padding: 1.1rem 1.05rem 1.4rem;
}

.member-feature__back {
  width: fit-content;
  color: var(--member-text);
  font-size: 0.86rem;
  font-weight: 600;
  opacity: 0.72;
  text-decoration: none;
}

.member-feature__back:hover {
  color: var(--member-accent);
  opacity: 1;
}

.member-feature__store {
  margin: 0;
  color: var(--member-accent);
  font-size: 0.85rem;
  font-weight: 700;
}

.member-feature h1 {
  margin: 0;
  color: var(--member-text);
  font-size: clamp(1.55rem, 5vw, 1.9rem);
  line-height: 1.25;
  letter-spacing: 0;
}

.member-feature__desc {
  margin: 0 0 0.35rem;
  color: var(--member-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .member-feature__body {
    padding: 1rem 16px max(28px, env(safe-area-inset-bottom));
  }
}
</style>
