<script setup lang="ts">
import { isLineReturnQuery, stripLineReturnSearch } from '#shared/utils/liff-return'

definePageMeta({
  layout: false,
})

type PublicStore = {
  store: { name: string, slug: string }
  lineEnabled: boolean
  otpEnabled: boolean
  liffId: string | null
  liffUrl: string | null
}

type Member = {
  id: string
  displayName: string | null
  pictureUrl: string | null
  phone: string | null
  pointsBalance: number
  loginMethods: { line: boolean, phone: boolean }
}

const route = useRoute()
const storeSlug = computed(() => String(route.params.storeSlug || ''))

const member = ref<Member | null>(null)
const error = ref('')
const isNewMember = ref(false)
const pendingOtp = ref(false)
const pendingVerify = ref(false)
const phoneInput = ref('')
const otpInput = ref('')
const otpRequested = ref(false)
const devCode = ref('')
const loggingOut = ref(false)
const pendingLineLogin = ref(false)
const resolvingLineSession = ref(isLineReturnQuery(route.query as Record<string, unknown>))
const { theme, themeLabel } = useAppTheme()
let liffInitPromise: Promise<void> | null = null

useSeoMeta({
  title: 'สมาชิกร้าน — UrPoint',
})

const displayName = computed(() => {
  if (!member.value) return 'สมาชิก'
  return member.value.displayName || 'สมาชิก'
})

function fetchErrorMessage(err: unknown, fallback: string) {
  const fetchError = err as { data?: { statusMessage?: string }, statusMessage?: string }
  return fetchError.data?.statusMessage || fetchError.statusMessage || (err instanceof Error ? err.message : fallback)
}

async function loadLiffSdk() {
  if (typeof window === 'undefined') {
    throw new Error('LIFF ใช้ได้เฉพาะในเบราว์เซอร์')
  }

  // @ts-expect-error LIFF global from CDN
  if (window.liff) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('โหลด LIFF SDK ไม่สำเร็จ'))
    document.head.appendChild(script)
  })
}

function getLiff() {
  return (window as unknown as {
    liff: {
      init: (opts: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      isInClient: () => boolean
      login: (opts?: { redirectUri?: string }) => void
      logout: () => void
      getIDToken: () => string | null
    }
  }).liff
}

function memberRedirectUri() {
  return `${window.location.origin}${window.location.pathname}`
}

function stripLiffQuery() {
  const result = stripLineReturnSearch(window.location.search)
  if (result.changed) {
    window.history.replaceState({}, '', `${window.location.pathname}${result.search}${window.location.hash}`)
  }
}

async function ensureLiff() {
  const liffId = storeInfo.value?.liffId
  if (!storeInfo.value?.lineEnabled || !liffId) {
    throw new Error('ร้านนี้ยังไม่เปิดเข้าสู่ระบบด้วย LINE')
  }

  await loadLiffSdk()
  const liffApi = getLiff()
  if (!liffInitPromise) {
    liffInitPromise = liffApi.init({ liffId }).catch((error) => {
      liffInitPromise = null
      throw error
    })
  }
  await liffInitPromise
  return liffApi
}

async function verifyLiffToken(idToken: string) {
  const response = await $fetch<{
    isNewMember: boolean
    member: Member
  }>('/api/line/liff-verify', {
    method: 'POST',
    body: {
      storeSlug: storeSlug.value,
      idToken,
    },
  })

  member.value = response.member
  isNewMember.value = response.isNewMember
}

const LIFF_LOGIN_GUARD = 'urpoint.liffLoginRedirect'

async function tryLiffLogin(loginIfNeeded: boolean | 'in-client') {
  if (!storeInfo.value?.lineEnabled || !storeInfo.value.liffId) {
    return false
  }

  const liffApi = await ensureLiff()

  if (!liffApi.isLoggedIn()) {
    const shouldLogin = loginIfNeeded === true || (loginIfNeeded === 'in-client' && liffApi.isInClient())
    const alreadyRedirected = import.meta.client && sessionStorage.getItem(LIFF_LOGIN_GUARD) === '1'
    if (shouldLogin && !alreadyRedirected) {
      sessionStorage.setItem(LIFF_LOGIN_GUARD, '1')
      liffApi.login({ redirectUri: memberRedirectUri() })
      return true
    }
    return false
  }

  sessionStorage.removeItem(LIFF_LOGIN_GUARD)
  const idToken = liffApi.getIDToken()
  if (!idToken) {
    throw new Error('ไม่พบ LINE ID token')
  }

  await verifyLiffToken(idToken)
  stripLiffQuery()
  return true
}

async function onLineLoginClick(event: MouseEvent) {
  event.preventDefault()
  error.value = ''
  pendingLineLogin.value = true
  sessionStorage.removeItem(LIFF_LOGIN_GUARD)
  try {
    const started = await tryLiffLogin(true)
    if (member.value || started) {
      return
    }
    error.value = 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองอีกครั้ง'
    pendingLineLogin.value = false
    sessionStorage.removeItem(LIFF_LOGIN_GUARD)
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
    pendingLineLogin.value = false
    sessionStorage.removeItem(LIFF_LOGIN_GUARD)
  }
}

async function requestOtp() {
  error.value = ''
  pendingOtp.value = true
  try {
    const data = await $fetch<{ devCode?: string }>('/api/customer/otp/request', {
      method: 'POST',
      body: {
        storeSlug: storeSlug.value,
        phone: phoneInput.value,
      },
    })
    otpRequested.value = true
    devCode.value = data.devCode || ''
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'ส่งรหัส OTP ไม่สำเร็จ')
  }
  finally {
    pendingOtp.value = false
  }
}

