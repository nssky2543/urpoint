<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  sectionTitle?: string
  description?: string
}>()
</script>

<template>
  <header class="settings-page-header page-heading">
    <div>
      <p class="page-heading__eyebrow">
        {{ eyebrow }}
      </p>
      <h1>{{ title }}</h1>
      <div
        v-if="sectionTitle || description"
        class="settings-page-header__copy"
      >
        <h2 v-if="sectionTitle">
          {{ sectionTitle }}
        </h2>
        <p v-if="description">
          {{ description }}
        </p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.settings-page-header {
  grid-template-columns: 1fr;
  margin-bottom: 1.1rem;
}

.settings-page-header__copy {
  display: grid;
  gap: 0.3rem;
  margin-top: 0.65rem;
  max-width: 42rem;
}

.settings-page-header__copy h2 {
  margin: 0;
  color: var(--dash-text);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}

.settings-page-header__copy p {
  margin: 0;
  color: var(--dash-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}
</style>
