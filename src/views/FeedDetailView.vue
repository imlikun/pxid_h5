<template>
  <div class="detail" v-if="item">
    <!-- 下拉刷新指示器（手机 WebView 必需） -->
    <div
      class="pull-indicator"
      :class="{ pulling: pulling, ready: pullReady, refreshing: refreshing }"
      :style="{ transform: pulling && !refreshing ? `translateX(-50%) translateY(${pullDelta - 8}px)` : 'translateX(-50%) translateY(-8px)' }"
    >
      <div class="pull-spinner" v-if="refreshing || pulling"></div>
      <span class="pull-text">{{ refreshing ? '刷新中…' : (pullReady ? '释放刷新' : '下拉刷新') }}</span>
    </div>

    <!-- 顶部 -->
    <div class="topbar">
      <span class="back press" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="t">{{ isActivity ? '活动详情' : '内容详情' }}</span>
      <span class="share press" @click="onShare">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
      </span>
    </div>

    <!-- 作者卡 -->
    <div class="author fade-up stagger-1">
      <img class="avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
      <div class="meta">
        <div class="name">
          {{ item.author || 'PXID 官方' }}
          <span v-if="isOfficial" class="badge-official">官方</span>
        </div>
        <div class="time">{{ item.time || item.date }}</div>
      </div>
      <button
        v-if="!isOfficial"
        class="follow press"
        :class="{ followed }"
        @click="onFollow"
      >{{ followed ? '已关注' : '+ 关注' }}</button>
    </div>

    <!-- 标题 -->
    <h1 class="title fade-up stagger-2">{{ item.title }}</h1>

    <!-- 活动报名卡 -->
    <div v-if="isActivity" class="signup">
      <div class="signup__row">
        <span class="signup__k">活动时间</span>
        <span class="signup__v">{{ item.date }}</span>
      </div>
      <div class="signup__row">
        <span class="signup__k">活动地点</span>
        <span class="signup__v">PXID 体验店 / 线上同步</span>
      </div>
      <button class="signup__btn press" @click="onActivitySignup">立即报名</button>
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
      <span class="prod__go">去看看 &gt;</span>
    </div>

    <!-- 评论区 -->
    <div class="comments fade-up stagger-7" ref="commentsBox">
      <div class="comments__head">评论（{{ commentCount }}）</div>
      <div v-if="comments.length === 0" class="comments__empty">暂无评论，来抢沙发~</div>
      <div v-for="c in comments" :key="c.id" class="cmt">
        <img class="cmt__avatar" :src="c.avatar || defaultAvatar" :alt="c.author" />
        <div class="cmt__main">
          <div class="cmt__name">{{ c.author }}</div>
          <div class="cmt__text">{{ c.content }}</div>
          <div class="cmt__foot">
            <span class="cmt__time">{{ c.time }}</span>
            <span class="cmt__like pop" :class="{ liked: c.isLiked }" @click="onCommentLike(c)">
              <svg viewBox="0 0 24 24" width="14" height="14" :fill="c.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>{{ c.likes }}</span>
            </span>
          </div>
          <!-- 楼中楼 -->
          <div v-if="c.replies && c.replies.length" class="replies">
            <div v-for="r in c.replies" :key="r.id" class="reply">
              <span class="reply__name">{{ r.author }}：</span>
              <span class="reply__text">{{ r.content }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入栏 -->
      <div class="cinput">
        <input
          ref="commentInput"
          v-model="commentText"
          class="cinput__field"
          placeholder="说点什么…"
          @keyup.enter="submitComment"
        />
        <button class="cinput__send press" @click="submitComment">发送</button>
      </div>
    </div>

    <!-- 相关推荐 -->
    <div class="related fade-up stagger-8" v-if="related.length">
      <div class="related__head">相关推荐</div>
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

  <!-- 空态 -->
  <div v-else class="empty">
    <div class="empty__icon">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
    </div>
    <div class="empty__txt">内容不存在或已下架</div>
    <button class="empty__back" @click="router.back()">返回</button>
  </div>

  <!-- 底部互动栏 -->
  <div v-if="item" class="actions">
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
      <span>{{ collected ? '已收藏' : '收藏' }}</span>
    </button>
    <button class="act pop press" @click="onShare">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
      <span>分享</span>
    </button>
  </div>

  <!-- toast -->
  <transition name="fade">
    <div v-if="toast" class="toast">{{ toast }}</div>
  </transition>

  <!-- 底部分享面板（H5 兜底） -->
  <ShareSheet
    v-model="showShare"
    :title="shareTitle"
    :desc="shareDesc"
    :url="shareUrl"
    @share="handleShare"
  />
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { feedItems, activities, moments, commentSeed } from '../data/mock'
import { publishState } from '../store/publish'
import { requireLogin } from '../utils/auth'
import { fetchFeedDetail, likeFeed, commentFeed, fetchComments } from '../api/feed'
import { hasHotUpdate } from '../utils/hotUpdate'
import bridge from '../bridge'
import ShareSheet from '../components/ShareSheet.vue'

const route = useRoute()
const router = useRouter()
const defaultAvatar = 'unsplash/photo-1535713875002-d1d0cf377fde_w_80_q_80.jpg'

const isActivity = computed(() => route.path.startsWith('/activity'))
const id = computed(() => route.params.id)
const item = ref(null)
async function loadItem() {
  // 优先真实后端（含用户动态），查不到再兜底 mock 池
  const real = await fetchFeedDetail(id.value)
  if (real) {
    item.value = real
  } else {
    const pool = isActivity.value ? activities : [...feedItems, ...moments, ...publishState.list]
    item.value = pool.find((i) => String(i.id) === String(id.value)) || null
  }
  if (item.value) {
    liked.value = !!item.value.isLiked
    likeCount.value = item.value.likes || 0
    followed.value = !!item.value.followed
    // 优先后端评论列表（跨端一致），失败/无数据回落本地 seed
    const remote = await fetchComments(id.value)
    if (remote !== null) {
      comments.value = remote
    } else {
      const seed = commentSeed[item.value.id] || []
      comments.value = seed.map((c) => ({ ...c, replies: (c.replies || []).map((r) => ({ ...r })) }))
    }
  }
}
onMounted(() => {
  loadItem()
  attachPullRefresh()
})
watch(id, loadItem)
onUnmounted(teardownPullRefresh)

const isOfficial = computed(() => isActivity.value || (item.value && item.value.kind === 'official'))

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
const showShare = ref(false)

const shareUrl = computed(() => location.origin + location.pathname + '#/feed/' + id.value)
const shareTitle = computed(() => (item.value && item.value.title) || 'PXID 内容')
const shareDesc = computed(() => (item.value && item.value.content ? item.value.content : '').slice(0, 60))

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
const gridCols = computed(() => {
  const n = images.value.length
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

// 相关推荐：其余 feed + moments
const related = computed(() => {
  if (!item.value) return []
  return [...feedItems, ...moments]
    .filter((i) => i.id !== item.value.id)
    .slice(0, 4)
})

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
function segClick(seg) {
  if (seg.t === 'car') onCar(seg.v)
  else if (seg.t === 'at') console.log('tap user:', seg.v)
}

function onCar(model) {
  // 决策 8：车型详情归口购车车型页（原生承载）
  bridge.openNative('vehicle/' + model)
}
function onTopic(t) {
  console.log('tap topic:', t)
}

// 互动：点赞 / 收藏 / 关注 / 分享（均走登录 Gate）
async function onLike() {
  // 当前匿名体系：点赞免登录（与发帖一致）；接入登录态后改回 requireLogin 门控
  const willLike = !liked.value
  liked.value = willLike
  likeCount.value += willLike ? 1 : -1
  const res = await likeFeed(id.value)
  if (!res.ok) {
    liked.value = !willLike
    likeCount.value += willLike ? -1 : 1
  }
  bridge.openNative('feed/interact?type=like&id=' + id.value)
}
async function onCollect() {
  const ok = await requireLogin()
  if (!ok) return
  collected.value = !collected.value
  showToast(collected.value ? '已收藏' : '已取消收藏')
}
async function onFollow() {
  const ok = await requireLogin()
  if (!ok) return
  followed.value = !followed.value
  showToast(followed.value ? '已关注' : '已取消关注')
}
async function onShare() {
  const ok = await requireLogin()
  if (!ok) return
  // 原生环境：拉起原生分享面板（契约 openNative('share/feed?id=')）
  if (bridge.isNative()) {
    bridge.openNative('share/feed?id=' + id.value)
    showToast('已唤起分享')
    return
  }
  // H5 预览 / appin.site：弹出主流 App 风格底部分享面板
  showShare.value = true
}

async function handleShare({ channel }) {
  showShare.value = false
  if (channel === 'link') {
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      showToast('链接已复制')
    } catch (e) {
      showToast('分享链接：' + shareUrl.value)
    }
    return
  }
  if (channel === 'more' && navigator.share) {
    try {
      await navigator.share({
        title: shareTitle.value,
        text: shareDesc.value,
        url: shareUrl.value,
      })
    } catch (e) {
      if (e && e.name === 'AbortError') return
      fallbackCopy()
    }
    return
  }
  // 微信好友 / 朋友圈：H5 浏览器无法直接调起微信，走复制链接兜底
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    showToast('链接已复制，请在微信中粘贴分享')
  } catch (e) {
    showToast('分享链接：' + shareUrl.value)
  }
}
function fallbackCopy() {
  try {
    navigator.clipboard.writeText(shareUrl.value)
    showToast('链接已复制')
  } catch (e) {
    showToast('分享链接：' + shareUrl.value)
  }
}
function onActivitySignup() {
  bridge.requestPurchase({ type: 'activity', id: id.value })
  showToast('已打开报名')
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
  const tmp = {
    id: 'me' + Date.now(),
    author: '我',
    avatar: '',
    content: text,
    time: '刚刚',
    likes: 0,
    isLiked: false,
    replies: [],
  }
  comments.value.unshift(tmp)
  commentText.value = ''
  showToast('评论成功')
  const res = await commentFeed(id.value, text)
  if (!res.ok) {
    comments.value = comments.value.filter((c) => c.id !== tmp.id)
    showToast('评论失败，请重试')
  } else {
    // 拉取服务端最新评论列表，保证不同客户端看到同一份
    const remote = await fetchComments(id.value)
    if (remote !== null) comments.value = remote
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

// ---- 下拉刷新：拉取最新评论 + 点赞数；线上有新版 JS/CSS 则整页重载 ----
const PULL_THRESHOLD = 60
const pulling = ref(false)
const pullReady = ref(false)
const pullDelta = ref(0)
const refreshing = ref(false)
let touchAttached = false
let pullStartY = 0
function onTouchStart(e) {
  if (refreshing.value) return
  if ((window.scrollY || document.documentElement.scrollTop || 0) > 4) {
    pulling.value = false
    return
  }
  pullStartY = e.touches[0].clientY
  pulling.value = true
  pullReady.value = false
  pullDelta.value = 0
}
function onTouchMove(e) {
  if (!pulling.value || refreshing.value) return
  const y = e.touches[0].clientY
  const delta = y - pullStartY
  if (delta <= 0) { pulling.value = false; return }
  pullDelta.value = Math.min(delta * 0.45, PULL_THRESHOLD * 1.4)
  pullReady.value = pullDelta.value >= PULL_THRESHOLD
}
async function onTouchEnd() {
  if (!pulling.value) return
  pulling.value = false
  if (pullReady.value) await doRefresh()
  pullDelta.value = 0
  pullReady.value = false
}
async function doRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  // 有新版（样式/逻辑改动）→ 整页重载拉新包，否则只刷数据
  if (await hasHotUpdate()) {
    location.reload()
    return
  }
  try {
    // 重新拉取详情（点赞数等）+ 后端评论列表，保证看到别人新发的评论
    await loadItem()
  } catch (e) {
    /* 保持原状 */
  } finally {
    await new Promise((r) => setTimeout(r, 350))
    refreshing.value = false
  }
}
function attachPullRefresh() {
  if (touchAttached) return
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  touchAttached = true
}
function teardownPullRefresh() {
  if (!touchAttached) return
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  touchAttached = false
}
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.topbar {
  height: calc(48px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: env(safe-area-inset-top) 12px 0;
  position: sticky;
  top: 0;
  background: var(--card);
  z-index: 10;
  border-bottom: 1px solid var(--line);
}
.back, .share { display: flex; color: var(--text); }
.t { font-size: 17px; font-weight: 600; color: var(--text); }

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
.replies {
  margin-top: 10px;
  background: #f6f7f9;
  border-radius: var(--radius);
  padding: 8px 10px;
}
.reply { font-size: 13px; color: #444; line-height: 1.6; }
.reply__name { color: var(--brand); font-weight: 500; }

.cinput {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 14px;
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 下拉刷新指示器（位于 sticky 顶栏下方） */
.pull-indicator {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 54px);
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-sub);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 9;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.pull-indicator.pulling,
.pull-indicator.refreshing {
  opacity: 1;
}
.pull-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: var(--brand, #f97316);
  border-radius: 50%;
  animation: pull-spin 0.8s linear infinite;
}
@keyframes pull-spin {
  to { transform: rotate(360deg); }
}
</style>
