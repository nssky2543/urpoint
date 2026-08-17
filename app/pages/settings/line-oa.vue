<script setup lang="ts">
import {
  canAccessLineStep,
  getHighestAccessibleLineStep,
} from '#shared/utils/line-steps'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'เชื่อมต่อ LINE OA — UrPoint',
})

type LineSettings = {
  store: { id: string, name: string, slug: string }
  loginChannelId: string
  loginChannelSecretMasked: string
  messagingChannelId: string
  messagingChannelSecretMasked: string
  accessTokenMasked: string
  liffId: string
  setupStep: number
  isActive: boolean
  botUserId: string | null
  botDisplayName: string | null
  botBasicId: string | null
  loginVerifiedAt: string | null
  liffVerifiedAt: string | null
  botVerifiedAt: string | null
  webhookVerifiedAt: string | null
  urls: {
    callbackUrl: string
    endpointUrl: string
    webhookUrl: string
    liffUrl: string
    loginStartUrl: string
  }
  completeness: {
    step1: boolean
    step2: boolean
    step3: boolean
    step4: boolean
    complete: boolean
  }
  statusLabel: string
}

const steps = [
  { id: 1, title: 'LINE Login / LIFF', desc: 'Channel สำหรับลูกค้าเข้าสู่ระบบ' },
  { id: 2, title: 'URL และ LIFF', desc: 'คัดลอก URL และวาง LIFF ID' },
  { id: 3, title: 'Messaging API', desc: 'Webhook, token และบอทร้าน' },
  { id: 4, title: 'เปิดใช้งาน', desc: 'ตรวจครบแล้วเปิดการเชื่อมต่อ' },
] as const

const settings = ref<LineSettings | null>(null)
const activeStep = ref(1)
const pending = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const toast = useAppToast()

const form = reactive({
  loginChannelId: '',
  loginChannelSecret: '',
  messagingChannelId: '',
  messagingChannelSecret: '',
  accessToken: '',
  liffId: '',
  showLoginSecret: false,
  showMessagingSecret: false,
  showAccessToken: false,
})

const canSubmitCurrentStep = computed(() => {
  if (!settings.value) return false
  if (activeStep.value === 1) {
    return Boolean(
      form.loginChannelId.trim()
      && (form.loginChannelSecret.trim() || settings.value.loginChannelSecretMasked),
    )
  }
  if (activeStep.value === 2) {
    return settings.value.completeness.step1
      && Boolean(form.liffId.trim())
  }
  if (activeStep.value === 3) {
    return Boolean(
      form.messagingChannelId.trim()
      && (form.messagingChannelSecret.trim() || settings.value.messagingChannelSecretMasked)
      && (form.accessToken.trim() || settings.value.accessTokenMasked)
    )
  }
  return settings.value.completeness.complete
})

const submitButtonLabel = computed(() => {
  if (pending.value) return 'กำลังติดต่อ LINE…'
  if (activeStep.value === 1) return 'ตรวจสอบกับ LINE และไปต่อ'
  if (activeStep.value === 2) return 'ตรวจสอบกับ LINE และไปต่อ'
  if (activeStep.value === 3) return 'ตั้งค่า Messaging API กับ LINE'
  return settings.value?.isActive ? 'ตรวจสอบกับ LINE อีกครั้ง' : 'ตรวจสอบและเปิดใช้งาน'
})

function hydrateForm(data: LineSettings) {
  form.loginChannelId = data.loginChannelId
  form.messagingChannelId = data.messagingChannelId
  form.liffId = data.liffId
  form.loginChannelSecret = ''
  form.messagingChannelSecret = ''
  form.accessToken = ''
  activeStep.value = Math.min(
    Math.max(1, data.setupStep || 1),
    getHighestAccessibleLineStep(data.completeness),
  )
}

function fetchErrorMessage(error: unknown) {
  const fetchError = error as {
    data?: { statusMessage?: string }
    statusMessage?: string
  }
  return fetchError.data?.statusMessage
    ?? fetchError.statusMessage
    ?? 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่'
}