async function verifyOtp() {
  error.value = ''
  pendingVerify.value = true
  try {
    const data = await $fetch<{ isNewMember: boolean, member: Member }>('/api/customer/otp/verify', {
      method: 'POST',
      body: {
        storeSlug: storeSlug.value,
        phone: phoneInput.value,
        code: otpInput.value,
      },
    })
    member.value = data.member
    isNewMember.value = data.isNewMember
    devCode.value = ''
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'ยืนยันรหัส OTP ไม่สำเร็จ')
  }
  finally {
    pendingVerify.value = false
  }
}

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/customer/logout', { method: 'POST' })
    try {
      if (liffInitPromise) {
        const liffApi = getLiff()
        if (liffApi.isLoggedIn()) {
          liffApi.logout()
        }
      }
    }
    catch {
      // LIFF may not be initialized on this visit
    }
    member.value = null
    isNewMember.value = false
    otpRequested.value = false
    otpInput.value = ''
    devCode.value = ''
  }
  finally {
    loggingOut.value = false
  }
}

async function bootstrapLiff() {
  if (member.value || !storeInfo.value?.lineEnabled || !storeInfo.value.liffId) {
    resolvingLineSession.value = false
    return
  }

  const returningFromLine = isLineReturnQuery(route.query as Record<string, unknown>)
  if (!returningFromLine) {
    resolvingLineSession.value = false
    return
  }

  resolvingLineSession.value = true
  try {
    const started = await tryLiffLogin(true)
    if (!member.value && !started) {
      error.value = 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองอีกครั้ง'
      sessionStorage.removeItem(LIFF_LOGIN_GUARD)
    }
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
    sessionStorage.removeItem(LIFF_LOGIN_GUARD)
  }
  finally {
    if (member.value || error.value) {
      resolvingLineSession.value = false
      pendingLineLogin.value = false
    }
  }
}

const { data: storeInfo, error: storeFetchError } = await useFetch<PublicStore>(
  () => `/api/public/store/${encodeURIComponent(storeSlug.value)}`,
)

const { data: sessionPayload } = await useFetch<{ customer: Member | null }>(
  () => `/api/customer/me?slug=${encodeURIComponent(storeSlug.value)}`,
)

const lineBusy = computed(() => {
  return !member.value && (resolvingLineSession.value || pendingLineLogin.value)
})
const showLogin = computed(() => {
  return Boolean(storeInfo.value && !member.value && !lineBusy.value)
})
const lineStartHref = computed(() => {
  return storeInfo.value?.liffUrl || `https://liff.line.me/${storeInfo.value?.liffId || ''}`
})

watch(sessionPayload, (value) => {
  if (value?.customer) {
    member.value = value.customer
  }
}, { immediate: true })

watch(storeFetchError, (err) => {
  if (err) {
    error.value = fetchErrorMessage(err, 'โหลดหน้าร้านไม่สำเร็จ')
  }
}, { immediate: true })

onMounted(() => {
  void bootstrapLiff()
})
</script>

