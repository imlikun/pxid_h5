<template>
  <div class="sheader">
    <div class="left">
      <span class="bar"></span>
      <span class="title">{{ title }}</span>
      <span v-if="sub" class="sub">{{ sub }}</span>
    </div>
    <div v-if="more" class="more" @click="$emit('more')">{{ more }} ›</div>
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
  padding: 14px 12px 8px;
}
.left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bar {
  width: 3px;
  height: 14px;
  background: var(--brand);
  border-radius: 2px;
}
.title {
  font-size: 16px;
  font-weight: 700;
}
.sub {
  font-size: 12px;
  color: var(--price);
}
.more {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
