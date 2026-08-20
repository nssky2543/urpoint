<script setup lang="ts">
import {
  defaultRichMenuSlots,
  isValidRichMenuUri,
  normalizeRichMenuSlots,
  richMenuCanvasSize,
  richMenuCanvasSizeHint,
  type RichMenuLayout,
  type RichMenuSlot,
  type RichMenuThemeId,
} from '#shared/utils/rich-menu'
import {
  resolveGallerySelection,
  type RichMenuGalleryItem,
} from '#shared/utils/rich-menu-gallery'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'เมนูแชท LINE — UrPoint',
})

type RichMenuTemplateInfo = {
  id: string
  label: string
  vibe: string
  layout: RichMenuLayout
  imagePath: string
  thumbPath: string
  artHasLabels: boolean
}

type RichMenuSettingsResponse = {
  lineActive: boolean
  storeName?: string
  suggested: {
    memberUrl: string
    pointsUrl: string
    promotionUrl?: string
    rewardsUrl?: string
    contactUri: string
  }
  layouts: Array<{ id: RichMenuLayout, label: string, sizeLabel: string }>
  themes: Array<{ id: RichMenuThemeId, label: string, vibe?: string, assetKey?: string, thumbPath?: string }>
  gallery?: RichMenuGalleryItem[]
  templates?: RichMenuTemplateInfo[]
  activeTemplate?: RichMenuTemplateInfo | null
  customImage?: {
    present: boolean
    updatedAt: string | null
    previewUrl: string | null
  }
  menu: {
    enabled: boolean
    name: string
    chatBarText: string
    layout: RichMenuLayout
    themeId: RichMenuThemeId
    slots: RichMenuSlot[]
    lineRichMenuId: string | null
    draftUpdatedAt: string
    publishedAt: string | null
    lastPublishError: string | null
  }
}

const toast = useAppToast()
const tab = ref<'template' | 'layout'>('template')
const pendingSave = ref(false)
const pendingPublish = ref(false)
const pendingDisable = ref(false)
const pendingImageUpload = ref(false)
const errorMessage = ref('')
const previewUrl = ref<string | null>(null)
const previewPending = ref(true)
const previewError = ref('')
const customImageUpdatedAt = ref<string | null>(null)
const savedCustomImagePresent = ref(false)
const customImagePendingRemove = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
let previewTimer: ReturnType<typeof setTimeout> | null = null
let previewRequestId = 0
let previewBootstrapped = false

const form = reactive({
  enabled: false,
  name: '',
  chatBarText: '',
  layout: 'six' as RichMenuLayout,
  themeId: 'ink' as RichMenuThemeId,
  slots: [] as RichMenuSlot[],
})

const suggested = reactive({
  memberUrl: '',
  pointsUrl: '',
  promotionUrl: '',
  rewardsUrl: '',
  contactUri: '',
})

const layouts = ref<RichMenuSettingsResponse['layouts']>([])
const gallery = ref<RichMenuGalleryItem[]>([])
const templates = ref<RichMenuTemplateInfo[]>([])
const lineActive = ref(false)
const lineRichMenuId = ref<string | null>(null)
const publishedAt = ref<string | null>(null)
const lastPublishError = ref<string | null>(null)
const draftUpdatedAt = ref<string | null>(null)

function applySettings(data: RichMenuSettingsResponse) {
  lineActive.value = data.lineActive
  layouts.value = data.layouts
  gallery.value = data.gallery || []
  templates.value = data.templates || []
  suggested.memberUrl = data.suggested.memberUrl
  suggested.pointsUrl = data.suggested.pointsUrl
  suggested.promotionUrl = data.suggested.promotionUrl || `${data.suggested.memberUrl}/promotion`
  suggested.rewardsUrl = data.suggested.rewardsUrl || `${data.suggested.memberUrl}/rewards`
  suggested.contactUri = data.suggested.contactUri
  form.enabled = data.menu.enabled
  form.name = data.menu.name
  form.chatBarText = data.menu.chatBarText
  form.layout = data.menu.layout
  form.themeId = data.menu.themeId
  form.slots = normalizeRichMenuSlots(data.menu.layout, data.menu.slots)
  lineRichMenuId.value = data.menu.lineRichMenuId
  publishedAt.value = data.menu.publishedAt
  lastPublishError.value = data.menu.lastPublishError
  draftUpdatedAt.value = data.menu.draftUpdatedAt
  savedCustomImagePresent.value = Boolean(data.customImage?.present)
  customImageUpdatedAt.value = data.customImage?.updatedAt ?? null
  customImagePendingRemove.value = false
}

