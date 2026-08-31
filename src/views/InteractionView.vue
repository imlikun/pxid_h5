<template>
  <div class="interaction">
    <TopBar sticky :title="t('interaction.title')" :back="goBack" />

    <!-- 分类切换：全部 / 评论 / 赞 / 关注 / 系统（对应通知 type） -->
    <div class="cats">
      <span
        v-for="c in cats"
        :key="c.key"
        class="cat"
        :class="{ active: activeCat === c.key }"
        @click="activeCat = c.key"
      >{{ t('interaction.tab.' + c.key) }}</span>
    </div>

    <!-- 时间线消息列表（对齐车辆消息样式：时间居中 + 左侧系统头像 + 右侧气泡卡片） -->
    <div class="list">
      <div
        v-for="n in filtered"
        :key="n.id"
        class="msg-group"
        :class="{ unread: !n.read }"
        @click="onTap(n)"
      >
        <div class="time">{{ formatDateTime(n.createdAt) }}</div>
        <div class="msg-row">
          <div class="avatar">
            <img v-if="n.actorAvatar" :src="n.actorAvatar" alt="" @error="(e) => handleAvatarError(e, n.actorName)" />
            <template v-else-if="n.type === 'system'">
              <svg class="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </template>
            <span v-else class="avatar__ph">{{ avatarText(n) }}</span>
            <span v-if="!n.read" class="dot"></span>
          </div>
          <div class="bubble">
            <div class="actor">{{ n.actorName || t('interaction.tab.system') }}</div>
            <div class="content">{{ n.content }}</div>
          </div>
        </div>
      </div>
      <div v-if="!filtered.length && !loading" class="empty">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="var(--text-hint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 42H14a4 4 0 01-4-4V18l14-10 14 10v20a4 4 0 01-4 4z"/><path d="M10 18l14-10 14 10"/><path d="M20 42v-12h8v12"/></svg>
        <p>{{ t('interaction.empty') }}</p>
      </div>
      <div v-if="loadingMore" class="loadmore">加载中…</div>
      <div v-else-if="!hasMore && list.length" class="loadmore">没有更多了</div>
    </div>

    <transition name="toast-fade">
      <div v-if="toastMsg" class="itoast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { t } from '../i18n'
import { fetchNotifications, markNotificationRead, markAllRead } from '../api/notifications'
import { cacheNotifications } from '../store/notificationStore'
import { handleAvatarError } from '../utils/avatar'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const activeCat = ref('all')
// 分类 tab：key 即通知 type（'all' 表示全部）；与 interaction.tab.* i18n 键对应
const cats = [
  { key: 'all' },
  { key: 'comment' },
  { key: 'like' },
  { key: 'follow' },
  { key: 'system' },
]
const PAGE_SIZE = 20
const page = ref(1)
const total = ref(0)
const loadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)

const filtered = computed(() => {
  if (activeCat.value === 'all') return list.value
  return list.value.filter((n) => n.type === activeCat.value)
})

function avatarText(n) {
  if (n.actorName) return n.actorName.slice(0, 1).toUpperCase()
  return { like: '♥', comment: '💬', follow: '＋', system: '!' }[n.type] || '!'
}

// 返回上一级：对齐积分页 PointsView.handlePointsBack。
// 原生 App「我的」页用 WebView 打开互动消息并隐藏原生返回键，故 H5 自带返回按钮需主动通知原生关闭 WebView 回「我的」；
// H5 / 浏览器独立预览环境无 window.PXIDApp 时退回 router.back()。
function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    app.postMessage('closeWebView')
  } else {
    router.back()
  }
}

