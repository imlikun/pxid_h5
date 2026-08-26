<template>
  <div class="rec">
    <TopBar :title="t('points.records')" />

    <div v-if="loading" class="rec__state">{{ t('featured.loading') }}</div>
    <div v-else-if="!list.length" class="rec__state">{{ t('points.record.empty') }}</div>

    <div v-else class="rec__list">
      <div v-for="r in list" :key="r.id" class="item">
        <img class="item__img" :src="r.cover" :alt="r.productName" loading="lazy" @error="onImgErr" />
        <div class="item__body">
          <div class="item__top">
            <span class="item__name">{{ r.productName }}</span>
            <span class="item__badge" :class="'is-' + r.status">{{ statusText(r.status) }}</span>
          </div>
          <div class="item__meta">{{ t('points.record.cost') }}：<b>{{ r.pointsCost }}</b> · {{ r.createdAt }}</div>
          <div v-if="r.trackingNo" class="item__track">{{ t('points.record.tracking') }}：{{ r.trackingNo }}</div>
          <div v-if="r.shippingAddress" class="item__addr">{{ r.shippingName }} · {{ r.shippingPhone }} · {{ r.shippingAddress }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { t } from '../i18n'
import { fetchMyExchanges } from '../api/growth'
import TopBar from '../components/TopBar.vue'

const list = ref([])
const loading = ref(true)
const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23eef1f6"/%3E%3C/svg%3E'

function onImgErr(e) {
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}
function statusText(s) {
  return ({
    pending: t('points.record.status.pending'),
    shipped: t('points.record.status.shipped'),
    done: t('points.record.status.done'),
    cancelled: t('points.record.status.cancelled'),
  })[s] || s
}

async function load() {
  loading.value = true
  try {
    const r = await fetchMyExchanges()
    list.value = r.list || []
  } catch (e) {
    list.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.rec {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 16px;
}
.rec__state {
  padding: 48px 16px;
  text-align: center;
  color: var(--text-hint);
  font-size: 14px;
}
.rec__list {
  padding: 12px 16px 0;
}
.item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--card);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}
.item__img {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
  background: var(--bg);
}
.item__body {
  flex: 1;
  min-width: 0;
}
.item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.item__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item__badge {
  flex: none;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.item__badge.is-pending { background: #fff3e0; color: #e8850b; }
.item__badge.is-shipped { background: #e6f0ff; color: #2f6bff; }
.item__badge.is-done { background: #e8f7ee; color: #1f9d55; }
.item__badge.is-cancelled { background: #f0f0f0; color: #999; }
.item__meta {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-sub);
}
.item__meta b {
  color: var(--price);
}
.item__track {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
}
.item__addr {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-hint);
  word-break: break-all;
}
</style>
