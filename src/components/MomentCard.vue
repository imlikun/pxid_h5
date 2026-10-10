<template>
  <div class="moment press" :class="{ 'is-reading': selected }" :data-feed-id="item.id" :aria-current="selected ? 'true' : undefined" tabindex="0" @keydown.enter.self="open" @click="open" @touchstart.passive="onWarm" @mouseenter="onWarm">
    <div class="m-head" @click.stop="goUser">
      <img class="m-avatar" :src="avatarUrl" :alt="item.author" loading="lazy" @error="(e) => handleAvatarError(e, item.author)" />
      <div class="m-meta">
        <div class="m-name">{{ item.author }}<span v-if="item.pinned" class="m-pin">{{ t('feed.pinned') }}</span></div>
        <div class="m-time">{{ formatFeedTime(item.time, locale) }}</div>
      </div>
      <button v-if="showFollow && item.canFollow !== false && item.deviceId" type="button" class="m-follow" :class="{ 'm-follow--on': followed }" :disabled="followBusy" @click.stop="onFollow">{{ t(followed ? 'feed.follow.following' : 'feed.follow.follow') }}</button>
      <button type="button" class="m-more" :aria-label="t('feed.moreActions')" @click.stop="showMore = true">···</button>

    </div>

    <div v-if="showTitle" class="m-title">{{ item.title }}</div>
    <div class="m-body">
      <p v-for="(p, i) in paragraphs" :key="i" class="m-p">{{ p }}</p>
    </div>

    <div v-if="item.videoUrl" class="m-video" @click.stop="open">
      <img class="m-video__cover" :src="videoCoverUrl" :alt="item.title" loading="lazy" @error="onImgErr" />
      <span class="m-video__play"><svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>
    </div>

    <FeedMediaGrid v-if="!item.videoUrl && displayImages.length" class="m-media" :images="displayImages" :alt="item.title" :max-count="6" @preview="onPreview" />

    <div class="m-foot">
      <button v-if="item.carModel" type="button" class="m-tag" @click.stop="onCar(item.carModel)">#{{ item.carModel }}</button>
      <button v-if="topicTag" type="button" class="m-tag m-tag--topic" @click.stop="onTopic(topicTag)">#{{ topicTag }}</button>
      <div class="m-acts">
        <button type="button" class="m-act" :class="{ liked }" @click.stop="onLike">
          <svg viewBox="0 0 24 24" width="16" height="16" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span>{{ likeCount }}</span></button>
        <button type="button" class="m-act" @click.stop="open">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <span>{{ item.comments || 0 }}</span></button>
        <button type="button" class="m-act m-act--share" @click.stop="onShare">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg><span>{{ t('feed.share') }}</span></button>
      </div>
    </div>
  </div>
  <FeedImagePreview v-model="previewOpen" :images="displayImages" :start-index="previewIndex" :alt="item.title" />
  <Teleport to="body"><div v-if="showMore" class="m-sheet-mask" @click="showMore = false"><div class="m-sheet" role="dialog" aria-modal="true" :aria-label="t('feed.moreActions')" @click.stop>
    <button type="button" @click="showMore = false; open()">{{ t('feed.goView') }}</button>
    <button type="button" @click="showMore = false; onFavorite()">{{ t(favorited ? 'feed.collect.collected' : 'feed.collect.collect') }}</button>
    <button type="button" @click="showMore = false; onShare()">{{ t('feed.share') }}</button>
    <button type="button" class="m-sheet-cancel" @click="showMore = false">{{ t('feed.cancel') }}</button>
  </div></div></Teleport>
  <transition name="fade">
    <div v-if="toast" class="m-toast">{{ toast }}</div>
  </transition>
</template>

