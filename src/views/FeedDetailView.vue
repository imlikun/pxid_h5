<template>
  <div class="detail" v-if="item">
    <!-- 顶部 -->
    <TopBar sticky :title="isActivity ? t('feed.detail.title.activity') : t('feed.detail.title.content')">
      <template #right>
        <span class="more press" @click="showReport = true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </span>
        <span class="share press" @click="onShare">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        </span>
      </template>
    </TopBar>

    <!-- 作者卡 -->
    <div class="author fade-up stagger-1">
      <img class="avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
      <div class="meta">
        <div class="name">
          {{ item.author || t('feed.author.official') }}
          <span v-if="isOfficial" class="badge-official">{{ t('feed.badge.official') }}</span>
        </div>
        <div class="time">{{ item.time || item.date }}</div>
      </div>
      <button
        v-if="!isOfficial"
        class="follow press"
        :class="{ followed }"
        @click="onFollow"
      >{{ followed ? t('feed.follow.following') : t('feed.follow.follow') }}</button>
    </div>

    <!-- 标题 -->
    <h1 class="title fade-up stagger-2">{{ item.title }}</h1>

    <!-- 活动报名卡 -->
    <div v-if="isActivity" class="signup">
      <div class="signup__row">
        <span class="signup__k">{{ t('feed.signup.time') }}</span>
        <span class="signup__v">{{ item.date }}</span>
      </div>
      <div class="signup__row">
        <span class="signup__k">{{ t('feed.signup.place') }}</span>
        <span class="signup__v">{{ t('feed.signup.placeVal') }}</span>
      </div>
      <button class="signup__btn press" @click="onActivitySignup">{{ t('feed.signup.btn') }}</button>
    </div>

    <!-- 视频播放器 -->
    <div v-if="item && item.videoUrl" class="vd-video fade-up stagger-2">
      <video
        class="vd-video__el"
        :src="videoSrc"
        :poster="videoPoster"
        controls
        playsinline
        preload="metadata"
      ></video>
    </div>

    <!-- 图片九宫格 -->
    <div class="gallery fade-up stagger-3" :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }">
      <img
        v-for="(img, i) in images"
        :key="i"
        class="gallery__img"
        :class="{ single: gridCols === 1 }"
        :src="img"
        :alt="item.title"
        @click="onPreview(img)"
      />
    </div>

    <!-- 正文富文本 -->
    <div class="content fade-up stagger-4">
      <span
        v-for="(seg, i) in segments"
        :key="i"
        :class="segClass(seg)"
        @click="segClick(seg)"
      >{{ seg.v }}</span>
    </div>

    <!-- 标签 / 车型 -->
    <div class="tags fade-up stagger-5" v-if="tagList.length">
      <span
        v-for="(tg, i) in tagList"
        :key="i"
        class="tag"
        :class="{ car: tg.car }"
        @click="tg.car ? onCar(tg.v) : onTopic(tg.v)"
      >#{{ tg.v }}</span>
    </div>

    <!-- 种草商品卡 -->
    <div v-if="item.productCard" class="prod fade-up stagger-6 press" @click="onProductCard">
      <img class="prod__img" :src="item.productCard.cover" :alt="item.productCard.name" />
      <div class="prod__info">
        <div class="prod__name">{{ item.productCard.name }}</div>
        <div class="prod__price">¥{{ item.productCard.price }}</div>
      </div>
      <span class="prod__go">{{ t('feed.goView') }} &gt;</span>
    </div>

    <!-- 评论区 -->
    <div class="comments fade-up stagger-7" ref="commentsBox">
      <div class="comments__head">{{ t('feed.commentsCount', { n: commentCount }) }}</div>
      <div v-if="comments.length === 0" class="comments__empty">{{ t('feed.commentsEmpty') }}</div>
      <div v-for="c in comments" :key="c.id" class="cmt">
        <img class="cmt__avatar" :src="c.avatar || defaultAvatar" :alt="c.author" />
        <div class="cmt__main">
          <div class="cmt__name">{{ c.author }}</div>
          <div class="cmt__text">{{ c.content }}</div>
          <div class="cmt__foot">
            <span class="cmt__time">{{ c.time }}</span>
            <span class="cmt__reply" @click="startReply(c)">{{ t('feed.reply') }}</span>
            <span class="cmt__like pop" :class="{ liked: c.isLiked }" @click="onCommentLike(c)">
              <svg viewBox="0 0 24 24" width="14" height="14" :fill="c.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>{{ c.likes }}</span>
            </span>
          </div>
          <div v-if="c.replies && c.replies.length" class="replies">
            <div v-for="r in c.replies" :key="r.id" class="reply" @click="startReply(c, r)">
              <img class="reply__avatar" :src="r.avatar || defaultAvatar" :alt="r.author" />
              <div class="reply__main">
                <div class="reply__name">{{ r.author }}<span v-if="r.replyTo" class="reply__to"> 回复 {{ r.replyTo }}</span></div>
                <div class="reply__text">{{ r.content }}</div>
                <div class="reply__time">{{ r.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入栏：聚焦时变固定底部栏并顶到键盘上方（修复评论框被输入法遮挡） -->
      <div
        class="cinput"
        :class="{ 'cinput--fixed': commenting }"
        :style="commenting && !KEYBOARD_ENV ? { bottom: kbH + ACTIONS_HEIGHT + 'px' } : null"
      >
        <div v-if="replyTo" class="cinput__reply">回复 {{ replyTo.name }} <span class="cinput__cancel" @click="replyTo = null">{{ t('feed.cancel') }}</span></div>
        <input
          ref="commentInput"
          v-model="commentText"
          class="cinput__field"
          :placeholder="replyTo ? ('回复 ' + replyTo.name + '：') : t('feed.inputPlaceholder')"
          @focus="onCommentFocus"
          @blur="onCommentBlur"
          @keyup.enter="submitComment"
        />
        <button class="cinput__send press" @click="submitComment">{{ t('feed.send') }}</button>
      </div>
    </div>

    <!-- 相关推荐 -->
    <div class="related fade-up stagger-8" v-if="related.length">
      <div class="related__head">{{ t('feed.related') }}</div>
      <div class="related__grid">
        <div
          v-for="r in related"
          :key="r.id"
          class="rcard press"
          @click="router.push('/feed/' + r.id)"
        >
          <img class="rcard__img" :src="r.cover" :alt="r.title" />
          <div class="rcard__title">{{ r.title }}</div>
          <div class="rcard__foot">
            <span class="rcard__author">{{ r.author }}</span>
            <span class="rcard__like">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              {{ r.likes }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 加载中（切帖/首屏先显示，避免闪“内容不存在或已下架”空态） -->
  <div v-else-if="loading" class="loading">
    <div class="loading__spin"></div>
    <div class="loading__txt">{{ t('common.loading') }}</div>
  </div>

  <!-- 空态（仅加载完成且内容确实为空才显示） -->
  <div v-else class="empty">
    <div class="empty__icon">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
    </div>
    <div class="empty__txt">{{ t('feed.notFound') }}</div>
    <button class="empty__back" @click="router.back()">{{ t('feed.back') }}</button>
  </div>

  <!-- 底部互动栏 -->
  <div v-if="item" class="actions" v-show="!commenting">
    <button class="act pop press" :class="{ liked, on: liked }" @click="onLike">
      <svg viewBox="0 0 24 24" width="22" height="22" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
      <span>{{ likeCount }}</span>
    </button>
    <button class="act pop press" @click="onCommentBtn">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
      <span>{{ commentCount }}</span>
    </button>
    <button class="act pop press" :class="{ collected, on: collected }" @click="onCollect">
      <svg viewBox="0 0 24 24" width="22" height="22" :fill="collected ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      <span>{{ collected ? t('feed.collect.collected') : t('feed.collect.collect') }}</span>
    </button>
    <button class="act pop press" @click="onShare">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
      <span>{{ t('feed.share') }}</span>
    </button>
  </div>

  <!-- 举报弹层 -->
  <transition name="fade">
    <div v-if="showReport" class="sheet-mask" @click="showReport = false">
      <div class="sheet" @click.stop>
        <div class="sheet__title">{{ t('feed.reportTitle') }}</div>
        <div v-for="r in reportReasons" :key="r" class="sheet__item" @click="doReport(r)">{{ r }}</div>
        <div class="sheet__cancel" @click="showReport = false">{{ t('feed.cancel') }}</div>
      </div>
    </div>
  </transition>

  <!-- toast -->
  <transition name="fade">
    <div v-if="toast" class="toast">{{ toast }}</div>
  </transition>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { activities } from '../data/mock'
import bridge from '../bridge'
import { t } from '../i18n'
import { fetchFeedDetail, fetchComments, followUser, unfollowUser, checkFollow, reportFeed, fetchFeeds } from '../api/feed'
import { mediaUrl } from '../storage'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const router = useRouter()
const defaultAvatar = 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const isActivity = computed(() => route.path.startsWith('/activity'))
const id = computed(() => Number(route.params.id))

// 真实数据源（从接口拉取，activity 从 mock 取）
const item = ref(null)
const loading = ref(true)

// 状态
const liked = ref(false)
const likeCount = ref(0)
const collected = ref(false)
const followed = ref(false)
const comments = ref([])
const commentText = ref('')
const toast = ref('')
let toastTimer = null
const commentsBox = ref(null)
const commentInput = ref(null)
// 评论输入栏：聚焦时变固定底部栏，避免被输入法遮挡（三层防护）
//   ① iOS 17+ / 新 WKWebView：CSS env(keyboard-inset-bottom) 原生键盘高度，零延迟、最精确
//   ② visualViewport JS 计算：Safari / 新 Android WebView
//   ③ window resize + 多档轮询：旧 WebView / 慢键盘 / 事件滞后
// 修复：scrollIntoView 需在键盘稳定后执行；actions 栏高度需预留
const commenting = ref(false)
const kbH = ref(0)
const KEYBOARD_ENV = (() => {
  try {
    return typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('bottom: env(keyboard-inset-bottom)')
  } catch (e) {
    return false
  }
})()
// 悬浮窗输入法兜底高度（占屏幕比例）。
// 0.5 基于 vivo X300 Pro + 微信输入法实测截图（键盘约 50% 屏高）；
// 微信/搜狗/讯飞等悬浮窗输入法普遍 45-55%，可按实测机型调整。
const KB_RESERVE_RATIO = 0.5
// actions 栏高度（padding-bottom 预留值）
const ACTIONS_HEIGHT = 64
function calcKbH() {
  // 支持 CSS 键盘变量时交给 CSS（env 精确且零延迟），JS 不再抬升，避免 inline 覆盖
  if (KEYBOARD_ENV) return 0
  const vv = window.visualViewport
  if (vv && typeof vv.height === 'number') {
    // iOS / 新 Android WebView：键盘高度 = 布局视口 - 视觉视口 - 顶部偏移
    return Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0))
  }
  // 降级：无 visualViewport（旧 Android WebView）
  //   adjustResize 模式：innerHeight 已缩小，fixed bottom:0 天然位于键盘上方 → 0 即正确
  //   覆盖模式：取不到键盘高度 → 靠 onCommentFocus 里的 scrollIntoView 兜底
  return 0
}
function syncKeyboard() {
  kbH.value = calcKbH()
}
// 输入栏预估高度（含 padding）。用于给主内容加 padding-bottom 让最后内容能滚到输入栏上方
const CINPUT_RESERVE = 80
function applyDetailPadding() {
  const detailEl = document.querySelector('.detail')
  if (!detailEl) return
  const kb = kbH.value || Math.round(window.innerHeight * KB_RESERVE_RATIO)
  // 主内容底部留白 = 键盘高 + 输入栏高 + actions 栏高，让滚动后内容不被固定输入栏遮挡
  detailEl.style.paddingBottom = kb + CINPUT_RESERVE + ACTIONS_HEIGHT + 'px'
}
function clearDetailPadding() {
  const detailEl = document.querySelector('.detail')
  if (detailEl) detailEl.style.paddingBottom = ''
}
function onCommentFocus() {
  commenting.value = true
  // 记录聚焦时的布局高度：用于识别「悬浮窗/覆盖模式输入法」（微信输入法等第三方输入法常见）
  const baseH = window.innerHeight
  nextTick(() => {
    syncKeyboard()
    // 键盘弹出动画期间多档重算（慢键盘/事件滞后补偿：120/320/700/1200ms）
    ;[120, 320, 700, 1200].forEach((ms) => {
      setTimeout(() => {
        syncKeyboard()
        // 悬浮窗/覆盖模式兜底：1200ms 后布局高度与视觉视口都没变化（键盘未触发 resize）
        // → 拿不到键盘高度，按 KB_RESERVE_RATIO（悬浮键盘占屏比例）抬升输入栏
        if (ms === 1200 && !KEYBOARD_ENV && kbH.value === 0 && window.innerHeight === baseH) {
          const vv = window.visualViewport
          kbH.value = Math.max(0, Math.round((vv && typeof vv.height === 'number' ? vv.height : baseH) * KB_RESERVE_RATIO))
        }
        // 键盘动画稳定后挂主内容 padding-bottom，让内容能滚到输入栏上方不被遮挡
        if (ms === 1200) {
          applyDetailPadding()
          // 评论区自动滚到屏幕上部（输入栏上方可见）
          if (commentsBox.value) {
            commentsBox.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      }, ms)
    })
    const el = commentInput.value
    if (el) {
      // 不阻止浏览器自动滚动，让它自然处理（配合 fixed bottom 抬升）
      el.focus()
      // 延迟执行 scrollIntoView，等键盘动画完成后再滚动
      // 原因：键盘弹出有动画（~300ms），立即 scrollIntoView 会被键盘动画打断
      setTimeout(() => {
        // 使用 block: 'end' 让输入框刚好出现在可见区域底部，避免滚过头
        el.scrollIntoView({ behavior: 'smooth', block: 'end' })
        // 150ms 后二次确认，确保位置正确
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'instant', block: 'end' })
        }, 150)
      }, 350)
    }
  })
}
function onCommentBlur() {
  // 延迟复位，避免点击发送按钮先 blur 再 click 丢失
  setTimeout(() => {
    commenting.value = false
    clearDetailPadding()
  }, 120)
}
onMounted(() => {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncKeyboard)
    window.visualViewport.addEventListener('scroll', syncKeyboard)
  }
  // 补充：部分 WebView/浏览器键盘弹出只触发 window resize（Android adjustResize 等）
  window.addEventListener('resize', syncKeyboard)
  syncKeyboard()
})
onBeforeUnmount(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', syncKeyboard)
    window.visualViewport.removeEventListener('scroll', syncKeyboard)
  }
  window.removeEventListener('resize', syncKeyboard)
})
const showReport = ref(false)
const reportReasons = ['色情低俗', '广告诈骗', '辱骂攻击', '违法违规', '其他']
const replyTo = ref(null) // { commentId, name }
function startReply(c, r) {
  replyTo.value = { commentId: c.id, name: r ? r.author : c.author }
  nextTick(() => { commentInput.value && commentInput.value.focus() })
}
async function doReport(reason) {
  showReport.value = false
  try {
    const r = await reportFeed(id.value, reason)
    showToast(r && r.ok ? t('feed.toast.reported') : t('feed.toast.reportFail'))
  } catch (e) {
    showToast(t('feed.toast.reportFail'))
  }
}

