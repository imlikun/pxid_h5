<template>
  <div class="sheader">
    <div class="left">
      <span class="title">{{ title }}</span>
      <span v-if="sub" class="sub">{{ sub }}</span>
    </div>
    <div v-if="more" class="more" @click="$emit('more')">{{ more }} &gt;</div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  sub: String,
  more: String,
})
defineEmits(['more'])
</script>

<style scoped>
.sheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 12px 10px;
}
.left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  position: relative;
  padding-left: 10px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--text);
}
.title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 15px;
  border-radius: 2px;
  background: var(--brand);
}
.sub {
  font-size: 12px;
  color: var(--price);
}
.more {
  font-size: 13px;
  color: var(--text-hint);
}
</style>
