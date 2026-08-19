<script setup lang="ts">
import {
  BUSINESS_TYPE_DESCRIPTIONS,
  defaultStaffBookingEnabled,
  type BusinessType,
} from '#shared/utils/business-type'
import { canEnableLineLogin } from '#shared/utils/customer-login'
import { normalizeStoreSlug } from '#shared/utils/store-slug'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'ตั้งค่าร้าน — UrPoint',
})

type StoreSettings = {
  store: {
    id: string
    name: string
    slug: string
    phone: string | null
    businessType: BusinessType
    staffBookingEnabled: boolean
    customerLoginLineEnabled: boolean
    customerLoginOtpEnabled: boolean
    onboarded: boolean
    memberUrl: string
    liffUrl: string | null
  }
  lineActive: boolean
}

const storeOnboarded = useState<boolean>('store:onboarded', () => false)
const pending = ref(false)
const errorMessage = ref('')
const isOnboarding = ref(false)
const lineActive = ref(false)
const liffUrl = ref<string | null>(null)
const copied = ref('')
const slugCheck = ref<'idle' | 'checking' | 'available' | 'current' | 'taken' | 'invalid'>('idle')
const slugCheckMessage = ref('')
const checkingSlug = ref(false)

const runtimeConfig = useRuntimeConfig()
const appUrl = computed(() => String(runtimeConfig.public.appUrl || '').replace(/\/+$/, '') || 'http://localhost:3000')

const form = reactive({
  name: '',
  phone: '',
  slug: '',
  businessType: 'barber' as BusinessType,
  staffBookingEnabled: true,
  customerLoginLineEnabled: false,
  customerLoginOtpEnabled: true,
})

const previewMemberUrl = computed(() => `${appUrl.value}/m/${form.slug || '...'}`)

const heading = computed(() => isOnboarding.value
  ? {
      eyebrow: 'WELCOME',
      title: 'ตั้งค่าร้านครั้งแรก',
      desc: 'กรอกข้อมูลร้านให้ครบ แล้วกดบันทึกเพื่อเข้าใช้งาน Dashboard',
    }
  : {
      eyebrow: 'STORE SETTINGS',
      title: 'ตั้งค่าร้าน',
      desc: 'ข้อมูลร้าน ประเภทธุรกิจ และวิธีเข้าสู่ระบบของลูกค้า',
    })

const lineLoginLocked = computed(() => !canEnableLineLogin(lineActive.value))
const toast = useAppToast()
const authUser = useState('auth:user')
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authUser.value = null
    storeOnboarded.value = false
    await navigateTo('/')
  }
  finally {
    loggingOut.value = false
  }
}

function applySettings(data: StoreSettings) {
  form.name = data.store.name === 'ร้านของคุณ' ? '' : data.store.name
  form.phone = data.store.phone || ''
  form.slug = data.store.slug
  form.businessType = data.store.businessType
  form.staffBookingEnabled = data.store.staffBookingEnabled
  form.customerLoginLineEnabled = data.store.customerLoginLineEnabled
  form.customerLoginOtpEnabled = data.store.customerLoginOtpEnabled
  isOnboarding.value = !data.store.onboarded
  storeOnboarded.value = data.store.onboarded
  lineActive.value = data.lineActive
  liffUrl.value = data.store.liffUrl
}

const { data, status, error: settingsError, refresh } = await useFetch<StoreSettings>('/api/settings/store')

watch(data, (value) => {
  if (value) applySettings(value)
}, { immediate: true })

const loading = computed(() => status.value === 'pending')

watch(settingsError, (err) => {
  if (!err) return
  errorMessage.value = err instanceof Error ? err.message : 'โหลดข้อมูลร้านไม่สำเร็จ'
  toast.error(errorMessage.value)
}, { immediate: true })

function onBusinessTypeChange() {
  form.staffBookingEnabled = defaultStaffBookingEnabled(form.businessType)
}

function onSlugInput() {
  slugCheck.value = 'idle'
  slugCheckMessage.value = ''
}

async function checkSlug() {
  checkingSlug.value = true
  slugCheck.value = 'checking'
  slugCheckMessage.value = ''

  try {
    form.slug = normalizeStoreSlug(form.slug)
    const data = await $fetch<{ available: boolean, current: boolean, slug: string }>(
      '/api/settings/store/slug',
      { query: { slug: form.slug } },
    )
    form.slug = data.slug
    if (data.current) {
      slugCheck.value = 'current'
      slugCheckMessage.value = 'นี่คือลิงก์ปัจจุบันของร้านคุณ'
      toast.info(slugCheckMessage.value)
    }
    else if (data.available) {
      slugCheck.value = 'available'
      slugCheckMessage.value = 'ใช้ลิงก์นี้ได้ ยังไม่มีร้านอื่นใช้'
      toast.success(slugCheckMessage.value, 'ลิงก์ว่าง')
    }
    else {
      slugCheck.value = 'taken'
      slugCheckMessage.value = 'ลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น'
      toast.warning(slugCheckMessage.value)
    }
  }
  catch (error) {
    slugCheck.value = 'invalid'
    const fetchError = error as {
      data?: { statusMessage?: string }
      statusMessage?: string
    }
    slugCheckMessage.value = fetchError.data?.statusMessage
      ?? fetchError.statusMessage
      ?? (error instanceof Error ? error.message : 'ตรวจสอบลิงก์ไม่สำเร็จ')
    toast.error(slugCheckMessage.value)
  }
  finally {
    checkingSlug.value = false
  }
}