// 从接口/mock 加载详情并初始化状态
// 因 App.vue 用 <keep-alive> 缓存所有页面，切不同 id 时组件被复用 → 必须监听路由重载，否则“永远同一片”
async function load() {
  item.value = null
  loading.value = true
  if (isActivity.value) {
    item.value = activities.find((i) => i.id === id.value) || null
  } else {
    try {
      const data = await fetchFeedDetail(id.value)
      if (data) {
        item.value = data
        liked.value = !!data.isLiked
        likeCount.value = data.likes || 0
        followed.value = !!data.followed
        // 后端详情 followed 硬编码 false（rowToFeed:304），用 /follow/check 补真实关注态
        if (data.deviceId) {
          try { followed.value = await checkFollow(data.deviceId) } catch (e) {}
        }
      }
    } catch (e) { /* keep null → show empty */ }
    if (item.value) {
      await loadComments(id.value)
      loadRelated()
    }
  }
  loading.value = false
}

onMounted(load)
// 同一个组件实例下，/feed/:id 或 /activity/:id 变化都重新拉详情
watch(() => route.fullPath, load)

// 拉取真实评论列表
async function loadComments(fid) {
  // 统一走 api/feed.js（fetchComments 已做跨端字段归一 + 失败返回 null 回落本地 seed）
  try {
    const list = await fetchComments(fid)
    if (list) comments.value = list
  } catch (e) { /* 评论拉取失败不阻断详情 */ }
}

