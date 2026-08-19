<script setup>
import { THEME_BOOT_SCRIPT } from '~/utils/theme-boot'

useHead({
  script: [
    {
      key: 'urpoint-theme-boot',
      innerHTML: THEME_BOOT_SCRIPT,
    },
  ],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppToastHost />
</template>
