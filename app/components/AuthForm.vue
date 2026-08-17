<script setup lang="ts">
const props = defineProps<{
  mode: 'login' | 'register'
}>()

const route = useRoute()
const pending = ref(false)
const errorMessage = ref('')
const toast = useAppToast()

const copy = computed(() => props.mode === 'login'
  ? {
      title: 'ยินดีต้อนรับกลับ',
      lead: 'เข้าสู่ระบบร้านค้าด้วยบัญชี Google',
      submit: 'เข้าสู่ระบบด้วย Google',
      switchText: 'ยังไม่มีบัญชีร้านค้า?',
      switchLink: 'สมัครสมาชิก',
      switchTo: '/register',
    }
  : {
      title: 'สร้างบัญชีร้านค้า',
      lead: 'เข้าสู่ระบบด้วย Google แล้วตั้งค่าร้านในขั้นตอนถัดไป',
      submit: 'สมัครด้วย Google',
      switchText: 'มีบัญชีอยู่แล้ว?',
      switchLink: 'เข้าสู่ระบบ',
      switchTo: '/login',
    })

const errorCopy: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบด้วย Google',
  invalid_state: 'เซสชัน Google หมดอายุ กรุณาลองใหม่',
  email_unverified: 'อีเมล Google ยังไม่ได้ยืนยัน',
  google_failed: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่',
}

function startGoogleAuth() {
  errorMessage.value = ''
  pending.value = true

  const params = new URLSearchParams({
    intent: props.mode,
  })

  window.location.href = `/api/auth/google/start?${params.toString()}`
}

watch(() => route.query.error, (value) => {
  if (typeof value !== 'string' || !value) {
    return
  }
  errorMessage.value = errorCopy[value] ?? 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่'
  toast.error(errorMessage.value)
}, { immediate: true })
</script>

<template>
  <div class="auth-panel">
    <BrandMark class="auth-panel__mobile-brand" />
    <h2>{{ copy.title }}</h2>
    <p class="auth-panel__lead">
      {{ copy.lead }}
    </p>

    <form @submit.prevent="startGoogleAuth">
      <p
        v-if="errorMessage"
        class="form-error"
        role="alert"
        aria-live="polite"
      >
        {{ errorMessage }}
      </p>

      <button
        class="button button--google auth-submit"
        type="submit"
        :disabled="pending"
      >
        <span class="google-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" />
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332Z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z" />
          </svg>
        </span>
        {{ pending ? 'กำลังพาไป Google…' : copy.submit }}
      </button>
    </form>

    <p class="auth-switch">
      {{ copy.switchText }}
      <NuxtLink :to="copy.switchTo">
        {{ copy.switchLink }}
      </NuxtLink>
    </p>

    <NuxtLink to="/" class="back-link">
      ← กลับหน้าหลัก
    </NuxtLink>
  </div>
</template>
