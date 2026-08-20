<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'member-auth',
})

const rewards = [
  {
    title: 'ตัดผมฟรี 1 ครั้ง',
    cost: '500 PT',
    detail: 'แลกได้เมื่อครบเงื่อนไขสมาชิก',
  },
  {
    title: 'เซ็ตทรงฟรี',
    cost: '200 PT',
    detail: 'ใช้คู่กับบริการตัดผมในบิลเดียวกัน',
  },
  {
    title: 'ส่วนลดพิเศษ 50 บาท',
    cost: '150 PT',
    detail: 'ใช้ได้กับบริการทุกประเภท',
  },
  {
    title: 'ผลิตภัณฑ์ดูแลผม',
    cost: '800 PT',
    detail: 'ของรางวัลจากพาร์ทเนอร์ร้าน',
  },
]
</script>

<template>
  <MemberFeaturePage
    eyebrow="REWARDS"
    title="แลกของรางวัล"
    description="เลือกของรางวัลด้วยแต้มสะสม — ตอนนี้โชว์ตัวอย่างรายการไว้ก่อน ยังแลกจริงไม่ได้"
  >
    <div class="feature-soon">
      เร็วๆ นี้ · ยังไม่เปิดแลกของรางวัลจริง
    </div>

    <div class="reward-grid">
      <article
        v-for="item in rewards"
        :key="item.title"
        class="reward-card"
      >
        <div class="reward-card__cost">
          {{ item.cost }}
        </div>
        <h2>{{ item.title }}</h2>
        <p>{{ item.detail }}</p>
        <button
          class="button button--ghost"
          type="button"
          disabled
        >
          ยังไม่พร้อมแลก
        </button>
      </article>
    </div>
  </MemberFeaturePage>
</template>

<style scoped>
.feature-soon {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 0.35rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--member-soft-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--member-accent) 14%, var(--member-soft));
  color: var(--member-accent);
  font-size: 0.78rem;
  font-weight: 700;
}

.reward-grid {
  display: grid;
  gap: 0.75rem;
}

.reward-card {
  display: grid;
  gap: 0.4rem;
  padding: 1rem 0.95rem;
  border-radius: 16px;
  border: 1px solid var(--member-card-border);
  background: var(--member-card);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--member-text) 6%, transparent);
}

.reward-card__cost {
  width: fit-content;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--member-badge-bg);
  color: var(--member-accent);
  font-size: 0.78rem;
  font-weight: 800;
}

.reward-card h2 {
  margin: 0;
  color: var(--member-text);
  font-size: 1.05rem;
  line-height: 1.3;
}

.reward-card p {
  margin: 0 0 0.35rem;
  color: var(--member-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.reward-card .button {
  justify-self: start;
  min-height: 42px;
  padding: 0 16px;
  font-size: 0.88rem;
}
</style>
