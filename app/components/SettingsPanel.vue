<script setup lang="ts">
withDefaults(defineProps<{
  as?: string
}>(), {
  as: 'section',
})
</script>

<template>
  <component
    :is="as"
    class="settings-panel settings-panel--form settings-panel--solo"
  >
    <div class="settings-panel__content settings-panel__content--form">
      <slot />
    </div>
  </component>
</template>