const { data, status, error: loadError, refresh } = await useFetch<RichMenuSettingsResponse>(
  '/api/settings/rich-menu',
)

watch(data, (value) => {
  if (value) applySettings(value)
}, { immediate: true })

watch(loadError, (err) => {
  if (!err) return
  errorMessage.value = err instanceof Error ? err.message : 'โหลดเมนูแชทไม่สำเร็จ'
  toast.error(errorMessage.value)
}, { immediate: true })

const loading = computed(() => status.value === 'pending')
const customImagePresent = computed(() =>
  savedCustomImagePresent.value && !customImagePendingRemove.value,
)
const canvasSize = computed(() => richMenuCanvasSize(form.layout))
const previewAspect = computed(() => `${canvasSize.value.width} / ${canvasSize.value.height}`)
const canvasSizeHint = computed(() => richMenuCanvasSizeHint(form.layout))
const selectedGalleryItem = computed(() =>
  resolveGallerySelection({ layout: form.layout, themeId: form.themeId }),
)
const usesPhotoTemplate = computed(() =>
  !customImagePresent.value && selectedGalleryItem.value?.kind === 'photo',
)
const usesBakedInArt = computed(() => customImagePresent.value || usesPhotoTemplate.value)
const selectedLayoutLabel = computed(() =>
  layouts.value.find(item => item.id === form.layout)?.label || form.layout,
)
const galleryHeading = computed(() => {
  if (customImagePresent.value) return 'เทมเพลตสำรอง (ตอนนี้ใช้รูปที่อัปโหลด)'
  if (customImagePendingRemove.value) return 'เลือกเทมเพลต (รอลบรูปเมื่อบันทึก)'
  const item = selectedGalleryItem.value
  if (!item) return 'เลือกเทมเพลต'
  return `เลือกเทมเพลต (${item.meta})`
})

function revokePreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

async function refreshPreview() {
  const requestId = ++previewRequestId
  previewPending.value = true
  previewError.value = ''
  try {
    const blob = await $fetch<Blob>('/api/settings/rich-menu/preview', {
      method: 'POST',
      body: {
        layout: form.layout,
        themeId: form.themeId,
        slots: form.slots,
        useCustomImage: customImagePresent.value,
      },
      responseType: 'blob',
    })
    if (requestId !== previewRequestId) return
    revokePreviewUrl()
    previewUrl.value = URL.createObjectURL(blob)
  }
  catch (error) {
    if (requestId !== previewRequestId) return
    previewError.value = error instanceof Error ? error.message : 'สร้างพรีวิวไม่สำเร็จ'
  }
  finally {
    if (requestId === previewRequestId) {
      previewPending.value = false
    }
  }
}

function schedulePreview(immediate = false) {
  previewPending.value = true
  previewError.value = ''
  if (previewTimer) clearTimeout(previewTimer)
  if (immediate) {
    void refreshPreview()
    return
  }
  previewTimer = setTimeout(() => {
    void refreshPreview()
  }, 350)
}

watch(
  () => ({
    layout: form.layout,
    themeId: form.themeId,
    slots: form.slots.map(slot => ({ ...slot })),
  }),
  () => {
    if (loading.value) return
    const immediate = !previewBootstrapped
    previewBootstrapped = true
    schedulePreview(immediate)
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
  revokePreviewUrl()
})

function applyLayoutDefaults(layout: RichMenuLayout) {
  form.slots = defaultRichMenuSlots({
    layout,
    memberUrl: suggested.memberUrl || 'https://example.com/m/store',
    phone: suggested.contactUri.startsWith('tel:')
      ? suggested.contactUri.replace(/^tel:/, '')
      : null,
  })
}

function selectGalleryItem(item: RichMenuGalleryItem) {
  form.layout = item.layout
  form.themeId = item.themeId
  applyLayoutDefaults(item.layout)
  tab.value = 'template'
}

function onLayoutChange(layout: RichMenuLayout) {
  form.layout = layout
  applyLayoutDefaults(layout)
}

function resetDefaults() {
  form.slots = defaultRichMenuSlots({
    layout: form.layout,
    memberUrl: suggested.memberUrl || 'https://example.com/m/store',
    phone: suggested.contactUri.startsWith('tel:')
      ? suggested.contactUri.replace(/^tel:/, '')
      : null,
  })
  form.name = form.name || 'เมนูแชทร้าน'
  form.chatBarText = form.chatBarText || 'เมนู'
  if (customImagePendingRemove.value) {
    customImagePendingRemove.value = false
    toast.info('รีเซ็ตแล้ว และยกเลิกการลบรูป — กดบันทึกแบบร่างเพื่อเก็บไว้')
  }
  else {
    toast.info('รีเซ็ตลิงก์และชื่อปุ่มเป็นค่าเริ่มต้นแล้ว — กดบันทึกแบบร่างเพื่อเก็บไว้')
  }
  schedulePreview()
}

