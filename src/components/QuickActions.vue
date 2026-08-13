<template>
  <div class="quick">
    <div
      v-for="q in items"
      :key="q.key"
      class="qitem"
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
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.qicon {
  width: 22px;
  height: 22px;
  color: #333333;
}
.qlabel {
  font-size: 13px;
  color: #333333;
}
</style>