// 评论时间友好化（兼容秒/毫秒时间戳与字符串）
function formatCommentTime(ts) {
  if (!ts) return ''
  let d
  if (typeof ts === 'number') d = new Date(ts < 1e12 ? ts * 1000 : ts)
  else d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return t('feed.time.justNow')
  if (diff < 3600) return t('feed.time.minutesAgo', { n: Math.floor(diff / 60) })
  const pad = (n) => String(n).padStart(2, '0')
  if (d.toDateString() === new Date().toDateString())
    return pad(d.getHours()) + ':' + pad(d.getMinutes())
  return `${d.getMonth() + 1}-${pad(d.getDate())}`
}

const commentCount = computed(() => {
  let n = comments.value.length
  comments.value.forEach((c) => (n += (c.replies || []).length))
  return n
})

// 图片九宫格
const images = computed(() => {
  if (!item.value) return []
  return item.value.images && item.value.images.length
    ? item.value.images
    : [item.value.cover]
})
const videoSrc = computed(() => mediaUrl(item.value && item.value.videoUrl))
const videoPoster = computed(() => mediaUrl(item.value && item.value.videoCover) || '')
const gridCols = computed(() => {
  const n = images.value.length
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

// 相关推荐：从推荐流取同车型/同标签帖子（排除自身）
const currentRegion = ref('CN')
const related = ref([])
async function loadRelated() {
  if (!item.value) return
  try {
    const list = await fetchFeeds('recommend', { region: currentRegion.value, pageSize: 30 })
    const cur = item.value
    const curTags = new Set((cur.tags || []).map(String))
    const rel = list
      .filter((it) => it.id !== cur.id && ((cur.carModel && it.carModel === cur.carModel) || (it.tags || []).some((tg) => curTags.has(String(tg)))))
      .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
      .slice(0, 4)
    related.value = rel.map((it) => ({
      id: it.id,
      title: it.title,
      cover: (it.images && it.images[0]) || it.cover,
      author: it.author,
      likes: it.likes || 0,
    }))
  } catch (e) { /* 相关推荐失败不影响详情 */ }
}

// 富文本分段：#车型# / @用户 可点
const segments = computed(() => {
  if (!item.value) return []
  const text = item.value.content || ''
  const re = /(#[^#]+#|@[\u4e00-\u9fa5A-Za-z0-9_]+)/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('#')) out.push({ t: 'car', v: tok.slice(1, -1) })
    else out.push({ t: 'at', v: tok.slice(1) })
    last = m.index + tok.length
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
})

// 标签：话题 + 车型
const tagList = computed(() => {
  if (!item.value) return []
  const list = []
  ;(item.value.tags || []).forEach((t) => list.push({ v: t, car: false }))
  if (item.value.carModel) list.push({ v: item.value.carModel, car: true })
  return list
})

function segClass(seg) {
  if (seg.t === 'car') return 'seg seg--car'
  if (seg.t === 'at') return 'seg seg--at'
  return 'seg'
}
function onAt(name) {
  // @用户：用户主页归 Flutter 原生承载；原生未实现时静默（H5 暂无用户页）
  bridge.openNative('user/' + encodeURIComponent(name))
}
function segClick(seg) {
  if (seg.t === 'car') onCar(seg.v)
  else if (seg.t === 'at') onAt(seg.v)
}

function onCar(model) {
  // 决策 8：车型详情归口购车车型页（原生承载）
  bridge.openNative('vehicle/' + model)
}
function onTopic(t) {
  console.log('tap topic:', t)
}

// 互动：点赞 / 收藏 / 关注 / 分享
async function onLike() {
  // 点赞不强制前置登录：直接发请求由后端 requireAuth 最终鉴权（对齐 submitComment 评论流程）。
  // 背景（2026-08-26）：requireLogin 前置在真机 getUserInfo 字段差异下误判未登录 → 已登录用户被拉去登录页；
  //   评论无前置也能正常落库，故点赞/收藏同策略（未登录时后端 401 → 下方回滚 + toast 提示）。
  // 乐观更新 + 真实落库
  const next = !liked.value
  liked.value = next
  likeCount.value += next ? 1 : -1
  const rollback = () => {
    liked.value = !next
    likeCount.value -= next ? 1 : -1
  }
  try {
    const [token, profile] = await Promise.all([
      bridge.getAuthToken(),
      bridge.getUserInfo().catch(() => ({ nickname: '', avatar: '' })),
    ])
    const r = await fetch(`${API_BASE}/feed/${id.value}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      // 带 actor 身份（nickname/avatar），通知作者时能显示是谁赞的
      body: JSON.stringify({ liked: next, nickname: profile.nickname || '', avatar: profile.avatar || '' }),
    })
    const j = await r.json()
    if (j.code === 0 && j.data) {
      liked.value = !!j.data.isLiked
      likeCount.value = j.data.likes
    } else {
      // 后端非 0 码（如 401/无权限）：回滚 + 明确提示（原静默失败，用户以为点赞无效）
      rollback()
      showToast(j.msg || j.message || t('feed.toast.likeFail'))
    }
  } catch (e) {
    rollback()
    showToast(t('feed.toast.likeFail'))
  }
}
async function onCollect() {
  // 同 onLike：不强制前置登录，由后端鉴权（避免 requireLogin 误判拉登录页）
  collected.value = !collected.value
  showToast(collected.value ? t('feed.toast.collected') : t('feed.toast.uncollected'))
}
async function onFollow() {
  if (!item.value || !item.value.deviceId) {
    showToast(t('feed.toast.followFail'))
    return
  }
  // 关注不强制前置登录（同点赞/收藏/签到策略，2026-08-26）：直接发请求由后端 requireAuth 鉴权，
  // 避免真机 getUserInfo 字段差异下 requireLogin 误判未登录 → 已登录用户被拉去登录页
  const next = !followed.value
  followed.value = next
  try {
    // 真正落库：调后端 /follow（POST 关注 / DELETE 取关），followeeDevice = 作者 deviceId
    const r = next
      ? await followUser(item.value.deviceId)
      : await unfollowUser(item.value.deviceId)
    if (!r || !r.ok) {
      followed.value = !next
      showToast(t('feed.toast.followFail'))
    }
  } catch (e) {
    followed.value = !next
    showToast(t('feed.toast.followFail'))
  }
}
async function onShare() {
  // 分享是纯客户端动作（原生分享面板 / Web Share / 复制链接），不写后端数据，无需登录态（2026-08-25 修复：原挂 requireLogin 导致未登录点分享跳登录窗）
  // 原生环境：拉起原生分享面板（契约 openNative('share/feed?id=')）
  if (bridge.isNative()) {
    bridge.openNative('share/feed?id=' + id.value)
    showToast(t('feed.toast.shareLaunched'))
    return
  }
  // H5 预览：Web Share API / 复制链接，保证可真实分享
  const url = location.origin + location.pathname + '#/feed/' + id.value
  const title = (item.value && item.value.title) || t('feed.shareTitle')
  const text = (item.value && item.value.content ? item.value.content : '').slice(0, 60)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (e) {
      if (e && e.name === 'AbortError') return // 用户取消，不降级
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    showToast(t('feed.toast.linkCopied'))
  } catch (e) {
    showToast(t('feed.toast.shareLink') + url)
  }
}
function onActivitySignup() {
  bridge.requestPurchase({ type: 'activity', id: id.value })
  showToast(t('feed.toast.signupOpen'))
}
function onProductCard() {
  const p = item.value && item.value.productCard
  if (p) router.push('/product/' + p.id)
}
function onPreview(img) {
  console.log('preview image:', img)
}
function onCommentBtn() {
  nextTick(() => {
    commentsBox.value && commentsBox.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    commentInput.value && commentInput.value.focus()
  })
}
async function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  const [profile, token] = await Promise.all([
    bridge.getUserInfo().catch(() => ({ nickname: t('feed.me'), avatar: '' })),
    bridge.getAuthToken(),
  ])
  const body = { content: text, nickname: profile.nickname, avatar: profile.avatar }
  if (replyTo.value) {
    body.parentCommentId = replyTo.value.commentId
    body.replyTo = replyTo.value.name
  }
  try {
    const r = await fetch(`${API_BASE}/feed/${id.value}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    })
    const j = await r.json()
    if (j.code === 0 && j.data) {
      if (replyTo.value) {
        const parent = comments.value.find((x) => x.id === replyTo.value.commentId)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.unshift({
            id: j.data.id,
            author: j.data.author,
            avatar: j.data.avatar,
            content: j.data.content,
            replyTo: replyTo.value.name,
            time: formatCommentTime(j.data.createdAt),
            likes: 0,
            isLiked: false,
          })
        }
        replyTo.value = null
      } else {
        comments.value.unshift({
          id: j.data.id,
          author: j.data.author,
          avatar: j.data.avatar,
          content: j.data.content,
          time: formatCommentTime(j.data.createdAt),
          likes: 0,
          isLiked: false,
        })
      }
      commentText.value = ''
      showToast(t('feed.toast.commentOk'))
      return
    }
    showToast(j.msg || t('feed.toast.commentFail'))
  } catch (e) {
    showToast(t('feed.toast.commentFail'))
  }
}
function onCommentLike(c) {
  c.isLiked = !c.isLiked
  c.likes += c.isLiked ? 1 : -1
}
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.share { display: flex; color: var(--text); }

/* 作者卡 */
.author {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 6px;
  background: var(--card);
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.meta { flex: 1; min-width: 0; }
.name { font-size: 15px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 6px; }
.badge-official {
  font-size: 11px;
  font-weight: 500;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 1px 7px;
}
.time { font-size: 12px; color: var(--text-hint); margin-top: 3px; }
.follow {
  flex: none;
  font-size: 13px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
}
.follow.followed {
  color: var(--text-hint);
  background: #f0f1f3;
}

/* 标题 */
.title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.45;
  padding: 8px 16px 4px;
  background: var(--card);
}

/* 活动报名卡 */
.signup {
  margin: 12px 16px 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.signup__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding: 4px 0;
}
.signup__k { color: var(--text-hint); }
.signup__v { color: var(--text); font-weight: 500; }
.signup__btn {
  width: 100%;
  margin-top: 10px;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: var(--radius);
  padding: 11px 0;
  font-size: 15px;
  font-weight: 600;
}

/* 视频播放器 */
.vd-video {
  padding: 14px 16px 0;
  background: var(--card);
}
.vd-video__el {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius);
  background: #000;
  display: block;
}

