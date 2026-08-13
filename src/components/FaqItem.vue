<template>
  <div class="faq" @click="open = !open">
    <div class="faq__q">
      <span class="dot">Q</span>
      <span class="txt">{{ faq.q }}</span>
      <span class="arrow">{{ open ? '∧' : '∨' }}</span>
    </div>
    <div v-if="open" class="faq__a">{{ faq.a }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  faq: { type: Object, required: true },
})

const open = ref(false)
</script>

<style scoped>
.faq {
  background: var(--card);
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
}
.faq__q {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
}
.dot {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.txt {
  flex: 1;
  font-size: 14px;
}
.arrow {
  color: var(--text-sub);
}
.faq__a {
  padding: 0 0 14px 26px;
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.6;
}
</style>