function draftBody() {
  return {
    enabled: form.enabled,
    name: form.name,
    chatBarText: form.chatBarText,
    layout: form.layout,
    themeId: form.themeId,
    slots: form.slots,
    clearCustomImage: customImagePendingRemove.value,
  }
}

function fetchErrorMessage(error: unknown, fallback: string) {
  const fetchError = error as {
    data?: { statusMessage?: string }
    statusMessage?: string
  }
  return fetchError.data?.statusMessage
    ?? fetchError.statusMessage
    ?? (error instanceof Error ? error.message : fallback)
}

async function saveDraft() {
  errorMessage.value = ''
  pendingSave.value = true
  try {
    const result = await $fetch<RichMenuSettingsResponse>('/api/settings/rich-menu', {
      method: 'PATCH',
      body: draftBody(),
    })
    applySettings(result)
    toast.success('บันทึกแบบร่างแล้ว')
    await refreshPreview()
  }
  catch (error) {
    errorMessage.value = fetchErrorMessage(error, 'บันทึกแบบร่างไม่สำเร็จ')
    toast.error(errorMessage.value)
  }
  finally {
    pendingSave.value = false
  }
}

async function publishMenu() {
  errorMessage.value = ''
  pendingPublish.value = true
  try {
    await saveDraftQuiet()
    const result = await $fetch<RichMenuSettingsResponse>('/api/settings/rich-menu/publish', {
      method: 'POST',
    })
    applySettings(result)
    toast.success('ส่งเมนูขึ้น LINE แล้ว — เปิดแชท OA บนมือถือเพื่อตรวจ')
  }
  catch (error) {
    errorMessage.value = fetchErrorMessage(error, 'ส่งขึ้น LINE ไม่สำเร็จ')
    toast.error(errorMessage.value)
    await refresh()
  }
  finally {
    pendingPublish.value = false
  }
}

async function saveDraftQuiet() {
  const result = await $fetch<RichMenuSettingsResponse>('/api/settings/rich-menu', {
    method: 'PATCH',
    body: draftBody(),
  })
  applySettings(result)
}

async function disableMenu() {
  errorMessage.value = ''
  pendingDisable.value = true
  try {
    const result = await $fetch<RichMenuSettingsResponse>('/api/settings/rich-menu/disable', {
      method: 'POST',
    })
    applySettings(result)
    toast.success('ปิดเมนูบน LINE แล้ว')
  }
  catch (error) {
    errorMessage.value = fetchErrorMessage(error, 'ปิดเมนูไม่สำเร็จ')
    toast.error(errorMessage.value)
  }
  finally {
    pendingDisable.value = false
  }
}

async function onEnabledToggle() {
  if (!form.enabled && lineRichMenuId.value) {
    await disableMenu()
  }
}

function fillSuggested(slot: RichMenuSlot, kind: 'member' | 'points' | 'promotion' | 'rewards' | 'contact') {
  if (kind === 'member') slot.uri = suggested.memberUrl
  if (kind === 'points') slot.uri = suggested.pointsUrl
  if (kind === 'promotion') slot.uri = suggested.promotionUrl
  if (kind === 'rewards') slot.uri = suggested.rewardsUrl
  if (kind === 'contact') slot.uri = suggested.contactUri
}

function uriHint(uri: string) {
  if (!uri.trim()) return 'ยังไม่มีลิงก์'
  if (!isValidRichMenuUri(uri)) return 'ลิงก์ไม่ถูกต้อง — ใช้ https หรือ tel:'
  return ''
}

function openImagePicker() {
  fileInputRef.value?.click()
}

async function onCustomImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    toast.error('อัปโหลดได้เฉพาะไฟล์ PNG หรือ JPEG')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    toast.error('ไฟล์ใหญ่เกิน 8MB กรุณาลดขนาดแล้วลองใหม่')
    return
  }

  errorMessage.value = ''
  pendingImageUpload.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<RichMenuSettingsResponse>('/api/settings/rich-menu/image', {
      method: 'POST',
      body,
    })
    applySettings(result)
    tab.value = 'layout'
    toast.success('อัปโหลดรูปแล้ว — เลือกรูปแบบให้ตรงกับรูป จากนั้นดูพรีวิว')
    await refreshPreview()
  }
  catch (error) {
    errorMessage.value = fetchErrorMessage(error, 'อัปโหลดรูปไม่สำเร็จ')
    toast.error(errorMessage.value)
  }
  finally {
    pendingImageUpload.value = false
  }
}

