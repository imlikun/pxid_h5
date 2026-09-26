<template>
  <div class="quick">
    <div
      v-for="(q, idx) in items"
      :key="q.key"
      class="qitem press"
      @click="$emit('tap', q)"
    >
      <div class="gicon" :class="'g'+(idx+1)">
        <img v-if="QUICK_ICON_SVG[q.icon]" class="qicon" :src="QUICK_ICON_SVG[q.icon]" :alt="q.label" />
        <IconSvg v-else class="qicon" :name="q.icon" :size="22" />
      </div>
      <span class="qlabel">{{ q.label }}</span>
    </div>
  </div>
</template>

<script setup>
import IconSvg from './IconSvg.vue'
import { QUICK_ICON_SVG } from '../assets/icons'
defineProps({
  items: { type: Array, required: true },
})
defineEmits(['tap'])
</script>

<style scoped>
.quick {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  margin: 14px 8px 0;
}
.qitem {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.gicon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
}
.g1 { background: linear-gradient(135deg, #7DA2FF, #4D7CFF); }
.g2 { background: linear-gradient(135deg, #FF9F59, #FF7A2F); }
.g3 { background: linear-gradient(135deg, #50E3A3, #18B566); }
.g4 { background: linear-gradient(135deg, #A18CFF, #7C5CFF); }
.qicon {
  width: 24px;
  height: 24px;
  color: #fff;
}
.qlabel {
  font-size: 12px;
  color: #333;
}
</style>
