<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'member-auth',
})

const promotions = [
  {
    title: 'ตัดผมครบ 300 ลดทันที 10%',
    detail: 'ใช้ได้ทุกทรง ทุกช่วงเวลา จนกว่าแคมเปญจะเต็มโควตา',
    tag: 'HOT',
  },
  {
    title: 'มาคู่ลดเพิ่ม',
    detail: 'พาเพื่อนมาตัดในบิลเดียวกัน รับส่วนลดพิเศษอีกชั้น',
    tag: 'SOON',
  },
  {
    title: 'วันเกิดสมาชิก',
    detail: 'เดือนเกิดของคุณ รับเซ็ตทรงฟรี 1 ครั้ง',
    tag: 'SOON',
  },
]
</script>

<template>
  <MemberFeaturePage
    eyebrow="PROMOTION"
    title="โปรโมชันร้าน"
    description="รวมดีลเด่นของร้านไว้ที่นี่ — ตอนนี้เป็นหน้าตัวอย่าง ระบบจริงจะเปิดใช้ในรอบถัดไป"
  >
    <div class="feature-soon">
      เร็วๆ นี้ · ยังไม่เปิดจอง/ใช้คูปองจริง
    </div>

    <article
      v-for="item in promotions"
      :key="item.title"
      class="feature-card"
    >
      <span class="feature-card__tag">{{ item.tag }}</span>
      <h2>{{ item.title }}</h2>
      <p>{{ item.detail }}</p>
    </article>
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

.feature-card {
  position: relative;
  display: grid;
  gap: 0.4rem;
  padding: 1rem 0.95rem;
  border: 1px solid var(--member-card-border);
  border-radius: 16px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--member-accent) 12%, transparent), transparent 55%),
    var(--member-card);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--member-text) 6%, transparent);
}

.feature-card__tag {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--member-accent);
}

.feature-card h2 {
  margin: 0;
  padding-right: 3rem;
  color: var(--member-text);
  font-size: 1.05rem;
  line-height: 1.35;
}

.feature-card p {
  margin: 0;
  color: var(--member-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}
</style>
