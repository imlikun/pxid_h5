<template>
  <div class="activity-center">
    <!-- 顶部：返回 + 标题 -->
    <TopBar sticky :title="t('activity.title')" :back="goBack" />

    <div class="body">
      <p v-if="loading" class="empty" role="status">{{ t('common.loading') }}</p>
      <div v-else-if="loadError" class="empty" role="status">
        <p>{{ t('activity.unavailable') }}</p>
        <button type="button" class="retry" @click="load">{{ t('discover.dynamic.retry') }}</button>
      </div>
      <p v-else-if="!list.length" class="empty" role="status">{{ t('activity.empty') }}</p>
      <div v-else class="activity-list">
        <ActivityCard v-for="a in list" :key="a.id" :activity="a" show-signup @select="goDetail" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, locale, initLocale, regionFromLocale } from '../i18n'
import TopBar from '../components/TopBar.vue'
import ActivityCard from '../components/ActivityCard.vue'
import { fetchActivities } from '../api/feed'
import { bridge } from '../bridge'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const loadError = ref(false)
let loadGeneration = 0

// 地区由语言映射（2026-08-31 定）：语言同时决定界面语言与内容地区
const currentRegion = computed(() => regionFromLocale(locale.value))

async function load() {
  const generation = ++loadGeneration
  loading.value = true
  loadError.value = false
  list.value = []
  try {
    const result = await fetchActivities({ region: currentRegion.value, allowMockFallback: false })
    if (generation === loadGeneration) list.value = result
  } catch {
    if (generation === loadGeneration) loadError.value = true
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

// 语言变化导致地区变化时，自动重拉活动列表
watch(currentRegion, (newRegion, oldRegion) => {
  if (oldRegion && newRegion !== oldRegion) load()
})

function goDetail(a) { router.push('/activity/' + a.id) }

function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    // 全屏 WebView 第一层关全屏路由；有 H5 内部历史先退上一层（2026-09-08 对接说明）
    if (bridge.isWebViewFirstPage()) app.postMessage('closeWebView')
    else router.back()
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

onMounted(async () => {
  await initLocale() // 语言决定内容地区，见 regionFromLocale
  await load()
})
</script>

<style scoped>
.activity-center {
  min-height: 100vh;
  background: var(--root-page-bg);
  /* 顶部安全区由 Flutter WebView 处理，H5 不额外 padding-top（与发现页/互动消息页一致） */
  padding-bottom: env(safe-area-inset-bottom);
  overflow-x: clip;
}
.body {
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 16px 24px;
}
.activity-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.empty {
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-sub);
  padding: 60px 0;
}
.empty p { margin: 0 0 12px; }
.retry { min-height: 44px; padding: 0 16px; color: var(--brand-ink); background: var(--card); border-radius: var(--radius); }
.retry:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
@media (min-width: 760px) { .activity-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
