<script setup lang="ts">
useSeoMeta({
  title: 'สมัครสมาชิก — UrPoint',
  description: 'สร้างบัญชีร้านค้า UrPoint',
})
</script>

<template>
  <main class="auth-page">
    <aside class="auth-story">
      <BrandMark light />
      <div class="auth-story__copy">
        <p class="eyebrow">
          YOUR CRM STARTS HERE
        </p>
        <h1>รู้จักลูกค้า<br>ให้มากกว่าเดิม</h1>
        <p>
          เข้าสู่ระบบด้วย Google แล้วตั้งค่าร้านในขั้นตอนถัดไป
          เพื่อดูแลลูกค้า Broadcast และ Rich Menu
        </p>
      </div>
      <span class="auth-story__foot">Simple setup. Strong foundation.</span>
    </aside>
    <section class="auth-main">
      <AuthForm mode="register" />
    </section>
  </main>
</template>