<script setup>
import { computed, ref, watch, nextTick, onDeactivated, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import bridge from '../bridge'
import { t, locale } from '../i18n'
import FeedMediaGrid from './FeedMediaGrid.vue'
import FeedImagePreview from './FeedImagePreview.vue'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'
import { formatFeedTime } from '../utils/time'
import { mediaUrl } from '../storage'
import { captureVideoPoster } from '../utils/videoPoster'
import { requireLogin } from '../utils/auth'
import { likeFeed, toggleFavorite, prefetchFeedDetail, prefetchComments, prewarmFeedMedia, followUser, unfollowUser } from '../api/feed'
import { discussionRoute } from '../utils/discussion'
import { normalizeCarModel } from '../data/carModels'
import { putFeedSnapshot } from '../utils/feedSnapshot'

const props = defineProps({
  item: { type: Object, required: true },
  onSelect: { type: Function, default: null },
  showFollow: Boolean,
  selected: Boolean,
})
const emit = defineEmits(['follow-change', 'change'])
const followed = ref(!!props.item.followed), followBusy = ref(false)
watch(() => props.item.followed, value => { followed.value = !!value })
const topicTag = computed(() => (props.item.tags || []).find(tag => !normalizeCarModel(tag) && !/^act\{/.test(tag)))
async function onFollow() {
  if (followBusy.value || !await requireLogin()) return
  followBusy.value = true
  const next = !followed.value
  try {
    const result = next ? await followUser(props.item.deviceId, props.item.memberUserId) : await unfollowUser(props.item.memberUserId || props.item.deviceId)
    if (!result.ok) { showToast(result.message); return }
    followed.value = next
    emit('follow-change', { deviceId: props.item.deviceId, memberUserId: props.item.memberUserId, followed: next })
  } finally { followBusy.value = false }
}
const router = useRouter()
const route = useRoute()
const previewOpen = ref(false), previewIndex = ref(0), showMore = ref(false)
const showTitle = computed(() => !!props.item.title && !(props.item.content || '').trim().startsWith(props.item.title.trim()))

const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)
const favorited = ref(!!props.item.isFavorited)
watch(() => props.item.isLiked, value => { liked.value = !!value })
watch(() => props.item.likes, value => { likeCount.value = Number(value) || 0 })
watch(() => props.item.isFavorited, value => { favorited.value = !!value })
const toast = ref('')
let toastTimer = null
onDeactivated(() => { showMore.value = false; previewOpen.value = false })
onBeforeUnmount(() => clearTimeout(toastTimer))
function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

// 空图片列表不插入占位图；视频封面失败时才回落本地默认封面。
const FALLBACK = import.meta.env.BASE_URL + 'feed_default.jpg'
// 视频封面：优先 videoCover；为空时 canvas 截首帧兜底，失败回 FALLBACK
const videoCoverUrl = ref(FALLBACK)
function updateVideoCover() {
  const it = props.item || {}
  const c = mediaUrl(it.videoCover)
  if (c) { videoCoverUrl.value = c; return }
  if (it.videoUrl) {
    videoCoverUrl.value = FALLBACK
    const src = mediaUrl(it.videoUrl)
    if (src) nextTick(() => captureVideoPoster(src).then((d) => { if (d) videoCoverUrl.value = d }))
    return
  }
  videoCoverUrl.value = FALLBACK
}
updateVideoCover()
watch(() => props.item, updateVideoCover)
const avatarUrl = computed(() => resolveAvatar(props.item.author, props.item.avatar))
const displayImages = computed(() => {
  const imgs = props.item && props.item.images
  return Array.isArray(imgs) ? imgs.filter(Boolean) : []
})
function onImgErr(e) {
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}


// 正文分段：先按空行(\n\n)/换行(\n)拆块，超长块(>80字)再按句末标点切，避免长句被打断
const paragraphs = computed(() => {
  const text = (props.item && props.item.content) || ''
  if (!text.trim()) return []
  const blocks = text.split(/\n{2,}|\n/).map((s) => s.trim()).filter(Boolean)
  const out = []
  blocks.forEach((b) => {
    if (b.length <= 80) { out.push(b); return }
    const parts = b.split(/(?<=[。！？!?])/)
    let buf = ''
    parts.forEach((p) => {
      if (buf && (buf + p).length > 80) { out.push(buf); buf = p }
      else buf += p
    })
    if (buf) out.push(buf)
  })
  return out
})

function open() {
  if (props.onSelect) { props.onSelect(props.item); return }
  // 先把卡片手里的这份数据交给详情页直出（省掉转场里的加载圈，见 utils/feedSnapshot.js）
  putFeedSnapshot(props.item)
  // App 环境：交 Flutter 原生右进左出路由全屏打开（根页与底栏原样保留），
  // 发送成功必须 return，不得再 router.push（对接说明 2026-09-07）
  if (bridge.openFeedDetailNative(props.item.id)) return
  // 浏览器预览/桌面端/旧 App 回退：H5 自身路由
  // onOpenDetail 通知原生即将进详情（旧契约：Flutter 转场首帧前藏底栏，未实现时静默）
  bridge.onOpenDetail(props.item.id)
  router.push('/feed/' + props.item.id)
}
// 预热：手指按下/鼠标移入就提前拉详情+评论+详情页图片，点进去时多数已返回
function onWarm() {
  prefetchFeedDetail(props.item.id)
  prefetchComments(props.item.id)
  prewarmFeedMedia(props.item)
}
// 点作者（头像/昵称）→ 个人主页（他人/自己统一由主页按 id 识别）
// /user/:id 在全屏白名单内（2026-09-08 对接说明）：根 WebView 发全屏通道，
// 用户主页等二级 WebView 内 openFullscreenRoute 自动回退 router.push
function goUser() {
  if (props.item && props.item.deviceId) {
    const r = '/user/' + encodeURIComponent(props.item.deviceId)
    if (bridge.openFullscreenRoute(r)) return
    router.push(r)
  }
}
function onPreview(index) { previewIndex.value = index; previewOpen.value = true }
function onCar(model) {
  router.push(discussionRoute({ carModel: model, from: route.path === '/discover' ? 'dynamic' : 'detail' }))
}
function onTopic(topic) { router.push(discussionRoute({ topic, from: route.path === '/discover' ? 'dynamic' : 'detail' })) }
async function onLike() {
  const ok = await requireLogin()
  if (!ok) return
  const next = !liked.value
  liked.value = next
  likeCount.value += next ? 1 : -1
  // H5 自管：统一走后端 /feed/:id/like（落 feed_likes 关系表），不再委托 Flutter，保证「赞过」可查
  const profile = await bridge.getUserInfo().catch(() => ({ nickname: '', avatar: '' }))
  const r = await likeFeed(props.item.id, { liked: next, nickname: profile.nickname || '', avatar: profile.avatar || '' })
  if (!r.ok) {
    liked.value = !next
    likeCount.value -= next ? 1 : -1
    showToast('点赞失败，请重试')
  } else {
    liked.value = !!r.isLiked
    if (typeof r.likes === 'number') likeCount.value = r.likes
    emit('change', { ...props.item, isLiked: liked.value, likes: likeCount.value })
  }
}
async function onFavorite() {
  const ok = await requireLogin()
  if (!ok) return
  const next = !favorited.value
  favorited.value = next
  const r = await toggleFavorite(props.item.id, next)
  if (!r.ok) {
    favorited.value = !next
    showToast('收藏失败，请重试')
  } else {
    favorited.value = !!r.favorited
    emit('change', { ...props.item, isFavorited: favorited.value })
    showToast(favorited.value ? '已收藏' : '已取消收藏')
  }
}
// 海外用户无微信：点击分享直接复制链接，不再弹分享面板
async function onShare() {
  const url = location.origin + location.pathname + '#/feed/' + props.item.id
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
</script>

<style scoped>
.m-follow { flex: 0 0 auto; min-height: 44px; padding: 0 10px; color: var(--brand); border: 1px solid var(--brand-soft); border-radius: 8px; font-size: 12px; }
.m-follow--on { color: var(--text-hint); border-color: var(--line); }.m-follow:disabled { opacity: .5; }
.m-tag--topic { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.moment {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: none;
  padding: 14px;
  margin: 0 16px 12px;
}
.m-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.m-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.m-meta { flex: 1; min-width: 0; }
.m-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.m-pin {
  display: inline-block;
  font-size: 10px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: 4px;
  padding: 1px 5px;
  margin-right: 0;
  font-weight: 600;
}
.m-time {
  font-size: 11px;
  color: #8b919c;
  margin-top: 2px;
}
.m-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.55;
  margin-top: 12px;
}
.m-body {
  font-size: 14px;
  color: var(--text);
  line-height: 1.7;
  margin-top: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.m-body .m-p {
  margin: 0 0 12px;
  margin-bottom: 8px;
}
.m-body .m-p:last-child {
  margin-bottom: 0;
}
.m-video {
  position: relative;
  margin-top: 12px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  border: 0;
  background: transparent;
  padding: 0;
}
.m-video__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.m-video__play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.m-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 8px;
}
.m-tag {
  font-size: 11px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 5px 8px;
  border: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.m-acts {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
.m-act {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #687286;
  min-height: 36px;
  cursor: pointer;
}
.m-act.liked { color: var(--price); }
.m-act.fav { color: var(--price); }
.m-toast {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 20px;
  z-index: 9999;
  white-space: normal;
  max-width: calc(100% - 40px);
  overflow-wrap: anywhere;
  box-sizing: border-box;
}
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.m-more { align-self: flex-start; width: 36px; height: 36px; padding: 0; margin: -5px -5px 0 0; border: 0; background: transparent; color: #667084; font-size: 24px; line-height: 1; }

.m-media { margin-top: 12px; }

.m-act svg { width: 18px; height: 18px; }
.m-act, .m-tag, .m-more { min-height: 44px; min-width: 44px; }
.m-more { margin: -5px -5px 0 0; }.m-name, .m-title, .m-pin { font-weight: 500; }
.moment:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.m-sheet-mask { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; justify-content: center; }
.m-sheet { width: 100%; max-width: 480px; background: white; border-radius: 16px 16px 0 0; padding: 8px 16px 16px; }
.m-sheet button { display: block; width: 100%; min-height: 48px; padding: 10px; background: transparent; border: 0; border-bottom: 1px solid #f0f1f4; font-size: 15px; color: var(--text); }
.m-sheet .m-sheet-cancel { color: #8b919c; border-bottom: 0; }
</style>
