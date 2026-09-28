<template>
  <div class="sheader">
    <div class="left">
      <div class="heading"><span class="title">{{ title }}</span>
        <span v-if="sub" class="sub" :class="{ 'sub--promo': promo }"><svg v-if="promo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 1.5c.6 4.8-1.1 5.6-1.2 8.3-1.8-1.3-2.5-3-2.4-5.1C6.1 7.5 3.7 10.8 3.7 15a8.3 8.3 0 0 0 16.6 0c0-3.5-2.3-5.8-3.7-7.6-.1 2.1-1 3.4-2.2 4.1.2-3.9-1.1-6.6-2.2-10Z"/></svg>{{ sub }}</span>
      </div>
      <small v-if="description" class="description">{{ description }}</small>
    </div>
    <button v-if="more" type="button" class="more" @click="$emit('more')">{{ more }} <span aria-hidden="true">›</span></button>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  sub: String,
  description: String,
  promo: Boolean,
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
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
}
.heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
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
.sub--promo {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 9px 4px 7px;
  font-size: 11px;
  font-weight: 700;
  color: #f1434b;
  background: #fff0ef;
  border: 1px solid #ffbbc0;
  box-shadow: 0 2px 6px rgba(238, 64, 78, .12);
}
.sub--promo svg { width: 13px; height: 13px; fill: currentColor; }
.description { color: #8794af; font-size: 11px; line-height: 1.3; }
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