/* 图片九宫格 */
.gallery {
  display: grid;
  gap: 6px;
  padding: 14px 16px 0;
  background: var(--card);
}
.gallery__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  display: block;
}
.gallery__img.single {
  aspect-ratio: 3 / 4;
  max-height: 520px;
  object-fit: cover;
}

/* 正文 */
.content {
  padding: 14px 16px 4px;
  background: var(--card);
  font-size: 16px;
  color: #333;
  line-height: 1.85;
}
.seg--car, .seg--at { color: var(--brand); }

/* 标签 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 14px;
  background: var(--card);
}
.tag {
  font-size: 13px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
}
.tag.car { color: var(--text-sub); background: #f0f1f3; }

/* 商品卡 */
.prod {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 16px 0;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 10px;
}
.prod__img {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
}
.prod__info { flex: 1; min-width: 0; }
.prod__name { font-size: 14px; color: var(--text); }
.prod__price { font-size: 15px; font-weight: 700; color: var(--price); margin-top: 4px; }
.prod__go { font-size: 13px; color: var(--brand); flex: none; }

/* 评论 */
.comments { background: var(--card); margin-top: 10px; padding: 14px 16px 0; }
.comments__head { font-size: 15px; font-weight: 600; color: var(--text); }
.comments__empty { font-size: 13px; color: var(--text-hint); padding: 18px 0; text-align: center; }
.cmt { display: flex; gap: 10px; padding: 14px 0; border-bottom: 1px solid #f2f3f5; }
.cmt__avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex: none; }
.cmt__main { flex: 1; min-width: 0; }
.cmt__name { font-size: 13px; color: var(--text-sub); font-weight: 600; }
.cmt__text { font-size: 15px; color: #333; line-height: 1.6; margin-top: 4px; }
.cmt__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.cmt__time { font-size: 12px; color: var(--text-hint); }
.cmt__like { display: flex; align-items: center; gap: 3px; font-size: 12px; color: var(--text-hint); }
.cmt__like.liked { color: var(--price); }

.cinput {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 14px;
}
/* 聚焦时变固定底部栏，顶到软键盘上方（bottom 优先 CSS 原生键盘变量，回退 JS 动态计算） */
.cinput--fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: env(keyboard-inset-bottom, 0px);
  z-index: 60;
  max-width: 480px;
  margin: 0 auto;
  background: var(--card);
  border-top: 1px solid var(--line);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
  /* 确保输入框不被父容器 overflow 裁剪 */
  transform: translateZ(0);
}
.cinput__field {
  flex: 1;
  height: 38px;
  background: var(--bg);
  border-radius: var(--radius-pill);
  padding: 0 14px;
  font-size: 14px;
  color: var(--text);
}
.cinput__send {
  flex: none;
  font-size: 14px;
  color: var(--brand);
  font-weight: 600;
  padding: 0 4px;
}

