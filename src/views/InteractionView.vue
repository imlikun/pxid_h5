<template>
  <div class="interaction">
    <TopBar sticky :title="t('interaction.title')" :back="goBack">
      <template #right>
        <!-- 轻量筛选入口：互动消息是「时间驱动」的，默认全部混合流；按类型筛选属低频需求，收进浮层不常驻 tab -->
        <span class="filter-btn press" @click="showFilter = !showFilter">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <i v-if="activeCat !== 'all'" class="filter-dot"></i>
        </span>
      </template>
    </TopBar>

    <!-- 筛选浮层 -->
    <transition name="fd">
      <div v-if="showFilter" class="fmask" @click="showFilter = false">
        <div class="fmenu" @click.stop>
          <button
            v-for="o in filterOpts"
            :key="o.key"
            class="fitem"
            :class="{ on: activeCat === o.key }"
            @click="pickFilter(o.key)"
          >
            <i class="fdot" :style="{ background: o.color }"></i>
            <span class="ftext">{{ t('interaction.filter.' + o.key) }}</span>
            <svg v-if="activeCat === o.key" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- 混合时间线：评论/赞/关注/收藏/提到 按时间倒序混合，右侧标签标明类型 -->
    <div class="list">
      <div
        v-for="g in grouped"
        :key="g.key"
        class="msg"
        :class="{ unread: g.unread, open: expanded === g.key }"
      >
        <div class="time">{{ formatDateTime(g.createdAt) }}</div>
        <div class="row">
          <!-- 头像：聚合时最多堆叠 3 个 -->
          <div class="avatars">
            <span
              v-for="(a, i) in g.actors"
              :key="i"
              class="ava"
              :class="{ stacked: g.count > 1 }"
              :style="{ zIndex: 10 - i, marginLeft: g.count > 1 && i > 0 ? '-12px' : '0' }"
            >
              <img v-if="a.avatar" :src="a.avatar" alt="" @error="(e) => handleAvatarError(e, a.name)" />
              <span v-else class="ava__ph">{{ (a.name || '?').slice(0, 1).toUpperCase() }}</span>
            </span>
            <span v-if="g.unread" class="dot"></span>
          </div>

          <div class="bubble" @click="toggle(g)">
            <div class="head">
              <span class="actor">{{ g.title }}</span>
              <!-- 右侧类型标签：同色系小圆点 + 文字，避免 4 色块炸屏 -->
              <span class="pill" :style="{ '--c': metaOf(g.type).color, '--bg': metaOf(g.type).bg }">
                <i class="pdot"></i>{{ t(metaOf(g.type).labelKey) }}
              </span>
            </div>
            <div class="content">{{ g.summary }}</div>

            <!-- inline 展开：评论正文 + 关联原动态预览。砍掉「消息详情页」这一跳，5 层压到 4 层 -->
            <div v-if="expanded === g.key" class="more">
              <div v-if="g.body" class="quote">{{ g.body }}</div>

              <div v-if="g.target" class="post" @click.stop="goPost(g)">
                <img v-if="g.target.cover" class="post__cover" :src="g.target.cover" alt="" />
                <div class="post__body">
                  <div class="post__title">{{ g.target.title }}</div>
                  <div class="post__author">{{ g.target.author }}</div>
                </div>
              </div>
              <div v-else-if="g.targetType === 'feed'" class="post post--missing">{{ t('interaction.postMissing') }}</div>

              <div v-if="g.type === 'comment' || g.type === 'reply' || g.type === 'mention' || g.type === 'follow'" class="acts">
                <button v-if="g.type !== 'follow'" class="act" @click.stop="goPost(g)">{{ t('interaction.reply') }}</button>
                <button v-else class="act" @click.stop="goProfile(g)">{{ t('interaction.goProfile') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!grouped.length && !loading" class="empty">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="var(--text-hint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 42H14a4 4 0 0 1-4-4V18l14-10 14 10v20a4 4 0 0 1-4 4z"/><path d="M10 18l14-10 14 10"/><path d="M20 42v-12h8v12"/></svg>
        <p>{{ activeCat === 'all' ? t('interaction.empty') : t('interaction.emptyFiltered') }}</p>
      </div>
      <div v-if="loadingMore" class="loadmore">{{ t('interaction.loading') }}</div>
      <div v-else-if="!hasMore && grouped.length" class="loadmore">{{ t('interaction.noMore') }}</div>
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
const showFilter = ref(false)
const expanded = ref('')

// 类型元数据：统一驱动「右侧标签配色 + 文案 + 筛选浮层」
const TYPES = {
  comment: { color: '#4A6CF7', bg: '#E0ECFF', labelKey: 'interaction.tab.comment' },
  reply: { color: '#4A6CF7', bg: '#E0ECFF', labelKey: 'interaction.tab.comment' },
  like: { color: '#E53E5E', bg: '#FFE0E5', labelKey: 'interaction.tab.like' },
  favorite: { color: '#FF9500', bg: '#FFEED4', labelKey: 'interaction.tab.favorite' },
  follow: { color: '#7C4DFF', bg: '#EBE0FF', labelKey: 'interaction.tab.follow' },
  mention: { color: '#00B8A9', bg: '#D6F7F3', labelKey: 'interaction.tab.mention' },
  system: { color: '#8A94A6', bg: '#EDEFF3', labelKey: 'interaction.tab.system' },
}
function metaOf(type) {
  return TYPES[type] || TYPES.system
}
// 筛选浮层选项（「全部」+ 4 类）
const filterOpts = [
  { key: 'all', color: '#8A94A6' },
  { key: 'comment', color: '#4A6CF7' },
  { key: 'like', color: '#E53E5E' },
  { key: 'follow', color: '#7C4DFF' },
  { key: 'favorite', color: '#FF9500' },
]

const PAGE_SIZE = 20
const page = ref(1)
const total = ref(0)
const loadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)

const filtered = computed(() => {
  const c = activeCat.value
  if (c === 'all') return list.value
  // 评论类同时收 comment + reply（回复评论也归到「评论」）
  if (c === 'comment') return list.value.filter((n) => n.type === 'comment' || n.type === 'reply')
  return list.value.filter((n) => n.type === c)
})

// 动作摘要：按 type 走 i18n，而不是直接显示后端存的中文 content（否则切语言文案不变）
function actionText(n) {
  if (n.type === 'like') return t('interaction.action.like')
  if (n.type === 'comment') return t('interaction.action.comment')
  if (n.type === 'reply') return t('interaction.action.reply')
  if (n.type === 'follow') return t('interaction.action.follow')
  if (n.type === 'favorite') return t('interaction.action.favorite')
  if (n.type === 'mention') return t('interaction.action.mention')
  return t('interaction.action.system')
}

// 正文：后端 content 形如「评论了你的动态：正文」，剥掉动作前缀只留正文
function bodyOf(n) {
  const c = String(n.content || '')
  const i = c.search(/[：:]/)
  return i < 0 ? '' : c.slice(i + 1).trim()
}

// 聚合：同一帖子上的连续点赞/收藏合并成一条，避免点赞把评论冲下去
const grouped = computed(() => {
  const out = []
  for (const n of filtered.value) {
    const mergeable = n.type === 'like' || n.type === 'favorite'
    const prev = out[out.length - 1]
    if (mergeable && prev && prev.type === n.type && prev.targetId && String(prev.targetId) === String(n.targetId)) {
      prev.items.push(n)
      if (!n.read) prev.unread = true
      continue
    }
    out.push({
      key: n.id,
      type: n.type,
      targetType: n.targetType,
      targetId: n.targetId,
      target: n.target || null,
      createdAt: n.createdAt,
      unread: !n.read,
      items: [n],
    })
  }
  out.forEach((g) => {
    const first = g.items[0]
    g.count = g.items.length
    g.actors = g.items.slice(0, 3).map((i) => ({ name: i.actorName, avatar: i.actorAvatar }))
    g.summary = actionText(first)
    g.body = g.count > 1 ? '' : bodyOf(first)
    if (g.count > 1) {
      g.title = g.type === 'like'
        ? `${first.actorName || ''} ${t('interaction.group.like', { n: g.count })}`
        : `${first.actorName || ''} ${t('interaction.group.favorite', { n: g.count })}`
    } else {
      g.title = first.actorName || t('interaction.tab.system')
    }
  })
  return out
})

function pickFilter(key) {
  activeCat.value = key
  showFilter.value = false
  expanded.value = ''
}

// 点击气泡 inline 展开（不再跳转消息详情页），同时把组内所有通知标已读
async function toggle(g) {
  if (expanded.value === g.key) {
    expanded.value = ''
    return
  }
  expanded.value = g.key
  if (g.unread) {
    g.unread = false
    g.items.forEach((n) => {
      n.read = true
      markNotificationRead(n.id)
    })
  }
}

function goPost(g) {
  if (!g.target || !g.target.id) return
  router.push('/feed/' + g.target.id)
}

function goProfile(g) {
  const d = g.items[0] && g.items[0].actorDevice
  if (d) router.push('/user/' + d)
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

async function onMarkAll() {
  list.value.forEach((n) => (n.read = true))
  await markAllRead()
  showToast(t('interaction.markAllDone'))
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

/* ---- 顶栏右侧筛选按钮 ---- */
.filter-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--text, #1a1a1a);
}
.filter-btn:active {
  background: rgba(0, 0, 0, 0.05);
}
.filter-dot {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand, #4A6CF7);
}

/* ---- 筛选浮层 ---- */
.fmask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 60;
}
.fmenu {
  position: absolute;
  top: 52px;
  right: 10px;
  min-width: 156px;
  background: var(--card, #fff);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
.fitem {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 10px;
  border: 0;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text, #1a1a1a);
  cursor: pointer;
}
.fitem:active {
  background: var(--surface-2, #f0f1f3);
}
.fitem.on {
  color: var(--brand, #4A6CF7);
  font-weight: 600;
}
.fdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.ftext {
  flex: 1;
  text-align: left;
}
.fd-enter-active,
.fd-leave-active {
  transition: opacity 0.18s ease;
}
.fd-enter-from,
.fd-leave-to {
  opacity: 0;
}

/* ---- 时间线消息列表 ---- */
.list {
  padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
  background: var(--bg, #f7f8fa);
  min-height: calc(100vh - 100px);
}
.msg {
  margin-bottom: 18px;
}
.msg:last-child {
  margin-bottom: 0;
}
.msg .time {
  text-align: center;
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 10px;
}
.row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* ---- 头像（可堆叠） ---- */
.avatars {
  position: relative;
  display: flex;
  align-items: center;
  flex: none;
}
.ava {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ebedf2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #fff;
}
.ava.stacked {
  width: 32px;
  height: 32px;
}
.ava img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ava__ph {
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
.msg:active .bubble {
  background: #f9f9fb;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.actor {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg.unread .actor {
  color: var(--brand, #4A6CF7);
}

/* 右侧类型标签：浅色底 + 类型色小圆点，安静不抢主内容 */
.pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--bg);
  color: var(--c);
  font-weight: 600;
}
.pdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c);
}
.content {
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.5;
  word-break: break-word;
}

/* ---- inline 展开区 ---- */
.more {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line, #eee);
}
.quote {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text, #1a1a1a);
  background: var(--surface-2, #f4f5f7);
  border-left: 3px solid var(--brand, #4A6CF7);
  border-radius: 6px;
  padding: 8px 10px;
  word-break: break-word;
}
.post {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 8px;
  border-radius: 10px;
  background: var(--surface-2, #f4f5f7);
}
.post:active {
  background: #eceef2;
}
.post__cover {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  flex: none;
  background: #e3e5ea;
}
.post__body {
  flex: 1;
  min-width: 0;
}
.post__title {
  font-size: 13px;
  color: var(--text, #1a1a1a);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post__author {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-hint);
}
.post--missing {
  color: var(--text-hint);
  font-size: 13px;
  justify-content: center;
}
.acts {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.act {
  border: 1px solid var(--line, #e3e5ea);
  background: var(--card, #fff);
  color: var(--text-sub);
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 16px;
  cursor: pointer;
}
.act:active {
  background: var(--surface-2, #f0f1f3);
}

/* ---- 未读红点 ---- */
.dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--price, #E53E3E);
  border: 2px solid var(--bg, #f7f8fa);
  box-shadow: 0 1px 3px rgba(229, 62, 62, 0.35);
  z-index: 20;
}

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
