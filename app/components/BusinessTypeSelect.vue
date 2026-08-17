<script setup lang="ts">
import {
  BUSINESS_TYPE_DESCRIPTIONS,
  BUSINESS_TYPE_ICONS,
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  type BusinessType,
} from '#shared/utils/business-type'

const props = defineProps<{
  id?: string
}>()

const model = defineModel<BusinessType>({ required: true })

const emit = defineEmits<{
  change: []
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const listboxId = useId()

const selectedIcon = computed(() => BUSINESS_TYPE_ICONS[model.value])
const selectedLabel = computed(() => BUSINESS_TYPE_LABELS[model.value])

function toggle() {
  open.value = !open.value
}

function select(type: BusinessType) {
  model.value = type
  emit('change')
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) {
    open.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="rootRef"
    class="business-select"
    :class="{ 'is-open': open }"
  >
    <button
      :id="props.id"
      type="button"
      class="business-select__trigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click.stop="toggle"
    >
      <span class="business-select__trigger-icon" aria-hidden="true">
        <AppIcon :name="selectedIcon" :size="18" />
      </span>
      <span class="business-select__trigger-label">
        {{ selectedLabel }}
      </span>
      <span class="business-select__trigger-chevron" aria-hidden="true">
        <AppIcon name="chevron-down" :size="18" />
      </span>
    </button>

    <ul
      v-show="open"
      :id="listboxId"
      class="business-select__panel"
      role="listbox"
      :aria-labelledby="props.id"
    >
      <li
        v-for="type in BUSINESS_TYPES"
        :key="type"
        role="option"
        :aria-selected="model === type"
      >
        <button
          type="button"
          class="business-select__option"
          :class="{ 'is-selected': model === type }"
          @click="select(type)"
        >
          <span class="business-select__option-icon" aria-hidden="true">
            <AppIcon :name="BUSINESS_TYPE_ICONS[type]" :size="18" />
          </span>
          <span class="business-select__option-copy">
            <strong>{{ BUSINESS_TYPE_LABELS[type] }}</strong>
            <span>{{ BUSINESS_TYPE_DESCRIPTIONS[type] }}</span>
          </span>
          <span
            v-if="model === type"
            class="business-select__option-check"
            aria-hidden="true"
          >
            <AppIcon name="check" :size="16" />
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
