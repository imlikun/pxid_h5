<template>
  <div class="quick">
    <div
      v-for="q in items"
      :key="q.key"
      class="qitem press"
      @click="$emit('tap', q)"
    >
      <IconSvg class="qicon" :name="q.icon" :size="22" />
      <span class="qlabel">{{ q.label }}</span>
    </div>
  </div>
</template>

<script setup>
import IconSvg from './IconSvg.vue'
defineProps({
  items: { type: Array, required: true },
})
defineEmits(['tap'])
</script>

<style scoped>
.quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 12px 0;
}
.qitem {
  flex: 1;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 14px 4px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.qitem:active {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(77, 124, 255, 0.15);
}
.qicon {
  width: 44px;
  height: 44px;
  padding: 11px;
  box-sizing: border-box;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.qlabel {
  font-size: 13px;
  color: var(--text);
}
</style>
