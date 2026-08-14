<template>
  <div class="faq">
    <div class="faq__q">
      <span class="badge badge--q">Q</span>
      <span class="txt">{{ faq.q }}</span>
    </div>
    <div class="faq__a">
      <span class="badge badge--a">A</span>
      <span class="summary">{{ faq.a }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  faq: { type: Object, required: true },
})
</script>

<style scoped>
.faq {
  background: var(--card);
  padding: 14px;
  border-bottom: 1px solid var(--line);
}
.faq:last-child {
  border-bottom: none;
}
.faq__q,
.faq__a {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.faq__a {
  margin-top: 8px;
}
.badge {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  margin-top: 1px;
}
.badge--q {
  background: var(--brand);
  color: #ffffff;
}
.badge--a {
  background: #d1d5db;
  color: #ffffff;
}
.txt {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.summary {
  flex: 1;
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