async function loadSettings() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await $fetch<LineSettings>('/api/settings/line-oa')
    settings.value = data
    hydrateForm(data)
  } catch (error) {
    errorMessage.value = fetchErrorMessage(error)
    toast.error(errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function submitCurrentStep() {
  if (!settings.value) return

  if (!canSubmitCurrentStep.value) {
    errorMessage.value = 'กรอกข้อมูลขั้นตอนนี้ให้ครบก่อนดำเนินการต่อ'
    toast.warning(errorMessage.value)
    return
  }

  pending.value = true
  errorMessage.value = ''

  try {
    const hadLiffId = Boolean(form.liffId)
    const body = activeStep.value === 1
      ? {
          loginChannelId: form.loginChannelId,
          loginChannelSecret: form.loginChannelSecret,
        }
      : activeStep.value === 2
        ? { liffId: form.liffId }
        : activeStep.value === 3
          ? {
              messagingChannelId: form.messagingChannelId,
              messagingChannelSecret: form.messagingChannelSecret,
              accessToken: form.accessToken,
            }
          : undefined
    const completedStep = activeStep.value
    const data = await $fetch<LineSettings>(
      `/api/settings/line-oa/step-${completedStep}`,
      { method: 'POST', body },
    )

    settings.value = data
    hydrateForm(data)
    const message = completedStep === 1
      ? 'LINE ยืนยัน Channel ID และ Channel Secret แล้ว'
      : completedStep === 2
        ? `LINE ${hadLiffId ? 'ยืนยัน LIFF ID' : 'สร้าง LIFF'} แล้ว`
        : completedStep === 3
          ? `LINE ยืนยัน Messaging API ของบอท ${data.botDisplayName ?? ''} แล้ว`
          : 'LINE ยืนยันการตั้งค่าครบและเปิดใช้งานแล้ว'
    toast.success(message)
  } catch (error) {
    errorMessage.value = fetchErrorMessage(error)
    toast.error(errorMessage.value)
  } finally {
    pending.value = false
  }
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`คัดลอก ${label} แล้ว`, 'คัดลอก')
  } catch {
    window.prompt(`คัดลอก ${label}`, value)
  }
}

function canOpenStep(stepId: number) {
  if (!settings.value) return stepId === 1
  return canAccessLineStep(stepId, settings.value.completeness)
}

function isStepDone(stepId: number) {
  if (!settings.value) return false
  return stepId === 1
    ? settings.value.completeness.step1
    : stepId === 2
      ? settings.value.completeness.step2
      : stepId === 3
        ? settings.value.completeness.step3
        : settings.value.isActive
}

