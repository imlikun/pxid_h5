<template>
  <div class="detail" v-if="item">
    <!-- 顶部 -->
    <TopBar sticky :title="isActivity ? t('feed.detail.title.activity') : t('feed.detail.title.content')">
      <template #right>
        <span class="more press" @click="onMoreClick">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
        </span>
        <span class="share press" @click="onShare">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        </span>
      </template>
    </TopBar>

  <article class="article">
    <!-- 作者卡：点作者进个人主页（官方帖无 deviceId 不跳） -->
    <header class="article__header">
      <div class="author fade-up stagger-1" @click="goAuthor">
      <img class="avatar" :src="authorAvatar" :alt="item.author" @error="(e) => handleAvatarError(e, item.value?.author)" />
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
        @click.stop="onFollow"
      >{{ followed ? t('feed.follow.following') : t('feed.follow.follow') }}</button>
    </div>

    <!-- 标题 -->
    <h1 class="title fade-up stagger-2">{{ item.title }}</h1>
    </header>

    <div class="article__body">
    <!-- 活动报名卡 -->
    <div v-if="isActivity" class="signup">
      <div class="signup__row">
        <span class="signup__k">{{ t('feed.signup.time') }}</span>
        <span class="signup__v">{{ activityDateText() }}</span>
      </div>
      <div class="signup__row">
        <span class="signup__k">{{ t('feed.signup.place') }}</span>
        <span class="signup__v">{{ item.location || t('feed.signup.placeVal') }}</span>
      </div>
      <button class="signup__btn press" :class="{ signed: signedUp }" :disabled="signedUp" @click="onActivitySignup">{{ signedUp ? t('feed.signup.joined') : t('feed.signup.btn') }}</button>
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
    <div v-if="images.length && images[0]" class="gallery fade-up stagger-3" :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }">
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
  </article>

    <!-- 评论区 -->
    <div class="comments fade-up stagger-7" ref="commentsBox">
      <div class="comments__head">{{ t('feed.commentsCount', { n: commentCount }) }}</div>
      <div v-if="comments.length === 0" class="comments__empty">{{ t('feed.commentsEmpty') }}</div>
      <CommentNode
        v-for="c in comments"
        :key="c.id"
        :node="c"
        @reply="onReplyNode"
      />

      </div>

    <!-- 输入栏：Teleport 到 body，彻底避开 .app-root transform / keep-alive 等祖先包含块影响 -->
    <teleport to="body">
      <div
        v-show="commenting"
        class="cinput"
        :class="{ 'cinput--fixed': commenting }"
        :style="cinputStyle"
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
    </teleport>

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

  <!-- 底部互动栏：左侧输入框 + 右侧点赞/收藏/评论（对齐 App 详情页习惯） -->
  <div v-if="item" class="actions" v-show="!commenting">
    <div class="actions__input press" @click="onCommentBtn">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      <span>{{ t('feed.writeComment') }}</span>
    </div>
    <div class="actions__icons">
      <button class="actions__icon pop press" :class="{ liked }" @click="onLike">
        <svg viewBox="0 0 24 24" width="22" height="22" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span>{{ likeCount }}</span>
      </button>
      <button class="actions__icon pop press" :class="{ collected }" @click="onCollect">
        <svg viewBox="0 0 24 24" width="22" height="22" :fill="collected ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        <span>{{ collectCount }}</span>
      </button>
      <button class="actions__icon pop press" @click="onCommentBtn">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        <span>{{ commentCount }}</span>
      </button>
    </div>
  </div>

  <!-- 举报弹层：Teleport 到 body，避免被 .app-root 的 transform/will-change 包含块捕获
       （真机边缘滑动返回被原生吞 touchend 时 .app-root 残留 will-change，会导致 fixed 弹层错位「不居中/没样式」） -->
  <teleport to="body">
    <transition name="fade">
      <div v-if="showReport" class="sheet-mask" @click="showReport = false">
        <div class="sheet" @click.stop>
          <div class="sheet__title">{{ t('feed.reportTitle') }}</div>
          <div v-for="r in reportReasons" :key="r" class="sheet__item" @click="doReport(r)">{{ r }}</div>
          <div class="sheet__cancel" @click="showReport = false">{{ t('feed.cancel') }}</div>
        </div>
      </div>
    </transition>
  </teleport>

  <!-- 删除确认：自己发的帖才出现 -->
  <teleport to="body">
    <transition name="fade">
      <div v-if="showDeleteConfirm" class="sheet-mask" @click="showDeleteConfirm = false">
        <div class="sheet" @click.stop>
          <div class="sheet__title">删除这条动态？</div>
          <div class="sheet__item sheet__danger" @click="doDelete">删除</div>
          <div class="sheet__cancel" @click="showDeleteConfirm = false">{{ t('feed.cancel') }}</div>
        </div>
      </div>
    </transition>
  </teleport>

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
import { t, locale, regionFromLocale } from '../i18n'
import { fetchFeedDetail, fetchComments, followUser, unfollowUser, checkFollow, reportFeed, fetchFeeds, recordFootprint, toggleFavorite, checkFavorite, fetchActivityDetail, deleteFeed, getDeviceId } from '../api/feed'
import { mediaUrl } from '../storage'
import TopBar from '../components/TopBar.vue'
import CommentNode from '../components/CommentNode.vue'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'

