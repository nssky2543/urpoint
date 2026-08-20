<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})

useSeoMeta({
  title: 'UrPoint — LINE CRM สำหรับร้านค้าที่อยากรู้จักลูกค้ามากขึ้น',
  description: 'จัดการข้อมูลลูกค้า Broadcast และ Rich Menu ผ่าน LINE OA ในระบบเดียว',
})
</script>

<template>
  <div class="landing">
    <header class="container landing-nav">
      <BrandMark light />
      <nav class="landing-nav__actions" aria-label="เมนูหลัก">
        <a href="#features" class="landing-nav__link">ความสามารถ</a>
        <NuxtLink to="/login" class="landing-nav__link">เข้าสู่ระบบ</NuxtLink>
        <NuxtLink to="/register" class="button button--primary">
          เริ่มใช้งาน
        </NuxtLink>
      </nav>
    </header>

    <main>
      <section class="container hero">
        <div>
          <p class="eyebrow">
            LINE CRM FOR GROWING STORES
          </p>
          <h1>
            เปลี่ยนทุกแชต<br>
            ให้เป็น<span>ลูกค้าประจำ</span>
          </h1>
          <p class="hero__lead">
            UrPoint รวมข้อมูลลูกค้าจาก LINE OA ให้ร้านค้ารู้จักลูกค้ามากขึ้น
            สื่อสารตรงกลุ่ม และดูแลทุกความสัมพันธ์จากที่เดียว
          </p>
          <div class="hero__actions">
            <NuxtLink to="/register" class="button button--primary">
              สร้างบัญชีร้านค้า
            </NuxtLink>
            <a href="#features" class="button button--ghost">
              ดูว่า UrPoint ช่วยอะไรได้บ้าง
            </a>
          </div>
          <p class="hero__note">
            เข้าสู่ระบบร้านค้าด้วย Google
          </p>
        </div>

        <div class="signal-stage" aria-label="ตัวอย่างการเชื่อมบทสนทนา LINE กับข้อมูล CRM">
          <div class="signal-stage__rail" />
          <article class="chat-bubble chat-bubble--one">
            <div class="chat-bubble__head">
              <span class="chat-bubble__avatar">LINE</span>
              <span>
                <strong>ลูกค้าใหม่</strong>
                <small>เมื่อสักครู่</small>
              </span>
            </div>
            <p>มีโปรสำหรับลูกค้าที่ซื้อประจำไหมคะ?</p>
          </article>

          <article class="chat-bubble chat-bubble--two">
            <div class="chat-bubble__head">
              <span class="chat-bubble__avatar">OA</span>
              <span>
                <strong>ร้านของคุณ</strong>
                <small>ตอบอัตโนมัติ</small>
              </span>
            </div>
            <p>มีค่ะ คุณมี 820 แต้ม แลกรับส่วนลดได้เลย</p>
          </article>

          <article class="crm-snapshot">
            <div class="crm-snapshot__top">
              <span class="crm-snapshot__label">LIVE CUSTOMER VIEW</span>
              <span class="status-dot" />
            </div>
            <div class="customer-row">
              <span class="customer-row__avatar">NP</span>
              <span>
                <strong>ณิชา พรหมดี</strong>
                <small>ลูกค้าประจำ · 8 ออเดอร์</small>
              </span>
              <span class="customer-row__points">820 PT</span>
            </div>
            <div class="customer-row">
              <span class="customer-row__avatar">KS</span>
              <span>
                <strong>กิตติศักดิ์</strong>
                <small>กลับมาซื้อเมื่อวาน</small>
              </span>
              <span class="customer-row__points">240 PT</span>
            </div>
          </article>
        </div>
      </section>

      <section id="features" class="landing-section landing-section--light">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">
              ONE STORE, ONE CUSTOMER VIEW
            </p>
            <div>
              <h2>เข้าใจลูกค้า ก่อนส่งทุกข้อความ</h2>
              <p>
                วางรากฐาน CRM ที่เชื่อมกับ LINE OA ของแต่ละร้าน
                เพื่อให้ทุกการสื่อสารมีข้อมูลรองรับ ไม่ใช่การเดา
              </p>
            </div>
          </div>

          <div class="features">
            <article class="feature">
              <span class="feature__icon">01</span>
              <h3>รู้จักลูกค้าคนเดิม</h3>
              <p>
                รวมประวัติและกิจกรรมของลูกค้าไว้ในโปรไฟล์เดียว
                พร้อมต่อยอดระบบสมาชิกและสะสมแต้ม
              </p>
            </article>
            <article class="feature">
              <span class="feature__icon">02</span>
              <h3>Broadcast ตรงกลุ่ม</h3>
              <p>
                เตรียมกลุ่มเป้าหมายจากข้อมูลจริง เพื่อส่งข้อความที่ตรงกับลูกค้า
                และลดการรบกวนที่ไม่จำเป็น
              </p>
            </article>
            <article class="feature">
              <span class="feature__icon">03</span>
              <h3>จัดการ LINE OA จากร้าน</h3>
              <p>
                เชื่อมต่อ OA ของแต่ละร้าน แล้วตั้งเมนูแชท LINE
                จากหน้าตั้งค่าให้ลูกค้ากดเปิดลิงก์สมาชิกได้ทันที
              </p>
            </article>
          </div>

          <div class="future-note">
            <strong>เข้าสู่ระบบร้านค้าด้วย Google</strong>
            <span>
              โครงสร้างบัญชีวันนี้ใช้ Google Login
              และออกแบบให้เพิ่มวิธีเข้าสู่ระบบอื่นได้ในอนาคต
            </span>
          </div>
        </div>
      </section>

      <section class="container closing-cta">
        <h2>เริ่มสร้างความสัมพันธ์ที่วัดผลได้</h2>
        <NuxtLink to="/register" class="button button--primary">
          สร้างบัญชีฟรี
        </NuxtLink>
      </section>
    </main>

    <footer class="container landing-footer">
      <BrandMark light />
      <span>© 2026 UrPoint. CRM ที่เริ่มจากความเข้าใจลูกค้า</span>
    </footer>
  </div>
</template>
