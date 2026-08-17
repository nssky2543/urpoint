<script setup lang="ts">
import type { AppToastItem } from '~/composables/useAppToast'

const { toasts, dismiss } = useAppToast()

const iconName: Record<AppToastItem['type'], 'check' | 'close' | 'alert' | 'info'> = {
  success: 'check',
  error: 'close',
  warning: 'alert',
  info: 'info',
}
</script>

<template>
  <div
    class="app-toast-host"
    aria-live="polite"
    aria-relevant="additions"
  >
    <article
      v-for="toast in toasts"
      :key="toast.id"
      class="app-toast"
      :class="`app-toast--${toast.type}`"
      role="status"
    >
      <span class="app-toast__icon" aria-hidden="true">
        <AppIcon :name="iconName[toast.type]" :size="16" />
      </span>
      <div class="app-toast__copy">
        <strong>{{ toast.title }}</strong>
        <p>{{ toast.message }}</p>
      </div>
      <button
        class="app-toast__close"
        type="button"
        aria-label="ปิดการแจ้งเตือน"
        @click="dismiss(toast.id)"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </article>
  </div>
</template>