/* 相关推荐 */
.related { background: var(--card); margin-top: 10px; padding: 14px 16px 16px; }
.related__head { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
.related__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rcard { background: var(--bg); border-radius: var(--radius-lg); overflow: hidden; }
.rcard__img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; display: block; }
.rcard__title {
  font-size: 13px; color: var(--text); line-height: 1.4; padding: 8px 8px 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.rcard__foot { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 10px; }
.rcard__author { font-size: 11px; color: var(--text-hint); }
.rcard__like { display: flex; align-items: center; gap: 2px; font-size: 11px; color: var(--text-hint); }

/* 加载中 */
.loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-hint);
  background: var(--bg);
}
.loading__spin {
  width: 28px;
  height: 28px;
  border: 3px solid #ececef;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading__txt { font-size: 14px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 空态 */
.empty {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-hint);
  background: var(--bg);
}
.empty__txt { font-size: 15px; }
.empty__back {
  font-size: 14px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 7px 20px;
}

/* 底部互动栏 */
.actions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1px solid var(--line);
  z-index: 50;
}
.act {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-sub);
}
.act.liked { color: var(--price); }
.act.collected { color: var(--brand); }

/* toast */
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
.more { display: flex; color: var(--text); margin-right: 8px; }
.cmt__reply { font-size: 12px; color: var(--brand); }
.replies { margin-top: 10px; background: #f7f8fa; border-radius: 10px; padding: 8px 10px; }
.reply { display: flex; gap: 8px; padding: 6px 0; }
.reply__avatar { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; flex: none; }
.reply__main { flex: 1; min-width: 0; }
.reply__name { font-size: 13px; color: var(--text-sub); font-weight: 600; }
.reply__to { color: var(--brand); font-weight: 400; }
.reply__text { font-size: 14px; color: #333; line-height: 1.55; margin-top: 2px; }
.reply__time { font-size: 11px; color: var(--text-hint); margin-top: 3px; }
.cinput__reply { font-size: 12px; color: var(--text-sub); padding: 0 2px 6px; }
.cinput__cancel { color: var(--brand); margin-left: 6px; }

/* 举报弹层 */
.sheet-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: flex-end; justify-content: center; z-index: 200;
}
.sheet {
  width: 100%; max-width: 480px; background: var(--card);
  border-radius: 14px 14px 0 0; padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
}
.sheet__title { text-align: center; font-size: 14px; color: var(--text-hint); padding: 12px 0; border-bottom: 1px solid #f0f1f3; }
.sheet__item { text-align: center; font-size: 16px; color: var(--text); padding: 14px 0; border-bottom: 1px solid #f0f1f3; }
.sheet__item:active { background: #f5f5f7; }
.sheet__cancel { text-align: center; font-size: 16px; color: var(--text-sub); font-weight: 600; padding: 14px 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
