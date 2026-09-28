<template>
  <div class="quick">
    <button type="button"
      v-for="(q, idx) in items"
      :key="q.key"
      class="qitem press"
      @click="$emit('tap', q)"
    >
      <div class="gicon">
        <IconSvg class="qicon" :name="q.icon" :size="30" :stroke="1.9" aria-hidden="true" />
      </div>
      <span class="qlabel">{{ q.label }}</span>
    </button>
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
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  margin: 15px 12px 2px;
  padding: 13px 5px 12px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 5px 18px rgba(42, 86, 156, .06);
}
.qitem {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 12px;
  box-shadow: none;
  padding: 1px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}
.qitem:focus-visible { outline: 2px solid #4b7fff; outline-offset: 1px; }
.gicon {
  width: 58px;
  height: 58px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4278fa;
  background: linear-gradient(145deg, #f5f8ff, #eaf1ff);
  box-shadow: inset 0 0 0 1px #e9effd;
}
.qicon {
  width: 30px;
  height: 30px;
}
.qlabel {
  font-size: 13px;
  font-weight: 600;
  color: #263655;
  white-space: nowrap;
}
</style>