const route = useRoute()
const router = useRouter()

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const isActivity = computed(() => route.path.startsWith('/activity'))
const id = computed(() => Number(route.params.id))
// 活动没有 deviceId → 视为官方，隐藏关注按钮、显示官方徽章
const isOfficial = computed(() => !item.value || !item.value.deviceId || !!item.value.isOfficial)
// 当前用户是否已报名该活动（控制报名按钮态）
const signedUp = ref(false)
const authorAvatar = computed(() => resolveAvatar(item.value?.author, item.value?.avatar))

// 真实数据源（从接口拉取，activity 从 mock 取）
const item = ref(null)
const loading = ref(true)

// 状态
const liked = ref(false)
const likeCount = ref(0)
const collected = ref(false)
const collectCount = ref(0)
const followed = ref(false)
const comments = ref([])
const commentText = ref('')
const toast = ref('')
let toastTimer = null
const commentsBox = ref(null)
const commentInput = ref(null)
// 评论输入栏：聚焦时变固定底部栏，贴紧键盘顶边
//   关键纪律：
//   ① 不用 body position:fixed 锁滚动 —— 它会破坏 visualViewport，导致不同帖子（不同滚动位置）表现不同。
//   ② 输入栏 Teleport 到 body，避开 .app-root 侧滑 transform / keep-alive 等祖先包含块。
//   ③ 键盘高度只由 visualViewport 计算，不减 offsetTop；无 vv 时按视口比例兜底。
//   ④ 键盘弹出是连续动画，需多帧同步取最终高度。
const commenting = ref(false)
const kbH = ref(0)
// 输入栏预估高度（含 padding）。用于给主内容加 padding-bottom 让最后内容能滚到输入栏上方
const CINPUT_RESERVE = 80
// 同步键盘高度的 timer 集合
let kbTimers = []
function clearKbTimers() {
  kbTimers.forEach((t) => clearTimeout(t))
  kbTimers = []
}
function calcKbH() {
  // 优先 visualViewport：键盘高度 = 布局视口高度 - 视觉视口高度
  // 注意：不减 vv.offsetTop。offsetTop 是 vv 相对于 layout viewport 的上偏移，
  // 减去它会把键盘高度算小，导致输入框被键盘盖住。
  const vv = window.visualViewport
  if (vv && typeof vv.height === 'number') {
    const h = Math.max(0, window.innerHeight - vv.height)
    if (h > 40) return h
  }
  // 算不出来时返回 0，不要凭空估一个比例值（如 0.45*innerHeight），
  // 否则输入框会悬空在键盘上方。交给 CSS env(keyboard-inset-bottom, 0px) 处理，
  // 并由 focus 后的 scrollIntoView 兜底避免被键盘遮住。
  return 0
}
let lastKbH = 0
function syncKeyboard(force) {
  const h = calcKbH()
  // 变化小于 2px 忽略，避免键盘稳定过程中的微抖动让输入框上下跳；force 时不过滤
  if (!force && Math.abs(h - lastKbH) < 2) return
  lastKbH = h
  kbH.value = h
  if (commenting.value) applyDetailPadding()
}
// 输入栏固定定位样式：
// - 能算出真实键盘高度（visualViewport 差值 > 40）时，bottom = 键盘高度，贴紧键盘顶边；
// - 算不出时，不要凭空兜底一个比例值（会导致输入框悬空在键盘上方），直接 fallthrough 到 CSS：
//   CSS 里 bottom: env(keyboard-inset-bottom, 0px) 会让支持的 WebView 自动贴键盘，
//   不支持的 WebView 则 bottom: 0 贴屏幕底，再由 focus 后的 scrollIntoView 兜底避免被键盘遮住。
const cinputStyle = computed(() => {
  if (!commenting.value) return {}
  if (kbH.value > 40) return { bottom: kbH.value + 'px' }
  return {}
})
function applyDetailPadding() {
  const detailEl = document.querySelector('.detail')
  if (!detailEl) return
  const kb = kbH.value
  if (!kb) {
    detailEl.style.paddingBottom = ''
    return
  }
  // 主内容底部留白 = 键盘高 + 输入栏高，让滚动后内容不被固定输入栏遮挡。
  // 这里替换而非叠加原有 padding-bottom。
  detailEl.style.paddingBottom = kb + CINPUT_RESERVE + 'px'
}
function clearDetailPadding() {
  const detailEl = document.querySelector('.detail')
  if (detailEl) detailEl.style.paddingBottom = ''
}
function scheduleKeyboardSyncs() {
  clearKbTimers()
  // 键盘弹出是连续动画，分 0/80/180/320ms 多帧同步，取最终稳定高度
  ;[0, 80, 180, 320].forEach((ms) => {
    kbTimers.push(setTimeout(() => syncKeyboard(ms === 0), ms))
  })
  // 兜底：如果键盘高度最终仍检测不到（kbH < 80），说明当前 WebView 不暴露键盘高度。
  // 此时输入栏会贴在屏幕底部，可能被键盘遮住；把输入框滚进可视区，保证用户能继续输入。
  kbTimers.push(setTimeout(() => {
    if (kbH.value < 80) {
      const el = commentInput.value
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, 360))
}
function onCommentFocus() {
  commenting.value = true
  nextTick(() => {
    scheduleKeyboardSyncs()
    const el = commentInput.value
    if (el) {
      // preventScroll 阻止浏览器原生把焦点元素滚入可见区，避免 fixed 输入栏被推到屏幕顶部
      el.focus({ preventScroll: true })
    }
  })
}
function onCommentBlur() {
  // 延迟复位，避免点击发送按钮先 blur 再 click 丢失
  clearKbTimers()
  setTimeout(() => {
    commenting.value = false
    kbH.value = 0
    lastKbH = 0
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
  clearKbTimers()
})
const showReport = ref(false)
const showDeleteConfirm = ref(false)
const reportReasons = ['色情低俗', '广告诈骗', '辱骂攻击', '违法违规', '其他']
// 自己/别人判定所需：当前登录用户的稳定身份（memberUserId 优先，回退 deviceId）
const currentMemberUserId = ref('')
const currentDeviceId = ref('')
const isSelf = computed(() => {
  if (!item.value) return false
  const a = String(item.value.memberUserId || '')
  const b = String(item.value.deviceId || '')
  const m = String(currentMemberUserId.value || '')
  const d = String(currentDeviceId.value || '')
  return (!!a && a === m) || (!!b && b === d)
})
// 上次进入页面时已尝试预填（避免重复调用 bridge）
async function initSelfIdentity() {
  try {
    const info = await bridge.getUserInfo().catch(() => ({}))
    currentMemberUserId.value = String((info && info.memberUserId) || '')
  } catch (e) {}
  try {
    currentDeviceId.value = String((await getDeviceId()) || '')
  } catch (e) {}
}
function onMoreClick() {
  if (isSelf.value) showDeleteConfirm.value = true
  else showReport.value = true
}
async function doDelete() {
  showDeleteConfirm.value = false
  try {
    const r = await deleteFeed(id.value)
    if (r && r.ok !== false) {
      showToast('已删除')
      router.back()
    } else {
      showToast('删除失败')
    }
  } catch (e) {
    showToast('删除失败')
  }
}
const replyTo = ref(null) // { id, name }
function onReplyNode(node) {
  replyTo.value = { id: node.id, name: node.author }
  commenting.value = true
  nextTick(() => {
    scheduleKeyboardSyncs()
    const el = commentInput.value
    if (el) el.focus({ preventScroll: true })
  })
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
    item.value = await fetchActivityDetail(id.value)
    if (item.value) checkMySignup(id.value)
  } else {
    try {
      const data = await fetchFeedDetail(id.value)
      if (data) {
        item.value = data
        liked.value = !!data.isLiked
        likeCount.value = data.likes || 0
        collected.value = !!data.isFavorited
        collectCount.value = data.favorites || 0
        followed.value = !!data.followed
        // 后端详情 followed 硬编码 false（rowToFeed:304），用 /follow/check 补真实关注态
        if (data.deviceId) {
          try { followed.value = await checkFollow(data.deviceId) } catch (e) {}
        }
        // 记录浏览足迹（H5 自管，个人主页「足迹」Tab 用；静默失败不影响阅读）
        recordFootprint(id.value)
        // 有 token 时补收藏态（公开详情默认不带 isFavorited，避免未登录被 401）
        checkFavorite(id.value).then((fav) => {
          collected.value = fav
        }).catch(() => {})
      }
    } catch (e) { /* keep null → show empty */ }
    if (item.value) {
      await loadComments(id.value)
      loadRelated()
    }
  }
  loading.value = false
}

onMounted(() => {
  initSelfIdentity()
  load()
})
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
  let n = 0
  const walk = (list) => {
    list.forEach((c) => {
      n++
      if (c.replies && c.replies.length) walk(c.replies)
    })
  }
  walk(comments.value)
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
const generatedPoster = ref('')
const videoPoster = computed(() => mediaUrl(item.value && item.value.videoCover) || generatedPoster.value || '')

// 视频封面兜底：后端没返 videoCover 时，用 canvas 截取首帧生成 poster
function generateVideoPoster(url) {
  if (!url || generatedPoster.value) return
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  let seekDone = false
  video.onloadedmetadata = () => {
    if (seekDone) return
    seekDone = true
    // 取 0.5s 避免部分视频开头黑帧
    video.currentTime = Math.min(0.5, video.duration || 0.5)
  }
  video.onseeked = () => {
    const canvas = document.createElement('canvas')
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    try {
      generatedPoster.value = canvas.toDataURL('image/jpeg', 0.85)
    } catch (e) {
      // 跨域限制时无法生成，忽略
    }
  }
  video.onerror = () => {}
  video.src = url
}
watch(videoSrc, (url) => {
  if (url && !item.value?.videoCover) {
    nextTick(() => generateVideoPoster(url))
  }
}, { immediate: true })
watch(id, () => { generatedPoster.value = '' })

const gridCols = computed(() => {
  const n = images.value.length
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

// 相关推荐：从推荐流取同车型/同标签帖子（排除自身）
// 地区由当前语言映射（2026-08-31 定）：zh→CN、pt→BR、en→US
const currentRegion = computed(() => regionFromLocale(locale.value))
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

// 活动详情日期：优先 startDate~endDate 区间，fallback date 字段
function activityDateText() {
  const it = item.value
  if (!it) return ''
  const s = it.startDate || it.start_date || ''
  const e = it.endDate || it.end_date || ''
  const f = (d) => { const m = String(d).match(/^\d{4}-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] : d }
  if (s && e && s !== e) return f(s) + ' ~ ' + f(e)
  if (s) return f(s)
  return it.date || ''
}

// 富文本分段：#车型# / @用户 可点
const segments = computed(() => {
  if (!item.value) return []
  const text = item.value.content || ''
  // 用昵称→deviceId 反查映射，把 @昵称 解析出可跳转的 deviceId
  const mentionMap = {}
  ;(item.value.mentions || []).forEach((m) => {
    if (m && m.nickname) mentionMap[String(m.nickname)] = m.deviceId || ''
  })
  const re = /(#[^#]+#|@[\u4e00-\u9fa5A-Za-z0-9_]+)/g
  const out = []
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('#')) out.push({ t: 'car', v: tok.slice(1, -1) })
    else {
      const name = tok.slice(1)
      out.push({ t: 'at', v: name, deviceId: mentionMap[name] || '' })
    }
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
function onAt(name, deviceId) {
  // 个人主页是 H5 页面（UserProfileView），有 deviceId 时 H5 内直接跳转；无则静默（评论 @ 暂无 deviceId 不可点）
  if (deviceId) router.push('/user/' + encodeURIComponent(deviceId))
}
function segClick(seg) {
  if (seg.t === 'car') onCar(seg.v)
  else if (seg.t === 'at') onAt(seg.v, seg.deviceId)
}

function onCar(model) {
  // 决策 8：车型详情归口购车车型页（原生承载）
  bridge.openNative('vehicle/' + model)
}
// 点作者 → 个人主页（他人/自己统一由主页按 id 识别）
function goAuthor() {
  if (item.value && item.value.deviceId) router.push('/user/' + encodeURIComponent(item.value.deviceId))
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
  const next = !collected.value
  collected.value = next
  collectCount.value += next ? 1 : -1
  const rollback = () => {
    collected.value = !next
    collectCount.value -= next ? 1 : -1
  }
  try {
    const r = await toggleFavorite(id.value, next)
    if (r.ok) {
      collected.value = !!r.favorited
      if (typeof r.favorites === 'number') collectCount.value = r.favorites
    } else {
      rollback()
      showToast(r.message || t('feed.toast.collectFail'))
    }
  } catch (e) {
    rollback()
    showToast(t('feed.toast.collectFail'))
  }
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
// 海外用户无微信：点击分享直接复制链接，不再弹分享面板
async function onShare() {
  const url = location.origin + location.pathname + '#/feed/' + id.value
  await copyShareLink(url)
}

async function copyShareLink(url) {
  try {
    await navigator.clipboard.writeText(url)
    showToast(t('feed.toast.linkCopied'))
  } catch (e) {
    showToast(t('feed.toast.shareLink') + url)
  }
}
async function onActivitySignup() {
  if (signedUp.value) { showToast(t('feed.toast.signedUp')); return }
  try {
    const [profile, token] = await Promise.all([
      bridge.getUserInfo().catch(() => ({ nickname: '' })),
      bridge.getAuthToken(),
    ])
    if (!token) { showToast(t('feed.toast.needLogin')); return }
    const r = await fetch(`${API_BASE}/activities/${id.value}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ name: profile.nickname || '', phone: '', bikeModel: '' }),
    })
    const j = await r.json()
    if (j.code === 0) {
      signedUp.value = true
      showToast(t('feed.toast.signupOk'))
      if (item.value && item.value.signupCount != null) item.value.signupCount = Number(item.value.signupCount) + 1
    } else if (j.message && j.message.indexOf('名额') >= 0) {
      showToast(t('feed.toast.signupFull'))
    } else if (j.message && j.message.indexOf('已报名') >= 0) {
      signedUp.value = true
      showToast(t('feed.toast.signedUp'))
    } else {
      showToast(j.message || t('feed.toast.signupFail'))
    }
  } catch (e) {
    showToast(t('feed.toast.signupFail'))
  }
}

// 查当前用户是否已报名该活动（初始化报名按钮态）
async function checkMySignup(aid) {
  try {
    const token = await bridge.getAuthToken()
    if (!token) return
    const r = await fetch(`${API_BASE}/activities/${aid}/signup/me`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    const j = await r.json()
    if (j.code === 0 && j.data && j.data.signedUp) signedUp.value = true
  } catch (e) { /* 未登录/失败不阻断 */ }
}
function onProductCard() {
  const p = item.value && item.value.productCard
  if (p) router.push('/product/' + p.id)
}
function onPreview(img) {
  console.log('preview image:', img)
}
function onCommentBtn() {
  commenting.value = true
  nextTick(() => {
    scheduleKeyboardSyncs()
    const el = commentInput.value
    if (el) el.focus({ preventScroll: true })
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
    body.parentId = replyTo.value.id
  }
  try {
    const r = await fetch(`${API_BASE}/feed/${id.value}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body),
    })
    const j = await r.json()
    if (j.code === 0 && j.data) {
      const newNode = {
        id: j.data.id,
        parentId: j.data.parentId || 0,
        author: j.data.author,
        avatar: j.data.avatar,
        content: j.data.content,
        time: formatCommentTime(j.data.createdAt),
        createdAt: j.data.createdAt,
        likes: 0,
        isLiked: false,
        replies: [],
      }
      if (replyTo.value) {
        const parent = findNode(comments.value, replyTo.value.id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.unshift(newNode)
        } else {
          comments.value.unshift(newNode)
        }
        replyTo.value = null
      } else {
        comments.value.unshift(newNode)
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
function findNode(list, id) {
  for (const n of list) {
    if (n.id === id) return n
    if (n.replies && n.replies.length) {
      const found = findNode(n.replies, id)
      if (found) return found
    }
  }
  return null
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
  background: var(--card);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.share { display: flex; color: var(--text); }

/* 文章主容器：统一内边距，消除作者/标题/正文/媒体之间的断痕 */
.article {
  padding: 8px 16px 16px;
  background: var(--card);
}
.article__header { margin-bottom: 16px; }
.article__body { margin-bottom: 16px; }
.article__body > *:last-child { margin-bottom: 0; }

/* 作者卡 */
.author {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
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
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.4;
}

/* 活动报名卡 */
.signup {
  margin-bottom: 16px;
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
  margin-bottom: 16px;
}
.vd-video__el {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: var(--radius-lg);
  background: #000;
  display: block;
}

/* 图片九宫格 */
.gallery {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}
.gallery__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius-lg);
  display: block;
}
.gallery__img.single {
  aspect-ratio: 3 / 4;
  max-height: 520px;
  object-fit: cover;
}

/* 正文 */
.content {
  font-size: 16px;
  color: var(--text);
  line-height: 1.85;
}
.seg--car, .seg--at { color: var(--brand); }

/* 标签 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
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
  margin-top: 12px;
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
.comments { background: var(--card); border-top: 1px solid var(--line); padding: 16px; }
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
/* 聚焦时变固定底部栏。
   优先用 CSS env(keyboard-inset-bottom) —— iOS 17+/新 Android WebView 能给出精确键盘高度；
   不支持时 bottom:0 贴屏幕底部。JS 只在能精确算出键盘高度时内联 bottom 覆盖此值。 */
.cinput--fixed {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
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
  will-change: bottom;
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
.related { background: var(--card); border-top: 1px solid var(--line); padding: 16px; }
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

/* 底部互动栏：左输入框 + 右图标 */
.actions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1px solid var(--line);
  z-index: 50;
  box-sizing: border-box;
}
.actions__input {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  background: var(--bg);
  border-radius: var(--radius-pill);
  padding: 0 14px;
  font-size: 14px;
  color: var(--text-hint);
}
.actions__icons {
  flex: none;
  display: flex;
  align-items: center;
  gap: 18px;
}
.actions__icon {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-sub);
  background: none;
  padding: 4px 0;
}
.actions__icon.liked { color: var(--price); }
.actions__icon.collected { color: var(--brand); }

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
.sheet__danger { text-align: center; font-size: 16px; color: #e64340; font-weight: 600; padding: 14px 0; border-bottom: 1px solid #f0f1f3; }
.sheet__danger:active { background: #fdecec; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
