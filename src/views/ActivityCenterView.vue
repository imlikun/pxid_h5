<template>
  <div class="activity-center">
    <!-- 顶部：返回 + 标题 -->
    <TopBar sticky :title="t('activity.title')" :back="goBack" />

    <div class="body">
      <div v-if="loading" class="empty">{{ t('common.loading') }}</div>
      <div v-else-if="!list.length" class="empty">{{ t('activity.empty') }}</div>
      <div
        v-for="a in list"
        :key="a.id"
        class="act-card press fade-up"
        @click="goDetail(a)"
      >
        <img class="cover" :src="a.cover" :alt="a.title" />
        <div class="info">
          <div class="title2">{{ a.title }}</div>
          <div class="meta">
            <span v-if="dateRange(a)">{{ dateRange(a) }}</span>
            <span v-if="a.location"> · {{ a.location }}</span>
          </div>
          <div class="meta2">{{ signupText(a) }}</div>
        </div>
        <span class="go">{{ t('activity.view') }}</span>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, locale, initLocale, regionFromLocale } from '../i18n'
import TopBar from '../components/TopBar.vue'
import { fetchActivities } from '../api/feed'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const router = useRouter()
const list = ref([])
const loading = ref(false)

// 地区由语言映射（2026-08-31 定）：语言同时决定界面语言与内容地区
const currentRegion = computed(() => regionFromLocale(locale.value))

async function load() {
  loading.value = true
  list.value = await fetchActivities({ region: currentRegion.value })
  loading.value = false
}

// 语言变化导致地区变化时，自动重拉活动列表
watch(currentRegion, (newRegion, oldRegion) => {
  if (oldRegion && newRegion !== oldRegion) load()
})

// 日期展示：MM-DD ~ MM-DD（跨年带年份）
function dateRange(a) {
  const s = String(a.startDate || a.start_date || '')
  const e = String(a.endDate || a.end_date || '')
  const f = (d) => {
    const m = d.match(/^\d{4}-(\d{2})-(\d{2})/)
    return m ? m[1] + '-' + m[2] : d
  }
  if (s && e && s !== e) return f(s) + ' ~ ' + f(e)
  if (s) return f(s)
  return ''
}

function signupText(a) {
  const n = a.signupCount || 0
  const q = a.quota || 0
  if (q > 0) return `${n} / ${q}`
  if (n > 0) return `${n} 人报名`
  return ''
}

function goDetail(a) { router.push('/activity/' + a.id) }

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

const toast = ref('')

onMounted(async () => {
  await initLocale() // 语言决定内容地区，见 regionFromLocale
  await load()
})
</script>

<style scoped>
.activity-center {
  min-height: 100vh;
  background: var(--bg);
  /* 顶部安全区由 Flutter WebView 处理，H5 不额外 padding-top（与发现页/互动消息页一致） */
  padding-bottom: env(safe-area-inset-bottom);
  overflow-x: hidden;
}
.body {
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.act-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 10px;
}
.cover {
  width: 96px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
}
.info {
  flex: 1;
  min-width: 0;
}
.title2 {
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 6px;
  line-height: 1.4;
}
.meta2 {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 4px;
}
.go {
  flex: none;
  font-size: 12px;
  color: var(--brand);
}
.empty {
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
  padding: 60px 0;
}
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: var(--radius);
  z-index: 100;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
