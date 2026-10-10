<template>
  <div class="activity-center">
    <!-- 顶部：返回 + 标题 -->
    <TopBar sticky :title="t('activity.title')" :back="goBack" />

    <div class="body">
      <nav class="activity-tabs" :aria-label="t('activity.title')">
        <button type="button" :aria-pressed="tab === 'all'" :class="{ active: tab === 'all' }" @click="setTab('all')">{{ t('activity.all') }}</button>
        <button type="button" :aria-pressed="tab === 'joined'" :class="{ active: tab === 'joined' }" @click="setTab('joined')">{{ t('activity.signed') }}</button>
      </nav>
      <p v-if="loading && !list.length" class="empty" role="status">{{ t('common.loading') }}</p>
      <div v-else-if="needsLogin" class="empty" role="status">
        <p>{{ t('activity.loginHint') }}</p>
        <button type="button" class="retry" @click="loginAndLoad">{{ t('activity.loginAction') }}</button>
      </div>
      <div v-else-if="loadError" class="empty" role="status">
        <p>{{ t('activity.unavailable') }}</p>
        <button type="button" class="retry" @click="load">{{ t('discover.dynamic.retry') }}</button>
      </div>
      <p v-else-if="!list.length" class="empty" role="status">{{ t(tab === 'joined' ? 'activity.joinedEmpty' : 'activity.empty') }}</p>
      <div v-else class="activity-list">
        <ActivityCard v-for="a in list" :key="a.id" :activity="a" show-signup @select="goDetail" />
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onDeactivated, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, locale, initLocale, regionFromLocale } from '../i18n'
import TopBar from '../components/TopBar.vue'
import ActivityCard from '../components/ActivityCard.vue'
import { fetchActivities, fetchJoinedActivities } from '../api/feed'
import { bridge } from '../bridge'
import { requireLogin } from '../utils/auth'

const route = useRoute()
const router = useRouter()
const tab = computed(() => route.query.tab === 'joined' ? 'joined' : 'all')
const list = ref([])
const loading = ref(true)
const loadError = ref(false)
const needsLogin = ref(false)
let loadGeneration = 0
let active = false, initialized = false

// 地区由语言映射（2026-08-31 定）：语言同时决定界面语言与内容地区
const currentRegion = computed(() => regionFromLocale(locale.value))

async function load({ keepList = false } = {}) {
  const generation = ++loadGeneration
  const selected = tab.value
  loading.value = true
  loadError.value = false
  needsLogin.value = false
  // Native login/logout may occur while this page is kept alive. Private
  // records must not remain visible while a fresh account token is checked.
  if (!keepList || selected === 'joined') list.value = []
  try {
    const result = selected === 'joined' ? await fetchJoinedActivities() : await fetchActivities({ region: currentRegion.value, allowMockFallback: false })
    if (generation === loadGeneration) list.value = result
  } catch (error) {
    if (generation === loadGeneration) {
      list.value = []
      needsLogin.value = selected === 'joined' && error.status === 401
      loadError.value = !needsLogin.value
    }
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

// 语言变化导致地区变化时，自动重拉活动列表
watch(currentRegion, (newRegion, oldRegion) => {
  if (active && initialized && tab.value === 'all' && oldRegion && newRegion !== oldRegion) load()
})
watch(tab, () => { if (active && initialized && route.path === '/activity-center') load() })
function setTab(value) {
  if (tab.value !== value) router.replace({ path: route.path, query: { ...route.query, tab: value } })
}
async function loginAndLoad() { if (await requireLogin()) await load() }
function onVisible() {
  if (active && initialized && route.path === '/activity-center' && document.visibilityState === 'visible' && !loading.value) load({ keepList: true })
}

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
  active = true
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
  await initLocale() // 语言决定内容地区，见 regionFromLocale
  if (!active || initialized) return
  initialized = true
  await load()
})
onActivated(() => {
  active = true
  if (initialized) load({ keepList: true })
  else initLocale().then(() => { if (active && !initialized) { initialized = true; load() } })
})
onDeactivated(() => { active = false; ++loadGeneration })
onUnmounted(() => {
  active = false
  ++loadGeneration
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('focus', onVisible)
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
.activity-tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.activity-tabs button { min-height: 44px; padding: 0 16px; border-radius: 12px; font-size: 14px; white-space: nowrap; color: var(--text-sub); }
.activity-tabs button.active { color: var(--brand-ink); background: var(--brand-soft); font-weight: 600; }
.activity-tabs button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
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
