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

const setupGuides = {
  1: {
    title: 'สร้าง LINE Login channel แล้วคัดลอก ID / Secret',
    intro: 'ขั้นนี้ยังไม่ต้องสร้าง LIFF และยังไม่ต้องเปิด Messaging API ให้ทำแค่ช่องทาง LINE Login ใต้ Provider ของร้าน',
    items: [
      {
        text: 'เปิด LINE Developers Console ด้วยบัญชี LINE ของเจ้าของร้าน ถ้ายังไม่เคยใช้ ให้สมัครแล้วเข้าสู่ระบบให้เรียบร้อย',
      },
      {
        text: 'ถ้ายังไม่มี Provider กด Create กรอกชื่อร้านเป็น Provider name แล้วสร้าง ถ้ามีแล้วให้เปิด Provider นั้น',
      },
      {
        text: 'หน้า Channels กดการ์ด Create a new channel',
        image: '/images/line-guide/login-create.png?v=4',
        alt: 'หน้า Provider มีการ์ด Create a new channel',
      },
      {
        text: 'ในหน้าต่าง Choose a channel type ให้เลือก LINE Login ห้ามเลือก Messaging API ในขั้นนี้',
        image: '/images/line-guide/channel-type.png?v=4',
        alt: 'หน้าต่างเลือกประเภทช่องทาง LINE Login หรือ Messaging API',
      },
      {
        text: 'กรอกฟอร์มสร้างช่องทาง: Region เลือก Thailand, ประเทศเจ้าของร้านเลือก Thailand, ใส่ Channel name, Channel description และอีเมล ติ๊กยอมรับข้อตกลง แล้วกด Create ค่าเริ่มต้นของ LINE อาจเป็น Japan ต้องเปลี่ยนเอง',
        image: '/images/line-guide/login-create-form.png?v=4',
        alt: 'ฟอร์มสร้าง LINE Login channel และช่องเลือกประเทศ',
      },
      {
        text: 'หลังสร้างเสร็จอยู่แท็บ Basic settings คัดลอก Channel ID ด้านบน ไปวางในช่อง Channel ID ของหน้านี้',
        image: '/images/line-guide/login-ids.png?v=4',
        alt: 'ช่อง Channel ID ในแท็บ Basic settings',
      },
      {
        text: 'เลื่อนลงมาช่อง Channel secret กดไอคอนคัดลอก แล้ววางในช่อง Channel Secret ของหน้านี้ จากนั้นกดปุ่มตรวจสอบกับ LINE ด้านล่าง',
      },
    ],
    sample: { label: 'รูปแบบ Channel ID', value: 'ตัวเลขยาวจาก Basic settings ไม่ใช่รหัสบอท @xxxxx' },
  },
  2: {
    title: 'วาง Callback URL แล้วสร้าง LIFF ให้หน้าสมาชิก',
    intro: 'ใช้ช่องทาง LINE Login อันเดียวกับขั้นที่ 1 Callback ต้องลงท้าย /api/line/callback ห้ามวาง Webhook URL',
    items: [
      {
        text: 'กดคัดลอก Callback URL จากกล่องด้านบนของหน้านี้',
      },
      {
        text: 'กลับไปแท็บ LINE Login ของช่องทางนี้ เปิดสวิตช์ Use LINE Login in your web app แล้วกด Edit ที่ Callback URL วางค่าที่คัดลอก แล้วบันทึก',
        image: '/images/line-guide/callback.png?v=4',
        alt: 'ช่อง Callback URL ในแท็บ LINE Login',
      },
      {
        text: 'เปิดแท็บ LIFF แล้วกดปุ่ม Add สีเขียว',
        image: '/images/line-guide/liff-add.png?v=4',
        alt: 'แท็บ LIFF และปุ่ม Add',
      },
      {
        text: 'ในฟอร์ม Add a LIFF app ใส่ชื่อแอปเป็นชื่อร้าน เลือก Size เป็น Full วาง Endpoint URL ที่คัดลอกจากหน้านี้ ติ๊ก Scopes เป็น openid และ profile แล้วกด Add ด้านล่าง Add friend option เลือก Off ได้',
        image: '/images/line-guide/liff-form.png?v=4',
        alt: 'ฟอร์ม Add a LIFF app ช่อง Size และ Endpoint URL',
      },
      {
        text: 'เปิดรายละเอียดแอปที่เพิ่งสร้าง คัดลอก LIFF ID หรือลิงก์ liff.line.me/... มาวางในช่อง LIFF ID ระบบตัดรหัสให้อัตโนมัติ ถ้าช่องทางยังไม่ Published ให้เผยแพร่ตามที่ Console ขอ',
        image: '/images/line-guide/liff-id.png?v=4',
        alt: 'ช่อง LIFF ID และ LIFF URL ในหน้ารายละเอียดแอป',
      },
    ],
    sample: { label: 'รูปแบบ LIFF ID', value: 'ตัวเลข-ตัวอักษร เช่น 1234567890-AbCdEfGh' },
  },
  3: {
    title: 'เปิด Messaging API ของบอทร้าน แล้วคัดลอก Token',
    intro: 'ช่องทางนี้คนละอันกับ LINE Login ต้องอยู่ใต้ Provider เดียวกัน ระบบจะตั้ง Webhook ให้หลังกดตรวจสอบ ยังไม่ต้องเปิด Use webhook',
    items: [
      {
        text: 'เปิด LINE Official Account Manager ของบัญชีร้าน จากนั้นไปที่ตั้งค่า แล้วเลือก Messaging API',
      },
      {
        text: 'กดเปิดใช้ Messaging API เลือก Provider เดียวกับที่สร้าง LINE Login ยอมรับข้อตกลงแล้วกดตกลง LINE จะสร้างช่องทางประเภท Messaging API ให้',
      },
      {
        text: 'กลับไป LINE Developers Console เปิด Provider ของร้าน จะเห็นช่องทาง Messaging API คนละการ์ดกับ LINE Login คลิกเข้าช่องทาง Messaging API',
        image: '/images/line-guide/login-create.png?v=4',
        alt: 'หน้า Channels ของ Provider มีทั้ง Messaging API และ LINE Login',
      },
      {
        text: 'แท็บ Basic settings คัดลอก Channel ID และ Channel Secret ของช่องทาง Messaging API มาวางด้านบนนี้ อย่าสลับกับค่าของ LINE Login',
        image: '/images/line-guide/login-ids.png?v=4',
        alt: 'ช่อง Channel ID ใน Basic settings ของ Messaging API',
      },
      {
        text: 'เปิดแท็บ Messaging API เลื่อนลงส่วน Channel access token (long-lived) ถ้ายังไม่มีค่าให้กด Issue แล้วยืนยัน จากนั้นคัดลอก token ยาวมาวางในช่อง Access Token แล้วกดตั้งค่า Messaging API กับ LINE',
        image: '/images/line-guide/messaging-token.png?v=4',
        alt: 'ช่อง Channel access token แบบ long-lived และปุ่ม Reissue',
      },
    ],
    sample: { label: 'Access Token', value: 'ข้อความยาวมากจากช่อง Channel access token (long-lived)' },
  },
  4: {
    title: 'เปิดสวิตช์ Use webhook แล้วกลับมาเปิดใช้ในร้าน',
    intro: 'LINE ไม่มี API ให้เปิดสวิตช์นี้แทนได้ ต้องเปิดเองใน Console ปุ่ม Verify เป็นการทดสอบ URL ไม่ใช่การเปิดใช้',
    items: [
      {
        text: 'คัดลอก Webhook URL จากกล่องด้านบน เปิดแท็บ Messaging API ของช่องทางบอท เลื่อนมา Webhook settings',
      },
      {
        text: 'ตรวจว่า Webhook URL ตรงกับที่คัดลอก ถ้าไม่ตรงให้กด Edit แล้ววางใหม่ ระบบมักใส่ให้แล้วหลังขั้นที่ 3',
      },
      {
        text: 'กดสวิตช์ Use webhook ให้เป็นสีเขียว แล้วกลับมาหน้านี้กดตรวจสอบและเปิดใช้งาน',
        image: '/images/line-guide/use-webhook.png?v=4',
        alt: 'สวิตช์ Use webhook ที่ต้องเปิดใต้ Webhook URL',
      },
    ],
    sample: { label: 'จุดที่ต้องเปิด', value: 'Use webhook ใต้ Webhook URL ในแท็บ Messaging API' },
  },
} as const

