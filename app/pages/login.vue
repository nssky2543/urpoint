<script setup lang="ts">
useSeoMeta({
  title: 'เข้าสู่ระบบ — UrPoint',
  description: 'เข้าสู่ระบบร้านค้า UrPoint',
})
</script>

<template>
  <main class="auth-page">
    <aside class="auth-story">
      <BrandMark light />
      <div class="auth-story__copy">
        <p class="eyebrow">
          WELCOME BACK
        </p>
        <h1>กลับมาดูแล<br>ลูกค้าของคุณ</h1>
        <p>
          เข้าสู่ระบบด้วยบัญชี Google เพื่อจัดการร้านและลูกค้าของคุณ
        </p>
      </div>
      <span class="auth-story__foot">UrPoint Store Workspace</span>
    </aside>
    <section class="auth-main">
      <AuthForm mode="login" />
    </section>
  </main>
</template>