async function removeCustomImage() {
  if (!savedCustomImagePresent.value) return
  customImagePendingRemove.value = true
  toast.info('จะลบรูปเมื่อกดบันทึกแบบร่างหรือส่งขึ้น LINE — กดรีเซ็ตค่าเริ่มต้นเพื่อยกเลิก')
  await refreshPreview()
}

function undoRemoveCustomImage() {
  customImagePendingRemove.value = false
  toast.info('ยกเลิกการลบรูปแล้ว')
  schedulePreview()
}
</script>

<template>
  <div class="page-wrap rich-menu-page">
    <SettingsPageHeader
      eyebrow="LINE CHAT MENU"
      title="เมนูแชท LINE"
      section-title="ตั้งค่าเมนู"
      description="บันทึกแบบร่างได้ตลอด แล้วกดส่งขึ้น LINE เมื่อพร้อมให้ลูกค้าเห็น"
    />

    <div
      v-if="!loading && !lineActive"
      class="rich-banner"
      role="status"
    >
      <div>
        <strong>ยังไม่ได้เชื่อม LINE OA</strong>
        <p>ต้องเชื่อมต่อ Messaging API ให้เสร็จก่อน จึงจะส่งเมนูขึ้นแชทได้</p>
      </div>
      <NuxtLink
        class="button button--dark"
        to="/settings/line-oa"
      >
        ไปเชื่อมต่อ LINE OA
      </NuxtLink>
    </div>

    <p
      v-if="loading"
      class="settings-form__muted"
    >
      กำลังโหลดเมนูแชท…
    </p>

    <div
      v-else
      class="rich-layout"
    >
      <SettingsPanel class="rich-editor">
          <div class="settings-toggle">
            <div>
              <strong>เปิดใช้เมนูแชท</strong>
              <p>
                ปิดแล้วจะยกเลิกเมนูเริ่มต้นบน LINE ทันทีถ้าเคยส่งขึ้นไปแล้ว
              </p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="form.enabled"
                type="checkbox"
                :disabled="!lineActive || pendingDisable"
                @change="onEnabledToggle"
              >
              <span
                class="toggle-switch__track"
                aria-hidden="true"
              />
            </label>
          </div>

          <div class="form-field">
            <label for="rich-name">ชื่อเมนู</label>
            <input
              id="rich-name"
              v-model="form.name"
              type="text"
              maxlength="80"
              placeholder="เช่น เมนูร้าน"
            >
          </div>

          <div class="form-field">
            <label for="rich-chatbar">ข้อความบนแถบแชท</label>
            <input
              id="rich-chatbar"
              v-model="form.chatBarText"
              type="text"
              maxlength="14"
              placeholder="เมนู"
            >
            <p class="form-hint">
              ยาวได้ไม่เกิน 14 ตัวอักษร — แสดงบนปุ่มเปิดเมนูในแชท
            </p>
          </div>

          <div class="rich-upload">
            <div class="rich-upload__copy">
              <h3 class="rich-gallery-block__title">
                รูปของร้าน
              </h3>
              <p class="form-hint">
                อัปโหลดรูปเต็มแผง PNG/JPEG (ไม่เกิน 8MB) ขนาดแนะนำ
                {{ canvasSizeHint }}
              </p>
              <p
                v-if="customImagePresent"
                class="rich-upload__badge"
              >
                กำลังใช้รูปที่อัปโหลด
                <template v-if="customImageUpdatedAt">
                  · {{ new Date(customImageUpdatedAt).toLocaleString('th-TH') }}
                </template>
              </p>
              <p
                v-else-if="customImagePendingRemove"
                class="rich-upload__badge rich-upload__badge--warn"
              >
                จะลบรูปเมื่อบันทึกแบบร่างหรือส่งขึ้น LINE — กดยกเลิกการลบหรือรีเซ็ตค่าเริ่มต้นเพื่อคืนรูป
              </p>
            </div>
            <div class="rich-upload__actions">
              <input
                ref="fileInputRef"
                type="file"
                class="rich-upload__input"
                accept="image/png,image/jpeg"
                @change="onCustomImageSelected"
              >
              <button
                type="button"
                class="button button--dark"
                :disabled="pendingImageUpload"
                @click="openImagePicker"
              >
                {{ pendingImageUpload ? 'กำลังอัปโหลด…' : (customImagePresent || customImagePendingRemove ? 'เปลี่ยนรูป' : 'อัปโหลดรูปของร้าน') }}
              </button>
              <button
                v-if="customImagePresent"
                type="button"
                class="button button--ghost"
                :disabled="pendingImageUpload"
                @click="removeCustomImage"
              >
                ลบรูป
              </button>
              <button
                v-else-if="customImagePendingRemove"
                type="button"
                class="button button--ghost"
                :disabled="pendingImageUpload"
                @click="undoRemoveCustomImage"
              >
                ยกเลิกการลบ
              </button>
            </div>
          </div>

          <div
            v-if="customImagePresent"
            class="rich-layout-picker rich-layout-picker--custom"
          >
            <h3 class="rich-gallery-block__title">
              เลือกรูปแบบให้ตรงกับรูป
            </h3>
            <p class="form-hint rich-gallery-block__hint">
              รูปตัวอย่าง 4 ช่องต้องเลือก “4 ช่อง” — พื้นที่คลิกบน LINE จะตามรูปแบบนี้
              (ตอนนี้: {{ selectedLayoutLabel }})
            </p>
            <div class="rich-option-grid">
              <button
                v-for="layout in layouts"
                :key="`custom-${layout.id}`"
                type="button"
                class="rich-option"
                :class="{ 'is-active': form.layout === layout.id }"
                @click="onLayoutChange(layout.id)"
              >
                <strong>{{ layout.label }}</strong>
                <small>{{ layout.sizeLabel }}</small>
              </button>
            </div>
          </div>

          <div class="rich-tabs">
            <button
              type="button"
              class="rich-tabs__btn"
              :class="{ 'is-active': tab === 'template' }"
              @click="tab = 'template'"
            >
              เลือกจากเทมเพลต
            </button>
            <button
              type="button"
              class="rich-tabs__btn"
              :class="{ 'is-active': tab === 'layout' }"
              @click="tab = 'layout'"
            >
              ปรับเลย์เอาต์
            </button>
          </div>

          <div
            v-if="tab === 'template'"
            class="rich-gallery-block"
            :class="{ 'rich-gallery-block--muted': customImagePresent }"
          >
            <h3 class="rich-gallery-block__title">
              {{ galleryHeading }}
            </h3>
            <p
              v-if="customImagePresent"
              class="form-hint rich-gallery-block__hint"
            >
              ถ้าต้องการใช้เทมเพลตแทน ให้ลบรูปที่อัปโหลดก่อน
            </p>
            <p
              v-else-if="usesPhotoTemplate"
              class="form-hint rich-gallery-block__hint"
            >
              เทมเพลตรูปเต็มแผง — ข้อความอยู่ในรูปแล้ว ตั้งแค่ลิงก์แต่ละช่องให้ตรงพื้นที่คลิก
            </p>

            <div class="rich-gallery">
              <button
                v-for="item in gallery"
                :key="item.id"
                type="button"
                class="rich-gallery__card"
                :class="{ 'is-selected': selectedGalleryItem?.id === item.id }"
                :aria-pressed="selectedGalleryItem?.id === item.id"
                @click="selectGalleryItem(item)"
              >
                <span
                  v-if="selectedGalleryItem?.id === item.id"
                  class="rich-gallery__check"
                  aria-hidden="true"
                >
                  <AppIcon
                    name="check"
                    :size="14"
                  />
                </span>
                <span class="rich-gallery__thumb-wrap">
                  <img
                    :src="item.thumbPath"
                    :alt="item.label"
                    class="rich-gallery__thumb"
                    loading="lazy"
                  >
                </span>
                <span class="rich-gallery__meta">
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.meta }}</small>
                </span>
              </button>
            </div>
          </div>

          <div
            v-else-if="!customImagePresent"
            class="rich-layout-picker"
          >
            <h3 class="rich-gallery-block__title">
              รูปแบบเลย์เอาต์
            </h3>
            <div class="rich-option-grid">
              <button
                v-for="layout in layouts"
                :key="layout.id"
                type="button"
                class="rich-option"
                :class="{ 'is-active': form.layout === layout.id }"
                @click="onLayoutChange(layout.id)"
              >
                <strong>{{ layout.label }}</strong>
                <small>{{ layout.sizeLabel }}</small>
                <small
                  v-if="gallery.some(item => item.kind === 'photo' && item.layout === layout.id)"
                  class="rich-option__badge"
                >
                  มีเทมเพลตรูป
                </small>
              </button>
            </div>
          </div>

          <div
            v-else
            class="rich-layout-picker-note"
          >
            <p class="form-hint">
              กำลังใช้รูปที่อัปโหลด — เลือกรูปแบบด้านบนให้ตรงกับรูป แล้วตั้งลิงก์แต่ละช่องด้านล่าง
            </p>
          </div>

          <div class="rich-slots">
            <div class="rich-slots__head">
              <h3>ปุ่มแต่ละช่อง</h3>
              <button
                type="button"
                class="button button--ghost"
                @click="resetDefaults"
              >
                รีเซ็ตค่าเริ่มต้น
              </button>
            </div>

            <article
              v-for="(slot, index) in form.slots"
              :key="`slot-${index}`"
              class="rich-slot"
            >
              <header>
                <strong>ช่อง {{ index + 1 }}</strong>
                <label
                  v-if="!usesBakedInArt"
                  class="rich-slot__show"
                >
                  <input
                    v-model="slot.showLabel"
                    type="checkbox"
                  >
                  แสดงชื่อบนรูป
                </label>
              </header>

              <div class="form-field">
                <label :for="`slot-label-${index}`">ชื่อปุ่ม</label>
                <input
                  :id="`slot-label-${index}`"
                  v-model="slot.label"
                  type="text"
                  maxlength="20"
                  placeholder="เช่น หน้าแรก"
                >
              </div>

              <div class="form-field">
                <label :for="`slot-uri-${index}`">ลิงก์</label>
                <input
                  :id="`slot-uri-${index}`"
                  v-model="slot.uri"
                  type="url"
                  maxlength="1000"
                  placeholder="https://… หรือ tel:"
                >
                <p
                  class="form-hint"
                  :class="{ 'form-hint--error': Boolean(uriHint(slot.uri)) }"
                >
                  {{ uriHint(slot.uri) || 'ลูกค้าคลิกแล้วเปิดลิงก์นี้ใน LINE' }}
                </p>
              </div>

              <div class="rich-slot__suggest">
                <button
                  type="button"
                  class="button button--ghost"
                  @click="fillSuggested(slot, 'member')"
                >
                  หน้าแรก
                </button>
                <button
                  type="button"
                  class="button button--ghost"
                  @click="fillSuggested(slot, 'promotion')"
                >
                  โปรโมชัน
                </button>
                <button
                  type="button"
                  class="button button--ghost"
                  @click="fillSuggested(slot, 'points')"
                >
                  พอยท์
                </button>
                <button
                  type="button"
                  class="button button--ghost"
                  @click="fillSuggested(slot, 'rewards')"
                >
                  รางวัล
                </button>
                <button
                  type="button"
                  class="button button--ghost"
                  @click="fillSuggested(slot, 'contact')"
                >
                  ติดต่อ
                </button>
              </div>
            </article>
          </div>

          <p
            v-if="errorMessage || lastPublishError"
            class="settings-form__muted"
            style="color: var(--danger, #e11d48)"
          >
            {{ errorMessage || lastPublishError }}
          </p>

          <p
            v-if="publishedAt || draftUpdatedAt"
            class="settings-form__muted"
          >
            <template v-if="publishedAt">
              ส่งขึ้น LINE ล่าสุด:
              {{ new Date(publishedAt).toLocaleString('th-TH') }}
            </template>
            <template v-if="draftUpdatedAt">
              · แบบร่าง:
              {{ new Date(draftUpdatedAt).toLocaleString('th-TH') }}
            </template>
            <template v-if="lineRichMenuId">
              · ID: {{ lineRichMenuId }}
            </template>
          </p>

          <div class="settings-form__actions rich-actions">
            <button
              class="button button--dark"
              type="button"
              :disabled="pendingSave || pendingPublish"
              @click="saveDraft"
            >
              {{ pendingSave ? 'กำลังบันทึก…' : 'บันทึกแบบร่าง' }}
            </button>
            <button
              class="button button--primary"
              type="button"
              :disabled="!lineActive || pendingPublish || pendingSave"
              @click="publishMenu"
            >
              {{ pendingPublish ? 'กำลังส่งขึ้น LINE…' : 'ส่งขึ้น LINE' }}
            </button>
            <button
              v-if="lineRichMenuId || form.enabled"
              class="button button--ghost"
              type="button"
              :disabled="!lineActive || pendingDisable"
              @click="disableMenu"
            >
              {{ pendingDisable ? 'กำลังปิด…' : 'ปิดบน LINE' }}
            </button>
          </div>
      </SettingsPanel>

      <aside class="rich-preview-panel">
        <div class="rich-preview-panel__head">
          <p class="page-heading__eyebrow">
            PREVIEW
          </p>
          <h2>พรีวิวแชท</h2>
          <p>รูปเดียวกับที่จะอัปขึ้น LINE — เปลี่ยนธีมหรือปุ่มแล้วพรีวิวอัปเดตอัตโนมัติ</p>
          <p
            v-if="customImagePresent"
            class="rich-preview-panel__custom"
          >
            ใช้รูปที่ร้านอัปโหลด
          </p>
          <p class="rich-preview-panel__size">
            ขนาดรูป: <strong>{{ canvasSize.width }} × {{ canvasSize.height }} px</strong>
            <span> · {{ canvasSize.height === 843 ? 'แบบเตี้ย (compact)' : 'แบบเต็มสูง' }}</span>
          </p>
        </div>

        <div class="rich-chat">
          <div class="rich-chat__bar">
            <span>{{ form.chatBarText || 'เมนู' }}</span>
          </div>
          <div
            class="rich-chat__menu"
            :class="{ 'rich-chat__menu--empty': !previewUrl }"
            :style="previewUrl ? undefined : { aspectRatio: previewAspect }"
          >
            <img
              v-if="previewUrl"
              :src="previewUrl"
              alt="พรีวิว Rich Menu"
              class="rich-chat__image"
            >
            <p
              v-else-if="previewPending"
              class="rich-chat__status"
            >
              กำลังสร้างพรีวิว…
            </p>
            <p
              v-else
              class="rich-chat__status"
            >
              {{ previewError || 'ยังไม่มีพรีวิว' }}
            </p>
          </div>
          <p class="rich-chat__size-note">
            {{ canvasSizeHint }}
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.rich-menu-page {
  display: grid;
  gap: 1.25rem;
}

