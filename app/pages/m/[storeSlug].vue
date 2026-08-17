<script setup lang="ts">
definePageMeta({
  layout: false,
})

type PublicStore = {
  store: { name: string, slug: string }
  lineEnabled: boolean
  otpEnabled: boolean
  liffId: string | null
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

const loading = ref(true)
const error = ref('')
const storeInfo = ref<PublicStore | null>(null)
const member = ref<Member | null>(null)
const isNewMember = ref(false)
const pendingOtp = ref(false)
const pendingVerify = ref(false)
const phoneInput = ref('')
const otpInput = ref('')
const otpRequested = ref(false)
const devCode = ref('')
const loggingOut = ref(false)
const { theme, themeLabel, toggleTheme } = useAppTheme()

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
      login: () => void
      getIDToken: () => string | null
    }
  }).liff
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

async function tryLiffLogin(autoLogin: boolean) {
  const liffId = storeInfo.value?.liffId
  if (!storeInfo.value?.lineEnabled || !liffId) {
    return false
  }

  await loadLiffSdk()
  const liffApi = getLiff()
  await liffApi.init({ liffId })

  if (!liffApi.isLoggedIn()) {
    if (autoLogin && liffApi.isInClient()) {
      liffApi.login()
      return true
    }
    return false
  }

  const idToken = liffApi.getIDToken()
  if (!idToken) {
    throw new Error('ไม่พบ LINE ID token')
  }

  await verifyLiffToken(idToken)
  return true
}

async function startLineLogin() {
  error.value = ''
  try {
    const usedLiff = await tryLiffLogin(true)
    if (!usedLiff && !member.value) {
      window.location.href = `/api/customer/line/start?slug=${encodeURIComponent(storeSlug.value)}`
    }
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
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

async function bootstrap() {
  loading.value = true
  error.value = ''

  try {
    storeInfo.value = await $fetch<PublicStore>(
      `/api/public/store/${encodeURIComponent(storeSlug.value)}`,
    )

    const session = await $fetch<{ customer: Member | null }>(
      `/api/customer/me?slug=${encodeURIComponent(storeSlug.value)}`,
    )

    if (session.customer) {
      member.value = session.customer
      return
    }

    if (storeInfo.value.lineEnabled && storeInfo.value.liffId) {
      try {
        await tryLiffLogin(true)
      }
      catch (err) {
        error.value = fetchErrorMessage(err, 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ')
      }
    }
  }
  catch (err) {
    error.value = fetchErrorMessage(err, 'โหลดหน้าร้านไม่สำเร็จ')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void bootstrap()
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
              :aria-label="theme === 'light' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'"
              :title="themeLabel"
              @click="toggleTheme"
            >
              <AppIcon :name="theme === 'light' ? 'moon' : 'sun'" :size="16" />
              <span>{{ theme === 'light' ? 'ธีมมืด' : 'ธีมสว่าง' }}</span>
            </button>
          </div>
          <h1>{{ storeInfo?.store.name || 'หน้าสมาชิกร้าน' }}</h1>

          <p
            v-if="loading"
            class="member-probe__muted"
          >
            กำลังโหลด…
          </p>

          <p
            v-if="!loading && error"
            class="member-probe__error"
            role="alert"
          >
            {{ error }}
          </p>

          <template v-if="!loading && member">
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

          <template v-else-if="!loading && storeInfo && !storeInfo.lineEnabled && !storeInfo.otpEnabled">
            <p class="member-probe__muted">
              ร้านนี้ยังไม่เปิดรับสมาชิก
            </p>
          </template>

          <template v-else-if="!loading && storeInfo && !member">
            <p class="member-probe__muted">
              เข้าสู่ระบบเพื่อสะสมแต้มกับร้านนี้
            </p>

            <div class="member-login">
              <button
                v-if="storeInfo.lineEnabled"
                class="button member-login__line"
                type="button"
                @click="startLineLogin"
              >
                <AppIcon name="line" :size="18" />
                เข้าสู่ระบบด้วย LINE
              </button>

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
