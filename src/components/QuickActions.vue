<template>
  <div class="quick">
    <div
      v-for="q in items"
      :key="q.key"
      class="qitem"
      @click="$emit('tap', q)"
    >
      <span class="qicon">{{ q.icon }}</span>
      <span class="qlabel">{{ q.label }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
})
defineEmits(['tap'])
</script>

<style scoped>
.quick {
  display: flex;
  gap: 10px;
  padding: 12px;
}
.qitem {
  flex: 1;
  background: var(--card);
  border-radius: var(--radius);
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.qicon {
  font-size: 24px;
}
.qlabel {
  font-size: 12px;
  color: var(--text);
}
</style>
