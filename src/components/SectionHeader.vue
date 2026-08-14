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
  gap: 6px;
}
.title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
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