.rich-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border: 1px solid color-mix(in srgb, var(--accent, #ff8a3d) 35%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent, #ff8a3d) 10%, transparent);
}

.rich-banner p {
  margin: 0.25rem 0 0;
  color: var(--dash-muted);
  font-size: 0.92rem;
}

.rich-layout {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1.7fr) minmax(240px, 0.7fr);
  align-items: start;
}

.rich-tabs {
  display: flex;
  gap: 0.5rem;
  margin: 0.25rem 0 0.9rem;
}

.rich-tabs__btn {
  border: 1px solid var(--dash-line);
  background: transparent;
  color: var(--dash-text);
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  cursor: pointer;
  font: inherit;
}

.rich-tabs__btn.is-active {
  background: var(--dash-text);
  color: var(--dash-bg);
  border-color: transparent;
}

.rich-gallery-block {
  margin-bottom: 1.1rem;
}

.rich-gallery-block--muted {
  opacity: 0.72;
}

.rich-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.85rem 1rem;
  margin: 0 0 1.1rem;
  padding: 0.9rem 0 1rem;
  border-bottom: 1px solid var(--dash-line, #e4e4e7);
}

.rich-upload__copy {
  min-width: min(100%, 16rem);
  flex: 1 1 14rem;
}

.rich-upload__badge {
  margin: 0.45rem 0 0;
  color: var(--dash-text);
  font-size: 0.88rem;
  font-weight: 600;
}

