<template>
  <div class="quick">
    <button type="button"
      v-for="(q, idx) in items"
      :key="q.key"
      class="qitem press"
      @click="$emit('tap', q)"
    >
      <div class="gicon">
        <img class="qicon" :src="icons[q.key]" alt="" aria-hidden="true" />
      </div>
      <span class="qlabel">{{ q.label }}</span>
    </button>
  </div>
</template>

<script setup>
import flame from '../assets/icons/shop-flame.svg'
import star from '../assets/icons/shop-star.svg'
import coins from '../assets/icons/shop-coins.svg'
const icons = { hot: flame, new: star, points: coins }
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
  padding: 15px 5px 14px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 5px 18px rgba(42, 86, 156, .06);
}
@media (min-width: 600px) {
  .quick {
    max-width: 760px;
    margin-left: auto;
    margin-right: auto;
  }
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
  gap: 9px;
  cursor: pointer;
}
.qitem:focus-visible { outline: 2px solid #4b7fff; outline-offset: 1px; }
.gicon {
  width: 64px;
  height: 64px;
  border-radius: 19px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4278fa;
  background: linear-gradient(145deg, #eef5ff, #e9f0fc);
  box-shadow: inset 0 1px 1px #fff, inset 0 0 0 1px #e5efff;
}
.qicon {
  width: 52px;
  height: 52px;
  object-fit: contain;
}
.qlabel {
  font-size: 13px;
  font-weight: 600;
  color: #263655;
  white-space: nowrap;
}
</style>