function stepState(stepId: number) {
  if (isStepDone(stepId)) return 'done'
  if (activeStep.value === stepId) return 'active'
  if (!canOpenStep(stepId)) return 'locked'
  return 'idle'
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div>
        <p class="page-heading__eyebrow">
          LINE OA CONNECTION
        </p>
        <h1>เชื่อมต่อ LINE OA</h1>
      </div>
      <p class="page-heading__desc">
        ตั้งค่า LINE Login, LIFF และ Messaging API ของร้านนี้
        แยกจากร้านอื่นอย่างชัดเจน
      </p>
    </div>

    <div
      v-if="settings"
      class="line-status"
    >
      <div class="line-status__main">
        <span class="line-status__icon">
          <AppIcon name="line" :size="24" />
        </span>
        <div>
          <strong>สถานะการเชื่อมต่อ LINE</strong>
          <p>{{ settings.statusLabel }}</p>
        </div>
      </div>
      <div class="line-status__meta">
        <span>{{ settings.store.name }}</span>
        <span>slug: {{ settings.store.slug }}</span>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="line-banner line-banner--error"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <div
      v-if="loading"
      class="line-wizard"
    >
      <p class="line-muted">
        กำลังโหลดการตั้งค่า...
      </p>
    </div>

    <div
      v-else-if="settings"
      class="line-wizard"
    >
      <ol
        class="line-journey"
        aria-label="ขั้นตอนเชื่อมต่อ LINE"
      >
        <li
          v-for="step in steps"
          :key="step.id"
        >
          <button
            type="button"
            class="line-journey__item"
            :class="`is-${stepState(step.id)}`"
            :aria-current="activeStep === step.id ? 'step' : undefined"
            :disabled="stepState(step.id) === 'locked' || pending"
            @click="activeStep = step.id"
          >
            <span class="line-journey__num">{{ isStepDone(step.id) ? '✓' : step.id }}</span>
            <span>
              <strong>{{ step.title }}</strong>
              <small>{{ step.desc }}</small>
            </span>
          </button>
        </li>
      </ol>

      <form
        class="line-panel"
        @submit.prevent="submitCurrentStep"
      >
        <fieldset
          v-show="activeStep === 1"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 1 — LINE Login / LIFF</legend>
          <p class="line-muted">
            สร้าง LINE Login channel ใต้ Provider เดียวกับ Messaging API
            แล้ววาง Channel ID / Secret ระบบจะขอ Channel Access Token จาก LINE เพื่อตรวจสอบทันที
          </p>
          <div class="line-grid">
            <div class="form-field">
              <label for="loginChannelId">Channel ID</label>
              <input
                id="loginChannelId"
                v-model="form.loginChannelId"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                placeholder="เช่น 2010909637"
              >
            </div>
            <div class="form-field">
              <label for="loginChannelSecret">Channel Secret</label>
              <div class="line-secret">
                <input
                  id="loginChannelSecret"
                  v-model="form.loginChannelSecret"
                  :type="form.showLoginSecret ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="settings.loginChannelSecretMasked || 'วาง Channel Secret'"
                >
                <button
                  type="button"
                  class="icon-button"
                  :aria-label="form.showLoginSecret ? 'ซ่อน Channel Secret' : 'แสดง Channel Secret'"
                  @click="form.showLoginSecret = !form.showLoginSecret"
                >
                  <AppIcon :name="form.showLoginSecret ? 'close' : 'spark'" />
                </button>
              </div>
              <small
                v-if="settings.loginChannelSecretMasked"
                class="line-hint"
              >ค่าเดิม: {{ settings.loginChannelSecretMasked }} · เว้นว่างเพื่อใช้ค่าเดิม</small>
            </div>
          </div>
          <a
            class="line-external"
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener"
          >เปิด LINE Developers Console</a>
        </fieldset>

        <fieldset
          v-show="activeStep === 2"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 2 — URL และ LIFF</legend>
          <p class="line-muted">
            ระบบจะตรวจ LIFF ID กับ LINE และอัปเดต Endpoint เมื่อเว็บไซต์ใช้ HTTPS
            ส่วน Callback URL ต้องเพิ่มใน LINE Developers Console
          </p>

          <div class="line-copy-list">
            <div
              v-for="item in [
                { label: 'Callback URL', value: settings.urls.webhookUrl },
                { label: 'Endpoint URL', value: settings.urls.endpointUrl },
              ]"
              :key="item.label"
              class="line-copy-row"
            >
              <div>
                <strong>{{ item.label }}</strong>
                <code>{{ item.value }}</code>
              </div>
              <button
                type="button"
                class="button button--dark"
                @click="copyText(item.value, item.label)"
              >
                คัดลอก
              </button>
            </div>
          </div>

          <div class="form-field">
            <label for="liffId">LIFF ID</label>
            <input
              id="liffId"
              v-model="form.liffId"
              type="text"
              autocomplete="off"
              placeholder="เว้นว่างเพื่อสร้างใหม่ หรือใส่ ID เพื่ออัปเดต"
            >
            <small
              v-if="settings.urls.liffUrl"
              class="line-hint"
            >LIFF URL: {{ settings.urls.liffUrl }}</small>
          </div>
        </fieldset>

        <fieldset
          v-show="activeStep === 3"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 3 — Messaging API</legend>
          <p class="line-muted">
            เปิด Messaging API จาก LINE Official Account Manager
            แล้ววางค่าด้านล่าง ระบบจะตรวจ Token ตั้งค่า Webhook URL และสั่ง LINE ทดสอบ Webhook ทันที
          </p>
          <div class="line-grid">
            <div class="form-field">
              <label for="messagingChannelId">Channel ID</label>
              <input
                id="messagingChannelId"
                v-model="form.messagingChannelId"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                placeholder="เช่น 2010909643"
              >
            </div>
            <div class="form-field">
              <label for="messagingChannelSecret">Channel Secret</label>
              <div class="line-secret">
                <input
                  id="messagingChannelSecret"
                  v-model="form.messagingChannelSecret"
                  :type="form.showMessagingSecret ? 'text' : 'password'"
                  autocomplete="new-password"
                  :placeholder="settings.messagingChannelSecretMasked || 'วาง Channel Secret'"
                >
                <button
                  type="button"
                  class="icon-button"
                  :aria-label="form.showMessagingSecret ? 'ซ่อน Channel Secret' : 'แสดง Channel Secret'"
                  @click="form.showMessagingSecret = !form.showMessagingSecret"
                >
                  <AppIcon :name="form.showMessagingSecret ? 'close' : 'spark'" />
                </button>
              </div>
              <small
                v-if="settings.messagingChannelSecretMasked"
                class="line-hint"
              >
                บันทึกแล้ว: {{ settings.messagingChannelSecretMasked }} · เว้นว่างเพื่อใช้ค่าเดิม
              </small>
            </div>
          </div>
          <div class="form-field">
            <label for="accessToken">Access Token (Long-lived)</label>
            <div class="line-secret">
              <input
                id="accessToken"
                v-model="form.accessToken"
                :type="form.showAccessToken ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="settings.accessTokenMasked || 'วาง Channel access token'"
              >
              <button
                type="button"
                class="icon-button"
                :aria-label="form.showAccessToken ? 'ซ่อน Access Token' : 'แสดง Access Token'"
                @click="form.showAccessToken = !form.showAccessToken"
              >
                <AppIcon :name="form.showAccessToken ? 'close' : 'spark'" />
              </button>
            </div>
            <small class="line-hint">
              <template v-if="settings.accessTokenMasked">
                บันทึกแล้ว: {{ settings.accessTokenMasked }} · เว้นว่างเพื่อใช้ค่าเดิม<br>
              </template>
              ระบบจะใช้ค่านี้กับ Webhook, Broadcast และ Rich Menu ในเฟสถัดไป
            </small>
          </div>

          <div
            v-if="settings.botDisplayName"
            class="line-bot-card"
          >
            <strong>{{ settings.botDisplayName }}</strong>
            <span>{{ settings.botBasicId }} · {{ settings.botUserId }}</span>
          </div>

        </fieldset>

        <fieldset
          v-show="activeStep === 4"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 4 — เปิดใช้งาน</legend>
          <ul class="line-check-list">
            <li :class="{ 'is-done': settings.completeness.step1 }">
              LINE ยืนยัน Login Channel แล้ว
            </li>
            <li :class="{ 'is-done': settings.completeness.step2 }">
              LINE สร้างหรืออัปเดต LIFF แล้ว
            </li>
            <li :class="{ 'is-done': settings.completeness.step3 }">
              LINE ยืนยัน Access Token และทดสอบ Webhook แล้ว
            </li>
          </ul>

          <div class="line-finish-actions">
            <a
              v-if="settings.isActive"
              class="button button--dark"
              :href="settings.urls.endpointUrl"
              target="_blank"
              rel="noopener"
            >เปิดหน้าสมาชิกทดสอบ</a>
          </div>
        </fieldset>

        <div class="line-actions">
          <button
            type="button"
            class="button button--dark"
            :disabled="activeStep === 1 || pending"
            @click="activeStep -= 1"
          >
            ย้อนกลับ
          </button>
          <div class="line-actions__right">
            <button
              type="submit"
              class="button button--primary"
              :disabled="pending || !canSubmitCurrentStep"
            >
              {{ submitButtonLabel }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