.rich-upload__badge--warn {
  color: var(--orange-500);
}

.rich-upload__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.rich-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.rich-preview-panel__custom {
  margin: 0.35rem 0 0;
  color: var(--orange-500);
  font-size: 0.88rem;
  font-weight: 600;
}

.rich-gallery-block__title {
  margin: 0 0 0.65rem;
  font-size: 1rem;
  font-weight: 700;
}

.rich-gallery-block__hint {
  margin: -0.25rem 0 0.85rem;
}

.rich-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.rich-gallery__card {
  position: relative;
  display: grid;
  gap: 0.55rem;
  padding: 0.55rem;
  border: 1px solid var(--dash-line);
  border-radius: 14px;
  background: var(--dash-panel-strong);
  color: var(--dash-text);
  box-shadow: var(--dash-elevated-shadow, none);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.rich-gallery__card:hover {
  border-color: color-mix(in srgb, var(--orange-500, #ff8a3d) 55%, transparent);
}

.rich-gallery__card.is-selected {
  border-color: var(--orange-500, #ff8a3d);
  box-shadow:
    var(--dash-elevated-shadow, none),
    0 0 0 1px color-mix(in srgb, var(--orange-500, #ff8a3d) 70%, transparent);
}

.rich-gallery__check {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  background: var(--orange-500, #ff8a3d);
  color: #111;
  box-shadow: 0 2px 8px rgb(0 0 0 / 25%);
}

.rich-gallery__thumb-wrap {
  display: block;
  overflow: hidden;
  border-radius: 10px;
  background: #111;
  aspect-ratio: 2500 / 1686;
}

.rich-gallery__thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rich-gallery__meta {
  display: grid;
  gap: 0.15rem;
  padding: 0 0.15rem 0.2rem;
}

.rich-gallery__meta strong {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.3;
}

.rich-gallery__meta small {
  color: var(--dash-muted);
  font-size: 0.8rem;
}

.rich-layout-picker {
  margin-bottom: 1.1rem;
}

.rich-layout-picker--custom {
  padding: 0.85rem 0 1rem;
  border-bottom: 1px solid var(--dash-line, #e4e4e7);
}

.rich-layout-picker-note {
  margin: 0 0 1rem;
}

.rich-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.25rem;
}

.rich-option {
  display: grid;
  gap: 0.45rem;
  text-align: left;
  padding: 0.8rem;
  border-radius: 14px;
  border: 1px solid var(--dash-line);
  background: var(--dash-panel-strong);
  color: var(--dash-text);
  box-shadow: var(--dash-elevated-shadow, none);
  cursor: pointer;
  font: inherit;
}

.rich-option.is-active {
  border-color: var(--orange-500);
  box-shadow:
    var(--dash-elevated-shadow, none),
    inset 0 0 0 1px color-mix(in srgb, var(--orange-500) 50%, transparent);
}

.rich-option strong {
  color: var(--dash-text);
  font-size: 0.95rem;
}

.rich-option small {
  display: block;
  margin-top: 0.15rem;
  color: var(--dash-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}

.rich-option__badge {
  color: var(--orange-500);
  font-weight: 700;
}

.rich-slots {
  display: grid;
  gap: 0.85rem;
}

.rich-slots__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.rich-slots__head h3 {
  margin: 0;
  font-size: 1rem;
}

.rich-slot {
  display: grid;
  gap: 0.65rem;
  padding: 0.9rem;
  border: 1px solid var(--dash-line);
  border-radius: 16px;
  background: var(--dash-panel-strong);
  box-shadow: var(--dash-elevated-shadow, none);
}

.rich-slot header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.rich-slot__show {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--dash-muted);
}

.rich-slot__suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.rich-actions {
  flex-wrap: wrap;
}

.rich-preview-panel {
  position: sticky;
  top: calc(var(--dash-topbar-height, 74px) + 1rem);
  align-self: start;
  display: grid;
  gap: 1rem;
  padding: 1.1rem;
  border-radius: 20px;
  border: 1px solid var(--dash-line);
  background: var(--dash-panel-strong);
  color: var(--dash-text);
  box-shadow: var(--dash-elevated-shadow, none);
}

.rich-preview-panel__head h2 {
  margin: 0.15rem 0;
  color: var(--dash-text);
  font-size: 1.15rem;
}

.rich-preview-panel__head p:last-child {
  margin: 0;
  color: var(--dash-muted);
  font-size: 0.9rem;
}

.rich-preview-panel__size {
  margin: 0.55rem 0 0 !important;
  color: var(--dash-text) !important;
  font-size: 0.88rem !important;
}

.rich-preview-panel__size strong {
  color: var(--orange-500);
  font-weight: 800;
}

.rich-chat {
  display: grid;
  gap: 0.55rem;
}

.rich-chat__bar {
  display: flex;
  justify-content: center;
  padding: 0.55rem;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: 0.85rem;
}

.rich-chat__menu {
  position: relative;
  width: 100%;
  border: 1px solid var(--dash-line);
  border-radius: 18px;
  overflow: hidden;
  background: #0b0b0c;
}

.rich-chat__menu--empty {
  min-height: 140px;
  display: grid;
  place-items: center;
}

.rich-chat__image {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: top;
  object-fit: contain;
}

.rich-chat__status {
  margin: 0;
  padding: 1.5rem;
  color: var(--dash-muted);
  font-size: 0.9rem;
  text-align: center;
}

.rich-chat__size-note {
  margin: 0;
  color: var(--dash-muted);
  font-size: 0.8rem;
  text-align: center;
}

@media (max-width: 980px) {
  .rich-layout {
    grid-template-columns: 1fr;
  }

  .rich-preview-panel {
    position: static;
    order: -1;
  }

  .rich-upload {
    flex-direction: column;
    align-items: stretch;
  }

  .rich-upload__actions {
    width: 100%;
  }

  .rich-upload__actions .button {
    flex: 1 1 auto;
  }

  .rich-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .rich-option-grid,
  .rich-gallery {
    grid-template-columns: 1fr;
  }

  .rich-banner {
    align-items: stretch;
  }

  .rich-banner .button {
    width: 100%;
    justify-content: center;
  }
}
</style>