// 时间人性化：刚刚 / x 分钟前 / x 小时前 / 昨天 / M-d / yyyy-MM-dd
function formatTime(s) {
  if (!s) return ''
  const d = new Date(String(s).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(s).slice(0, 16)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  if (diff < 172800) return '昨天'
  const pad = (x) => String(x).padStart(2, '0')
  const now = new Date()
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 时间线样式：08/27 17:12
function formatDateTime(s) {
  if (!s) return ''
  const d = new Date(String(s).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(s).slice(0, 16)
  const pad = (x) => String(x).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function load() {
  loading.value = true
  page.value = 1
  try {
    const r = await fetchNotifications(1, PAGE_SIZE)
    list.value = r.list
    total.value = r.total
    cacheNotifications(r.list)
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const r = await fetchNotifications(page.value + 1, PAGE_SIZE)
    list.value = list.value.concat(r.list)
    total.value = r.total
    page.value += 1
    cacheNotifications(r.list)
  } finally {
    loadingMore.value = false
  }
}

function onScroll() {
  if (loadingMore.value || !hasMore.value) return
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) loadMore()
}

const toastMsg = ref('')
let toastTimer = null
function showToast(m) {
  toastMsg.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 1600)
}

async function onTap(n) {
  if (!n.read) {
    n.read = true
    await markNotificationRead(n.id)
  }
  // 统一进入消息详情页：展示对方发来的内容（评论正文/系统消息）+ 关联原动态预览，
  // 详情页内再提供"查看原动态 / 去TA主页"等后续动作。
  router.push('/interaction/' + n.id)
}

async function onMarkAll() {
  list.value.forEach((n) => (n.read = true))
  await markAllRead()
}

onMounted(() => {
  load()
  window.addEventListener('scroll', onScroll, { passive: true })
})
// App.vue 用 <keep-alive> 缓存全部页面：再次进入（如新产生通知）时重新拉列表
onActivated(load)
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.interaction {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}
/* 防御性覆盖：确保顶栏背景为浅色，避免某些 WebView/深色模式下被渲染成黑色 */
:deep(.tb-bar) {
  background: var(--card, #ffffff);
}
/* ---- 时间线消息列表 ---- */
.list {
  padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
  background: var(--bg, #f7f8fa);
  min-height: calc(100vh - 100px);
}
/* ---- 分类切换 tab ---- */
.cats {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card, #fff);
  border-bottom: 1px solid var(--line, #eee);
  overflow-x: auto;
  scrollbar-width: none;
}
.cats::-webkit-scrollbar { display: none; }
.cat {
  flex: none;
  font-size: 14px;
  color: var(--text-sub);
  background: var(--surface-2, #f0f1f3);
  border-radius: 16px;
  padding: 6px 16px;
  font-weight: 500;
  line-height: 1;
  transition: all 0.15s ease;
}
.cat.active {
  color: #fff;
  background: var(--brand, #4A6CF7);
  font-weight: 600;
}
.cat:active { transform: scale(0.96); }
.msg-group {
  margin-bottom: 18px;
}
.msg-group:last-child {
  margin-bottom: 0;
}
.msg-group .time {
  text-align: center;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 10px;
}
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* ---- 头像（车辆消息：浅灰圆底 + 白色铃铛） ---- */
.avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ebedf2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
  border: 2px solid #fff;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar .bell {
  width: 20px;
  height: 20px;
  color: #9ca3af;
}
.avatar__ph {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand, #4A6CF7);
  letter-spacing: -0.5px;
}

/* ---- 气泡卡片 ---- */
.bubble {
  flex: 1;
  min-width: 0;
  background: var(--card, #fff);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: background 0.15s;
}
.msg-group:active .bubble {
  background: #f9f9fb;
}
.msg-group.unread .bubble {
  background: #fff;
}
.actor {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}
.msg-group.unread .actor {
  color: var(--brand, #4A6CF7);
}
.content {
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.5;
  word-break: break-word;
}

/* ---- 未读红点 ---- */
.dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--price, #E53E3E);
  border: 2px solid var(--bg, #f7f8fa);
  box-shadow: 0 1px 3px rgba(229, 62, 62, 0.35);
}

/* ---- 空状态 ---- */

/* ---- 空状态 ---- */
.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-hint);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty p {
  font-size: 14px;
  margin: 0;
}

/* ---- 分页加载提示 ---- */
.loadmore {
  text-align: center;
  padding: 14px 0 22px;
  font-size: 12px;
  color: var(--text-hint);
}

/* ---- 轻提示 toast ---- */
.itoast {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 22px;
  z-index: 9999;
  white-space: nowrap;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
}
</style>
