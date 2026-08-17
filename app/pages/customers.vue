<script setup lang="ts">
import { maskThaiMobile } from '#shared/utils/phone'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

useSeoMeta({
  title: 'ลูกค้า — UrPoint',
})

type CustomerRow = {
  id: string
  displayName: string | null
  pictureUrl: string | null
  phone: string | null
  pointsBalance: number
  loginMethods: { line: boolean, phone: boolean }
  status: string
  firstSeenAt: string
  lastSeenAt: string
}

const loading = ref(true)
const errorMessage = ref('')
const customers = ref<CustomerRow[]>([])
const total = ref(0)
const memberUrl = ref('')
const copied = ref(false)
const pointsTarget = ref<CustomerRow | null>(null)
const pointsDelta = ref(10)
const pointsReason = ref('')
const pointsMode = ref<'add' | 'subtract'>('add')
const pointsPending = ref(false)
const pointsError = ref('')
const toast = useAppToast()

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function customerLabel(customer: CustomerRow) {
  if (customer.displayName) return customer.displayName
  if (customer.phone) return maskThaiMobile(customer.phone)
  return 'สมาชิก'
}

function methodLabel(customer: CustomerRow) {
  if (customer.loginMethods.line && customer.loginMethods.phone) return 'LINE · เบอร์'
  if (customer.loginMethods.line) return 'LINE'
  if (customer.loginMethods.phone) return 'เบอร์ OTP'
  return '—'
}

async function copyMemberLink() {
  if (!memberUrl.value) return
  await navigator.clipboard.writeText(memberUrl.value)
  copied.value = true
  toast.success('คัดลอกลิงก์สมาชิกแล้ว', 'คัดลอก')
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

async function loadCustomers() {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await $fetch<{
      customers: CustomerRow[]
      total: number
      memberUrl: string
    }>('/api/customers')

    customers.value = data.customers
    total.value = data.total
    memberUrl.value = data.memberUrl
  }
  catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'โหลดรายชื่อลูกค้าไม่สำเร็จ'
    toast.error(errorMessage.value)
  }
  finally {
    loading.value = false
  }
}

function openPoints(customer: CustomerRow, mode: 'add' | 'subtract') {
  pointsTarget.value = customer
  pointsMode.value = mode
  pointsDelta.value = 10
  pointsReason.value = ''
  pointsError.value = ''
}

function closePoints() {
  pointsTarget.value = null
  pointsError.value = ''
}

async function submitPoints() {
  if (!pointsTarget.value) return
  pointsPending.value = true
  pointsError.value = ''

  const delta = pointsMode.value === 'add' ? pointsDelta.value : -pointsDelta.value

  try {
    const data = await $fetch<{ customer: CustomerRow }>(
      `/api/customers/${pointsTarget.value.id}/points`,
      {
        method: 'POST',
        body: {
          delta,
          reason: pointsReason.value,
        },
      },
    )
    customers.value = customers.value.map(row =>
      row.id === data.customer.id ? data.customer : row,
    )
    toast.success(
      pointsMode.value === 'add' ? 'เพิ่มแต้มเรียบร้อยแล้ว' : 'ลดแต้มเรียบร้อยแล้ว',
    )
    closePoints()
  }
  catch (error) {
    const fetchError = error as {
      data?: { statusMessage?: string }
      statusMessage?: string
    }
    pointsError.value = fetchError.data?.statusMessage
      ?? fetchError.statusMessage
      ?? 'ปรับแต้มไม่สำเร็จ'
    toast.error(pointsError.value)
  }
  finally {
    pointsPending.value = false
  }
}