const activeStep = ref(1)
const pending = ref(false)
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

const { data: settings, status, error: settingsError } = await useFetch<LineSettings>('/api/settings/line-oa')

watch(settings, (value) => {
  if (value) hydrateForm(value)
}, { immediate: true })
const loading = computed(() => status.value === 'pending')

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

function fetchErrorMessage(error: unknown) {
  const fetchError = error as {
    data?: { statusMessage?: string }
    statusMessage?: string
  }
  return fetchError.data?.statusMessage
    ?? fetchError.statusMessage
    ?? 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่'
}

watch(settingsError, (err) => {
  if (!err) return
  errorMessage.value = fetchErrorMessage(err)
  toast.error(errorMessage.value)
}, { immediate: true })

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
</script>

<template>
  <div class="page-wrap">
    <SettingsPageHeader
      eyebrow="LINE OA CONNECTION"
      title="เชื่อมต่อ LINE OA"
      section-title="ตั้งค่าการเชื่อมต่อ"
      description="ตั้งค่า LINE Login, LIFF และ Messaging API ของร้านนี้ แยกจากร้านอื่นอย่างชัดเจน"
    />

    <section class="line-primer">
      <h2>ก่อนเริ่ม ต้องมี 2 ช่องทางคนละอัน</h2>
      <p>
        คนที่ไม่เคยทำ LINE Developers ให้ทำตามลำดับนี้เท่านั้น อย่าข้ามขั้น
        และอย่าเอาค่าของช่องทางหนึ่งไปวางอีกช่องทาง
      </p>
      <ol>
        <li>สร้าง Provider ชื่อร้าน แล้วสร้างช่องทางประเภท LINE Login สำหรับลูกค้าเข้าสู่ระบบ</li>
        <li>วาง Callback / สร้าง LIFF ให้หน้าสมาชิก</li>
        <li>เปิด Messaging API จากบัญชีทางการของร้าน ใต้ Provider เดียวกัน สำหรับบอทและ Webhook</li>
        <li>เปิดสวิตช์ Use webhook เองใน Console แล้วกลับมากดเปิดใช้ในร้าน</li>
      </ol>
    </section>

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
            สร้าง LINE Login channel ใต้ Provider ของร้าน
            แล้ววาง Channel ID กับ Channel Secret จากแท็บ Basic settings
            ขั้นนี้ยังไม่ต้องสร้าง LIFF และยังไม่ต้องเปิด Messaging API
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
                placeholder="ตัวเลขจากแท็บ Basic settings"
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
          <LineSetupGuide
            :title="setupGuides[1].title"
            :intro="setupGuides[1].intro"
            :items="[...setupGuides[1].items]"
            :sample="setupGuides[1].sample"
            :open="!settings.completeness.step1"
          />
        </fieldset>

        <fieldset
          v-show="activeStep === 2"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 2 — URL และ LIFF</legend>
          <p class="line-muted">
            คัดลอก Callback URL ไปวางในแท็บ LINE Login ของช่องทางนี้
            จากนั้นสร้าง LIFF แล้ววาง LIFF ID ระบบจะตรวจกับ LINE
            เมื่อเว็บไซต์ใช้ HTTPS จะอัปเดต Endpoint ให้
          </p>

          <div class="line-copy-list">
            <div
              v-for="item in [
                { label: 'Callback URL', value: settings.urls.callbackUrl },
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
              placeholder="วาง LIFF ID จากหน้ารายละเอียดแอป"
            >
            <small
              v-if="settings.urls.liffUrl"
              class="line-hint"
            >LIFF URL: {{ settings.urls.liffUrl }}</small>
          </div>
          <LineSetupGuide
            :title="setupGuides[2].title"
            :intro="setupGuides[2].intro"
            :items="[...setupGuides[2].items]"
            :sample="setupGuides[2].sample"
            :open="!settings.completeness.step2"
          />
        </fieldset>

        <fieldset
          v-show="activeStep === 3"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 3 — Messaging API</legend>
          <p class="line-muted">
            เปิด Messaging API จากบัญชีทางการของร้าน ใต้ Provider เดียวกับขั้นที่ 1
            แล้ววาง Channel ID, Channel Secret และ Access Token แบบ long-lived
            ระบบจะตั้ง Webhook URL และทดสอบให้ ยังไม่ต้องเปิด Use webhook ในขั้นนี้
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
                placeholder="ตัวเลขจากช่องทาง Messaging API"
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
              ระบบจะใช้ค่านี้กับ Webhook และเมนูแชท LINE — ตั้งเมนูได้ที่
              <NuxtLink to="/settings/rich-menu">เมนูแชท LINE</NuxtLink>
            </small>
          </div>

          <div
            v-if="settings.botDisplayName"
            class="line-bot-card"
          >
            <strong>{{ settings.botDisplayName }}</strong>
            <span>{{ settings.botBasicId }} · {{ settings.botUserId }}</span>
          </div>
          <a
            class="line-external"
            href="https://manager.line.biz/"
            target="_blank"
            rel="noopener"
          >เปิด LINE Official Account Manager</a>
          <a
            class="line-external"
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener"
          >เปิด LINE Developers Console</a>
          <LineSetupGuide
            :title="setupGuides[3].title"
            :intro="setupGuides[3].intro"
            :items="[...setupGuides[3].items]"
            :sample="setupGuides[3].sample"
            :open="!settings.completeness.step3"
          />

        </fieldset>

        <fieldset
          v-show="activeStep === 4"
          class="line-panel__section"
        >
          <legend>ขั้นตอนที่ 4 — เปิดใช้งาน</legend>
          <p class="line-muted">
            ระบบตั้ง Webhook URL และทดสอบกับ LINE แล้ว แต่สวิตช์
            <strong>Use webhook</strong>
            ต้องเปิดเองใน LINE Developers Console LINE ไม่มี API ให้เปิดแทน
          </p>
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
            <li :class="{ 'is-done': settings.isActive }">
              เปิด Use webhook ใน LINE Developers Console
              <small>แท็บ Messaging API ของช่องทางนี้ จากนั้นกลับมากดตรวจสอบและเปิดใช้งาน</small>
            </li>
          </ul>
          <div class="line-copy-list">
            <div class="line-copy-row">
              <div>
                <strong>Webhook URL</strong>
                <code>{{ settings.urls.webhookUrl }}</code>
              </div>
              <button
                type="button"
                class="button button--dark"
                @click="copyText(settings.urls.webhookUrl, 'Webhook URL')"
              >
                คัดลอก
              </button>
            </div>
          </div>
          <a
            class="line-external"
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener"
          >เปิด LINE Developers Console</a>
          <LineSetupGuide
            :title="setupGuides[4].title"
            :intro="setupGuides[4].intro"
            :items="[...setupGuides[4].items]"
            :sample="setupGuides[4].sample"
            :open="!settings.isActive"
          />

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