<template>
  <main class="member-shell" :data-theme="theme">
    <div class="phone-frame">
      <div class="phone-frame__notch" aria-hidden="true" />
      <div class="phone-frame__screen">
        <div class="member-probe__card">
          <div class="member-probe__top">
            <p class="member-probe__eyebrow">
              URPOINT MEMBER
            </p>
            <button
              class="member-theme-toggle"
              type="button"
              data-theme-toggle
              :aria-label="theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'"
              :title="themeLabel"
            >
              <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" :size="16" />
              <span>{{ theme === 'light' ? 'ธีมมืด' : 'ธีมสว่าง' }}</span>
            </button>
          </div>
          <h1>{{ storeInfo?.store.name || 'หน้าสมาชิกร้าน' }}</h1>

          <div
            v-if="lineBusy"
            class="member-loading"
            role="status"
            aria-live="polite"
          >
            <span class="member-loading__spinner" aria-hidden="true" />
            <p>กำลังเข้าสู่ระบบด้วย LINE</p>
            <small>รอสักครู่ ระบบกำลังยืนยันตัวตน</small>
          </div>

          <p
            v-if="!lineBusy && error"
            class="member-probe__error"
            role="alert"
          >
            {{ error }}
          </p>

          <template v-if="!lineBusy && member">
            <div class="member-probe__profile">
              <img
                v-if="member.pictureUrl"
                :src="member.pictureUrl"
                alt=""
                class="member-probe__avatar"
              >
              <span
                v-else
                class="member-probe__avatar member-probe__avatar--fallback"
              >
                {{ displayName.slice(0, 1) }}
              </span>
              <div>
                <p class="member-probe__ok">
                  {{ isNewMember ? 'ยินดีต้อนรับสมาชิกใหม่' : 'คุณเป็นสมาชิกร้านแล้ว' }}
                </p>
                <p class="member-probe__name">
                  {{ displayName }}
                </p>
              </div>
            </div>

            <div class="member-points">
              <span>แต้มสะสม</span>
              <strong>{{ member.pointsBalance.toLocaleString('th-TH') }}</strong>
              <small>PT</small>
            </div>

            <button
              class="button button--ghost member-probe__logout"
              type="button"
              :disabled="loggingOut"
              @click="logout"
            >
              {{ loggingOut ? 'กำลังออก…' : 'ออกจากระบบ' }}
            </button>
          </template>

          <template v-else-if="showLogin && !storeInfo.lineEnabled && !storeInfo.otpEnabled">
            <p class="member-probe__muted">
              ร้านนี้ยังไม่เปิดรับสมาชิก
            </p>
          </template>

          <template v-else-if="showLogin">
            <p class="member-probe__muted">
              เข้าสู่ระบบเพื่อสะสมแต้มกับร้านนี้
            </p>

            <div class="member-login">
              <a
                v-if="storeInfo.lineEnabled"
                class="button member-login__line"
                :href="lineStartHref"
                @click="onLineLoginClick"
              >
                <AppIcon name="line" :size="18" />
                {{ pendingLineLogin ? 'กำลังเปิด LINE…' : 'เข้าสู่ระบบด้วย LINE' }}
              </a>

              <form
                v-if="storeInfo.otpEnabled"
                class="member-login__otp"
                @submit.prevent="otpRequested ? verifyOtp() : requestOtp()"
              >
                <label for="member-phone">เบอร์โทรศัพท์</label>
                <input
                  id="member-phone"
                  v-model="phoneInput"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  placeholder="เช่น 081-234-5678"
                  required
                >
                <label
                  v-if="otpRequested"
                  for="member-otp"
                >รหัส OTP</label>
                <input
                  v-if="otpRequested"
                  id="member-otp"
                  v-model="otpInput"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="รหัส 6 หลัก"
                  required
                >
                <p
                  v-if="devCode"
                  class="member-login__dev"
                >
                  รหัสสำหรับทดสอบ: <strong>{{ devCode }}</strong>
                </p>
                <button
                  class="button button--primary"
                  type="submit"
                  :disabled="pendingOtp || pendingVerify"
                >
                  {{ pendingOtp || pendingVerify
                    ? 'กำลังดำเนินการ…'
                    : otpRequested ? 'ยืนยันรหัส' : 'ขอรหัส OTP' }}
                </button>
              </form>
            </div>
          </template>
        </div>
      </div>
      <div class="phone-frame__home" aria-hidden="true" />
    </div>
  </main>
</template>
