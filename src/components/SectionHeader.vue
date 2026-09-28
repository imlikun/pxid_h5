<template>
  <div class="sheader">
    <div class="left">
      <span class="title">{{ title }}</span>
      <span v-if="sub" class="sub">{{ sub }}</span>
    </div>
    <button v-if="more" type="button" class="more" @click="$emit('more')">{{ more }} <span aria-hidden="true">›</span></button>
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
  padding: 22px 14px 11px;
}
.left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.sub {
  font-size: 10px;
  color: #f05b60;
  background: #fff0f0;
  border: 1px solid #ffd6d8;
  padding: 3px 5px;
  border-radius: 999px;
  white-space: nowrap;
}
.more {
  font-size: 12px;
  color: #65758f;
  background: #fff;
  border: 1px solid #edf1fa;
  border-radius: 999px;
  padding: 5px 8px;
  white-space: nowrap;
  cursor: pointer;
}
</style>
