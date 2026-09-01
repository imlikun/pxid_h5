<template>
  <div class="interaction">
    <TopBar sticky :title="t('interaction.title')" :back="goBack" />

    <!-- 分类切换：4 个圆形 icon 卡片（评论 / 关注 / 点赞 / 收藏，对齐截图"天阳"样式） -->
    <div class="cats">
      <div
        v-for="c in cats"
        :key="c.key"
        class="cat"
        :class="{ active: activeCat === c.key }"
        @click="activeCat = c.key"
      >
        <span class="cat__icon" :style="{ '--bg': c.bg, '--fg': c.fg }">
          <!-- 评论：对话气泡 -->
          <svg v-if="c.key === 'comment'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <!-- 关注：人 + 加号 -->
          <svg v-else-if="c.key === 'follow'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <!-- 点赞：心形 -->
          <svg v-else-if="c.key === 'like'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <!-- 收藏：星形 -->
          <svg v-else-if="c.key === 'favorite'" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </span>
        <span class="cat__label">{{ t('interaction.tab.' + c.key) }}</span>
      </div>
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
const activeCat = ref('comment')
// 分类：评论 / 关注 / 点赞 / 收藏，每个带软色背景 + 主题色（对齐截图"天阳"圆形 icon 样式）
// comment 同时包含 comment + reply（回复评论也归类到评论通知）
const cats = [
  { key: 'comment', bg: '#E0ECFF', fg: '#4A6CF7' },
  { key: 'follow', bg: '#EBE0FF', fg: '#7C4DFF' },
  { key: 'like', bg: '#FFE0E5', fg: '#E53E5E' },
  { key: 'favorite', bg: '#FFEED4', fg: '#FF9500' },
]
const PAGE_SIZE = 20
const page = ref(1)
const total = ref(0)
const loadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)

const filtered = computed(() => {
  const type = activeCat.value
  if (type === 'comment') return list.value.filter((n) => n.type === 'comment' || n.type === 'reply')
  return list.value.filter((n) => n.type === type)
})

function avatarText(n) {
  if (n.actorName) return n.actorName.slice(0, 1).toUpperCase()
  return { like: '♥', comment: '💬', follow: '＋', favorite: '★', reply: '↩' }[n.type] || '!'
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
/* ---- 分类切换：4 个圆形 icon 卡片 ---- */
.cats {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 16px 12px 14px;
  background: var(--card, #fff);
  border-bottom: 1px solid var(--line, #eee);
}
.cat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  transition: transform 0.15s;
  cursor: pointer;
}
.cat:active { transform: scale(0.94); }
.cat__icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
/* 激活态：浅色背景反转为实心主题色 + 白色 icon */
.cat.active .cat__icon {
  background: var(--fg);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.cat__label {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.2;
  transition: color 0.2s, font-weight 0.2s;
}
.cat.active .cat__label {
  color: var(--fg);
  font-weight: 700;
}
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
