<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const authUser = useState<{ id: string, email: string, name: string, username: string, avatarUrl: string | null } | null>('auth:user')

type DashboardSummary = {
  store: {
    name: string
    slug: string
    businessType: 'barber' | 'spa'
    businessTypeLabel: string
    staffBookingEnabled: boolean
  }
  customerCount: number
  lineActive: boolean
}

const { data: summary, status } = await useFetch<DashboardSummary>('/api/dashboard/summary')
const loading = computed(() => status.value === 'pending')

const lineStatusLabel = computed(() => {
  if (!summary.value) return '—'
  return summary.value.lineActive ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'
})

const lineStatusHint = computed(() => {
  if (!summary.value) return 'กำลังโหลด…'
  if (!summary.value.lineActive) return 'ยังไม่ได้เชื่อมต่อ'
  if (summary.value.customerCount === 0) return 'รอลูกค้าคนแรกผ่าน LIFF'
  return 'อัปเดตจาก LINE LIFF'
})

const bookingHint = computed(() => {
  if (!summary.value) return ''
  return summary.value.store.staffBookingEnabled
    ? 'เปิดจองช่าง (ใช้เมื่อระบบจองพร้อม)'
    : 'ปิดจองช่าง (ใช้เมื่อระบบจองพร้อม)'
})

useSeoMeta({
  title: 'Dashboard — UrPoint',
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div>
        <p class="page-heading__eyebrow">
          STORE OVERVIEW
        </p>
        <h1>ภาพรวมร้านของคุณ</h1>
      </div>
      <p class="page-heading__desc">
        ติดตามลูกค้าและสถานะ LINE OA จากพื้นที่เดียว
      </p>
    </div>

    <section class="welcome-panel">
      <div class="welcome-panel__copy">
        <h2>สวัสดี {{ authUser?.name || authUser?.email }}</h2>
        <p>
          {{ summary?.store.name || 'ร้านของคุณ' }}
          · {{ summary?.store.businessTypeLabel || '—' }}
        </p>
      </div>
    </section>

    <section class="metric-grid" aria-label="สรุปข้อมูลร้าน">
      <article class="metric-card">
        <div class="metric-card__top">
          <span>ลูกค้าทั้งหมด</span>
          <span class="metric-card__icon"><AppIcon name="users" /></span>
        </div>
        <strong>{{ loading ? '…' : summary?.customerCount ?? 0 }}</strong>
        <small>{{ lineStatusHint }}</small>
      </article>
      <article class="metric-card">
        <div class="metric-card__top">
          <span>LINE OA</span>
          <span class="metric-card__icon"><AppIcon name="line" /></span>
        </div>
        <strong>{{ loading ? '…' : lineStatusLabel }}</strong>
        <small>
          {{ summary?.lineActive ? 'พร้อมรับสมาชิกผ่าน LIFF' : 'เชื่อมต่อเพื่อเริ่ม CRM' }}
        </small>
      </article>
      <article class="metric-card">
        <div class="metric-card__top">
          <span>ประเภทธุรกิจ</span>
          <span class="metric-card__icon"><AppIcon name="store" /></span>
        </div>
        <strong>{{ loading ? '…' : summary?.store.businessTypeLabel ?? '—' }}</strong>
        <small>{{ bookingHint || 'ตั้งค่าได้ที่หน้าตั้งค่าร้าน' }}</small>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="dash-card">
        <h2 class="dash-card__heading">
          เริ่มต้นใช้งาน
        </h2>
        <div class="setup-list">
          <div class="setup-item">
            <span class="setup-item__number">01</span>
            <span>
              <strong>ตั้งค่าร้าน</strong>
              <small>ชื่อร้าน ประเภทธุรกิจ และจองช่าง</small>
            </span>
            <NuxtLink to="/settings/store">
              เปิดหน้า →
            </NuxtLink>
          </div>
          <div class="setup-item">
            <span class="setup-item__number">02</span>
            <span>
              <strong>เชื่อมต่อ LINE OA</strong>
              <small>เปิดรับสมาชิกผ่าน LIFF</small>
            </span>
            <NuxtLink to="/settings/line-oa">
              เปิดหน้า →
            </NuxtLink>
          </div>
          <div class="setup-item">
            <span class="setup-item__number">03</span>
            <span>
              <strong>ดูรายชื่อลูกค้า</strong>
              <small>ติดตามสมาชิกที่เข้ามาผ่าน LINE</small>
            </span>
            <NuxtLink to="/customers">
              เปิดหน้า →
            </NuxtLink>
          </div>
        </div>
      </article>

      <article class="dash-card status-panel">
        <span class="status-panel__mark">
          <AppIcon name="spark" :size="27" />
        </span>
        <div>
          <h3>CRM พร้อมใช้งาน</h3>
          <p>
            ลูกค้าที่เปิดหน้าสมาชิกผ่าน LINE จะถูกบันทึกอัตโนมัติ
            ระบบจองจะอ่านค่าจองช่างจากการตั้งค่าร้านเมื่อพร้อม
          </p>
        </div>
      </article>
    </section>
  </div>
</template>
