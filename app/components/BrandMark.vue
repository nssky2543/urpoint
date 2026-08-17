<script setup lang="ts">
withDefaults(defineProps<{
  light?: boolean
}>(), {
  light: false,
})
</script>

<template>
  <NuxtLink
    to="/"
    class="brand"
    aria-label="UrPoint หน้าหลัก"
  >
    <img
      src="/logo-urpoint.png"
      alt="UrPoint"
      class="brand__image"
      width="500"
      height="397"
    >
  </NuxtLink>
</template>