onMounted(() => {
  void loadCustomers()
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-heading">
      <div>
        <p class="page-heading__eyebrow">
          CUSTOMERS
        </p>
        <h1>ลูกค้า</h1>
      </div>
      <p class="page-heading__desc">
        รายชื่อสมาชิกที่เข้ามาสะสมแต้มผ่านลิงก์ร้านคุณ
      </p>
    </div>

    <section class="customers-panel">
      <div class="customers-panel__head">
        <div>
          <strong>{{ total }}</strong>
          <span>สมาชิกทั้งหมด</span>
        </div>
        <button
          v-if="memberUrl"
          class="button button--dark customers-panel__cta"
          type="button"
          @click="copyMemberLink"
        >
          <AppIcon name="copy" :size="16" />
          {{ copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์สมาชิก' }}
        </button>
      </div>

      <p
        v-if="loading"
        class="customers-panel__muted"
      >
        กำลังโหลดรายชื่อลูกค้า…
      </p>

      <p
        v-else-if="errorMessage"
        class="form-error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div
        v-else-if="customers.length === 0"
        class="customers-empty"
      >
        <span class="customers-empty__icon">
          <AppIcon name="users" :size="28" />
        </span>
        <h2>ยังไม่มีลูกค้า</h2>
        <p>
          แชร์ลิงก์สมาชิกให้ลูกค้าเข้าสู่ระบบด้วย LINE หรือเบอร์ OTP
          ข้อมูลจะแสดงที่นี่ทันทีเมื่อมีคนเข้ามา
        </p>
        <button
          class="button button--dark"
          type="button"
          @click="copyMemberLink"
        >
          {{ copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์สมาชิก' }}
        </button>
      </div>

      <template v-else>
        <div class="customers-table-wrap" aria-label="รายชื่อลูกค้า">
          <table class="customers-table">
            <thead>
              <tr>
                <th scope="col">
                  ลูกค้า
                </th>
                <th scope="col">
                  ช่องทาง
                </th>
                <th scope="col">
                  แต้ม
                </th>
                <th scope="col">
                  เข้าใช้ล่าสุด
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="customer in customers"
                :key="customer.id"
              >
                <td>
                  <div class="customer-cell">
                    <img
                      v-if="customer.pictureUrl"
                      :src="customer.pictureUrl"
                      alt=""
                      class="customer-cell__avatar"
                    >
                    <span
                      v-else
                      class="customer-cell__avatar customer-cell__avatar--fallback"
                    >
                      {{ customerLabel(customer).slice(0, 1) }}
                    </span>
                    <span>{{ customerLabel(customer) }}</span>
                  </div>
                </td>
                <td>
                  <span class="customer-method">{{ methodLabel(customer) }}</span>
                </td>
                <td>
                  <div class="customer-points">
                    <strong>{{ customer.pointsBalance.toLocaleString('th-TH') }}</strong>
                    <button
                      type="button"
                      class="points-nudge"
                      :aria-label="`เพิ่มแต้มให้ ${customerLabel(customer)}`"
                      @click="openPoints(customer, 'add')"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      class="points-nudge"
                      :aria-label="`ลดแต้มของ ${customerLabel(customer)}`"
                      @click="openPoints(customer, 'subtract')"
                    >
                      −
                    </button>
                  </div>
                </td>
                <td>{{ formatDate(customer.lastSeenAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="customers-cards" aria-label="รายชื่อลูกค้า">
          <li
            v-for="customer in customers"
            :key="customer.id"
            class="customer-card"
          >
            <div class="customer-cell">
              <img
                v-if="customer.pictureUrl"
                :src="customer.pictureUrl"
                alt=""
                class="customer-cell__avatar"
              >
              <span
                v-else
                class="customer-cell__avatar customer-cell__avatar--fallback"
              >
                {{ customerLabel(customer).slice(0, 1) }}
              </span>
              <div>
                <strong>{{ customerLabel(customer) }}</strong>
                <small>{{ methodLabel(customer) }} · {{ customer.pointsBalance.toLocaleString('th-TH') }} PT</small>
              </div>
            </div>
            <div class="customer-card__actions">
              <button
                type="button"
                class="points-nudge"
                @click="openPoints(customer, 'add')"
              >
                + แต้ม
              </button>
              <button
                type="button"
                class="points-nudge"
                @click="openPoints(customer, 'subtract')"
              >
                − แต้ม
              </button>
            </div>
            <p class="customer-card__meta">
              เข้าใช้ล่าสุด {{ formatDate(customer.lastSeenAt) }}
            </p>
          </li>
        </ul>
      </template>
    </section>

    <div
      v-if="pointsTarget"
      class="points-modal-scrim"
      @click.self="closePoints"
    >
      <form
        class="points-modal"
        @submit.prevent="submitPoints"
      >
        <div class="points-modal__head">
          <h2>
            {{ pointsMode === 'add' ? 'เพิ่มแต้ม' : 'ลดแต้ม' }}
          </h2>
          <button
            class="icon-button"
            type="button"
            aria-label="ปิด"
            @click="closePoints"
          >
            <AppIcon name="close" :size="16" />
          </button>
        </div>
        <p>{{ customerLabel(pointsTarget) }} · ยอดปัจจุบัน {{ pointsTarget.pointsBalance.toLocaleString('th-TH') }} PT</p>
        <label for="points-delta">จำนวนแต้ม</label>
        <input
          id="points-delta"
          v-model.number="pointsDelta"
          type="number"
          min="1"
          max="100000"
          required
        >
        <label for="points-reason">เหตุผล (ไม่บังคับ)</label>
        <input
          id="points-reason"
          v-model="pointsReason"
          type="text"
          maxlength="120"
          placeholder="เช่น มาใช้บริการ"
        >
        <p
          v-if="pointsError"
          class="form-error"
          role="alert"
        >
          {{ pointsError }}
        </p>
        <div class="points-modal__actions">
          <button
            class="button button--secondary"
            type="button"
            @click="closePoints"
          >
            ยกเลิก
          </button>
          <button
            class="button button--dark"
            type="submit"
            :disabled="pointsPending"
          >
            {{ pointsPending ? 'กำลังบันทึก…' : 'ยืนยัน' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
