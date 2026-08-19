<script setup lang="ts">
export type LineGuideItem = {
  text: string
  image?: string
  alt?: string
}

defineProps<{
  title: string
  intro?: string
  items: readonly LineGuideItem[]
  sample?: { label: string, value: string }
  open?: boolean
}>()
</script>

<template>
  <details
    class="line-guide"
    :open="open"
  >
    <summary>
      <span class="line-guide__kicker">คู่มือทีละขั้นตอน</span>
      <strong>{{ title }}</strong>
    </summary>
    <p
      v-if="intro"
      class="line-guide__intro"
    >
      {{ intro }}
    </p>
    <ol class="line-guide__steps">
      <li
        v-for="(item, index) in items"
        :key="index"
      >
        <p>{{ item.text }}</p>
        <figure
          v-if="item.image"
          class="line-guide__shot"
        >
          <img
            :src="item.image"
            :alt="item.alt || item.text"
            loading="lazy"
          >
          <figcaption>ข้อความที่เบลอพร้อมป้ายดำ «ชื่อร้าน» คือชื่อร้านใน LINE Developers ของตัวอย่าง ไม่ใช่ค่าที่ต้องคัดลอก</figcaption>
        </figure>
      </li>
    </ol>
    <p
      v-if="sample"
      class="line-guide__sample"
    >
      <span>{{ sample.label }}</span>
      <code>{{ sample.value }}</code>
    </p>
  </details>
</template>