async function copyLink(value: string, key: string) {
  try {
    await navigator.clipboard.writeText(value)
  }
  catch {
    window.prompt('คัดลอกลิงก์สมาชิก', value)
    return
  }
  copied.value = key
  toast.success('คัดลอกลิงก์แล้ว', 'คัดลอก')
  window.setTimeout(() => {
    if (copied.value === key) copied.value = ''
  }, 1600)
}

async function saveSettings() {
  errorMessage.value = ''
  pending.value = true

  try {
    const data = await $fetch<{ store: StoreSettings['store'] }>('/api/settings/store', {
      method: 'PATCH',
      body: {
        name: form.name,
        phone: form.phone,
        slug: form.slug,
        businessType: form.businessType,
        staffBookingEnabled: form.staffBookingEnabled,
        customerLoginLineEnabled: form.customerLoginLineEnabled,
        customerLoginOtpEnabled: form.customerLoginOtpEnabled,
      },
    })
    storeOnboarded.value = data.store.onboarded
    form.slug = data.store.slug
    form.customerLoginLineEnabled = data.store.customerLoginLineEnabled
    form.customerLoginOtpEnabled = data.store.customerLoginOtpEnabled
    liffUrl.value = data.store.liffUrl
    slugCheck.value = 'idle'
    slugCheckMessage.value = ''
    toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว')
    if (isOnboarding.value) {
      await navigateTo('/dashboard')
    }
    else {
      await refresh()
    }
  }
  catch (error) {
    const fetchError = error as {
      data?: { statusMessage?: string }
      statusMessage?: string
    }
    errorMessage.value = fetchError.data?.statusMessage
      ?? fetchError.statusMessage
      ?? 'บันทึกการตั้งค่าไม่สำเร็จ'
    toast.error(errorMessage.value)
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div>
        <p class="page-heading__eyebrow">
          {{ heading.eyebrow }}
        </p>
        <h1>{{ heading.title }}</h1>
      </div>
      <p class="page-heading__desc">
        {{ heading.desc }}
      </p>
    </div>

    <section class="settings-panel settings-panel--form">
      <aside class="settings-panel__aside">
        <span class="settings-panel__aside-icon">
          <AppIcon name="store" :size="27" />
        </span>
        <h2>ข้อมูลร้าน</h2>
        <p>
          ตั้งชื่อร้าน ประเภทธุรกิจ และรายละเอียดพื้นฐาน
          เพื่อใช้กับระบบ CRM และการจองในอนาคต
        </p>
      </aside>

      <div class="settings-panel__content settings-panel__content--form">
        <p
          v-if="loading"
          class="settings-form__muted"
        >
          กำลังโหลดข้อมูลร้าน…
        </p>

        <form
          v-else
          class="settings-form"
          @submit.prevent="saveSettings"
        >
          <div class="form-field">
            <label for="store-name">ชื่อร้าน</label>
            <input
              id="store-name"
              v-model="form.name"
              type="text"
              maxlength="80"
              placeholder="เช่น ABC Barber"
              required
            >
          </div>

          <div class="form-field">
            <label for="store-phone">เบอร์โทรร้าน</label>
            <input
              id="store-phone"
              v-model="form.phone"
              type="tel"
              maxlength="32"
              placeholder="เช่น 053-000-000"
            >
          </div>

          <div class="form-field">
            <label for="store-type">ประเภทธุรกิจ</label>
            <BusinessTypeSelect
              id="store-type"
              v-model="form.businessType"
              @change="onBusinessTypeChange"
            />
            <p class="form-hint">
              {{ BUSINESS_TYPE_DESCRIPTIONS[form.businessType] }}
            </p>
          </div>

          <div class="settings-toggle">
            <div>
              <strong>เปิดให้ลูกค้าจองช่างได้</strong>
              <p>
                ระบบจองยังไม่พร้อมใช้งาน แต่ค่านี้จะถูกใช้เมื่อเปิดฟีเจอร์จอง
                สามารถเปลี่ยนได้ภายหลังที่เมนูตั้งค่า
              </p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="form.staffBookingEnabled"
                type="checkbox"
              >
              <span class="toggle-switch__track" aria-hidden="true" />
            </label>
          </div>

          <div class="form-field">
            <label for="store-slug">ลิงก์สมาชิก</label>
            <div class="slug-editor">
              <span class="slug-editor__prefix">{{ appUrl }}/m/</span>
              <input
                id="store-slug"
                v-model="form.slug"
                type="text"
                maxlength="48"
                autocomplete="off"
                spellcheck="false"
                placeholder="เช่น n-phink"
                required
                @input="onSlugInput"
              >
              <button
                class="button button--dark slug-editor__check"
                type="button"
                :disabled="checkingSlug || !form.slug"
                @click="checkSlug"
              >
                {{ checkingSlug ? 'กำลังตรวจ…' : 'ตรวจสอบ' }}
              </button>
            </div>
            <p
              class="form-hint"
              :class="{
                'form-hint--ok': slugCheck === 'available' || slugCheck === 'current',
                'form-hint--error': slugCheck === 'taken' || slugCheck === 'invalid',
              }"
            >
              {{ slugCheckMessage || 'ส่วนท้ายลิงก์ตั้งค่าได้ และต้องไม่ซ้ำกับร้านอื่น' }}
            </p>
            <div class="settings-copy">
              <input
                id="member-url"
                :value="previewMemberUrl"
                type="text"
                readonly
              >
              <button
                class="button button--dark settings-copy__button"
                type="button"
                @click="copyLink(previewMemberUrl, 'member')"
              >
                <AppIcon name="copy" :size="16" />
                {{ copied === 'member' ? 'คัดลอกแล้ว' : 'คัดลอก' }}
              </button>
            </div>
          </div>

          <div
            v-if="liffUrl"
            class="form-field"
          >
            <label for="liff-url">ลิงก์ใน LINE</label>
            <div class="settings-copy">
              <input
                id="liff-url"
                :value="liffUrl"
                type="text"
                readonly
              >
              <button
                class="button button--dark settings-copy__button"
                type="button"
                @click="liffUrl && copyLink(liffUrl, 'liff')"
              >
                <AppIcon name="copy" :size="16" />
                {{ copied === 'liff' ? 'คัดลอกแล้ว' : 'คัดลอก' }}
              </button>
            </div>
            <p class="form-hint">
              ใช้แชร์ในแชท LINE ให้เปิดผ่านแอปโดยตรง
            </p>
          </div>

          <div
            class="settings-toggle"
            :class="{ 'is-disabled': lineLoginLocked }"
          >
            <div>
              <strong>เข้าสู่ระบบด้วย LINE</strong>
              <p v-if="lineLoginLocked">
                ต้องเชื่อมต่อ LINE OA ให้เสร็จก่อน
                <NuxtLink to="/settings/line-oa">ไปตั้งค่า LINE OA</NuxtLink>
              </p>
              <p v-else>
                ลูกค้าเข้าสมาชิกผ่าน LINE Login หรือ LIFF ได้
              </p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="form.customerLoginLineEnabled"
                type="checkbox"
                :disabled="lineLoginLocked"
              >
              <span class="toggle-switch__track" aria-hidden="true" />
            </label>
          </div>

          <div class="settings-toggle">
            <div>
              <strong>เข้าสู่ระบบด้วยเบอร์ OTP</strong>
              <p>
                รอบนี้ยังเป็นโหมดทดสอบ ระบบจะแสดงรหัสบนหน้าลูกค้า
                ยังไม่ส่ง SMS จริง
              </p>
            </div>
            <label class="toggle-switch">
              <input
                v-model="form.customerLoginOtpEnabled"
                type="checkbox"
              >
              <span class="toggle-switch__track" aria-hidden="true" />
            </label>
          </div>

          <p
            v-if="errorMessage"
            class="form-error"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <div class="settings-form__actions">
            <button
              class="button button--dark settings-form__submit"
              type="submit"
              :disabled="pending || loggingOut"
            >
              {{ pending ? 'กำลังบันทึก…' : isOnboarding ? 'บันทึกแล้วไป Dashboard' : 'บันทึกการตั้งค่า' }}
            </button>
            <button
              v-if="isOnboarding"
              class="button button--ghost settings-form__logout"
              type="button"
              :disabled="pending || loggingOut"
              @click="logout"
            >
              <AppIcon name="logout" :size="16" />
              {{ loggingOut ? 'กำลังออก…' : 'ออกจากระบบ' }}
            </button>
          </div>
          <p
            v-if="isOnboarding"
            class="form-hint settings-form__logout-hint"
          >
            ยังไม่พร้อมตั้งค่าตอนนี้? ออกจากระบบเพื่อกลับไปดูหน้าแรกได้
          </p>
        </form>
      </div>
    </section>
  </div>
</template>
