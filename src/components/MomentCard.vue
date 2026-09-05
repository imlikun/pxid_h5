<template>
  <div class="moment press" @click="open" @touchstart.passive="onWarm" @mouseenter="onWarm">
    <div class="m-head" @click.stop="goUser">
      <img class="m-avatar" :src="avatarUrl" :alt="item.author" loading="lazy" @error="(e) => handleAvatarError(e, item.author)" />
      <div class="m-meta">
        <div class="m-name"><span v-if="item.pinned" class="m-pin">{{ t('feed.pinned') }}</span>{{ item.author }}</div>
        <div class="m-time">{{ formatTime(item.time) }}</div>
      </div>
      <!-- 关注入口已下线（2026-09-05 坤哥拍板：全站不做社交关注）。
           原「+ 关注 / 已关注」按钮块整体移除；后端 canFollow 字段保留，后续如需恢复在此加回。 -->
    </div>

    <div class="m-title">{{ item.title }}</div>
    <div class="m-body">{{ item.content }}</div>

    <div v-if="item.videoUrl" class="m-video" @click.stop="open">
      <img class="m-video__cover" :src="videoCoverUrl" :alt="item.title" loading="lazy" @error="onImgErr" />
      <span class="m-video__play"><svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>
    </div>

    <div class="m-imgs" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <img
        v-for="(img, i) in displayImages"
        :key="i"
        class="m-img"
        :class="{ single: cols === 1 }"
        :src="img"
        :alt="item.title"
        loading="lazy"
        @click.stop="onPreview(img)"
        @error="onImgErr($event)"
      />
      <img v-if="!displayImages.length" class="m-img single" :src="FALLBACK" :alt="item.title" loading="lazy" @error="onImgErr($event)" />
    </div>

    <div class="m-foot">
      <span class="m-tag" @click.stop="onCar(item.carModel)">#{{ item.carModel }}</span>
      <div class="m-acts">
        <span class="m-act" :class="{ liked }" @click.stop="onLike">
          <svg viewBox="0 0 24 24" width="16" height="16" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span>{{ likeCount }}</span>
        </span>
        <span class="m-act" @click.stop="open">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          <span>{{ item.comments }}</span>
        </span>
        <span class="m-act" :class="{ fav: favorited }" @click.stop="onFavorite">
          <svg viewBox="0 0 24 24" width="16" height="16" :fill="favorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </span>
        <span class="m-act" @click.stop="onShare">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>
        </span>
      </div>
    </div>
  </div>
  <transition name="fade">
    <div v-if="toast" class="m-toast">{{ toast }}</div>
  </transition>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import bridge from '../bridge'
import { t } from '../i18n'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'
import { formatTime } from '../utils/time'
import { mediaUrl } from '../storage'
import { captureVideoPoster } from '../utils/videoPoster'
import { requireLogin } from '../utils/auth'
import { likeFeed, toggleFavorite, followUser, prefetchFeedDetail } from '../api/feed'
import { putFeedSnapshot } from '../utils/feedSnapshot'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()

const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)
const favorited = ref(!!props.item.isFavorited)
const toast = ref('')
let toastTimer = null
function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

// 图列表兜底：原 images 数组；空就放占位图（FALLBACK）防 m-imgs 区域空白
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
// 关注按钮可见性：后端按 viewer 注入 canFollow（官方帖 / 自己的帖 = false）。
// 老数据或兜底 mock 没有该字段时默认 true，保持既有行为，避免按钮大面积消失。
const canFollow = computed(() => props.item.canFollow !== false)
const displayImages = computed(() => {
  const imgs = props.item && props.item.images
  return Array.isArray(imgs) ? imgs : []
})
function onImgErr(e) {
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}

const cols = computed(() => {
  const n = props.item.images ? props.item.images.length : 0
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

function open() {
  // 先把卡片手里的这份数据交给详情页直出（省掉转场里的加载圈，见 utils/feedSnapshot.js）
  putFeedSnapshot(props.item)
  router.push('/feed/' + props.item.id)
}
// 预热：手指按下/鼠标移入就提前拉详情，点进去时多数已返回
function onWarm() {
  prefetchFeedDetail(props.item.id)
}
// 点作者（头像/昵称）→ 个人主页（他人/自己统一由主页按 id 识别）
function goUser() {
  if (props.item && props.item.deviceId) router.push('/user/' + encodeURIComponent(props.item.deviceId))
}
function onPreview(img) {
  console.log('preview image:', img)
}
function onCar(model) {
  bridge.openNative('vehicle/' + model)
}
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
async function onFollow() {
  const ok = await requireLogin()
  if (!ok) return
  props.item.followed = true
  // 关注关系必须落库，否则刷新/切页后又变回「+ 关注」（此前只改本地字段 + 通知原生，等于没关注）。
  // 后端 INSERT OR IGNORE 幂等，与原生侧重复写入不冲突。
  const r = await followUser(props.item.deviceId, props.item.memberUserId)
  if (!r.ok) {
    props.item.followed = false
    showToast(r.message || '关注失败')
    return
  }
  bridge.openNative('feed/follow?id=' + props.item.id)
}
</script>

<style scoped>
.moment {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  padding: 12px;
  margin: 0 12px 12px;
}
.m-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.m-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.m-meta { flex: 1; min-width: 0; }
.m-name { font-size: 14px; font-weight: 600; color: var(--text); }
.m-pin {
  display: inline-block;
  font-size: 11px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: 4px;
  padding: 1px 5px;
  margin-right: 6px;
  font-weight: 600;
}
.m-time { font-size: 12px; color: var(--text-hint); margin-top: 2px; }
.m-follow {
  flex: none;
  font-size: 13px;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: var(--radius-pill);
  padding: 5px 12px;
}
.m-followed {
  flex: none;
  font-size: 13px;
  color: var(--text-hint);
}
.m-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.45;
  margin-top: 10px;
}
.m-body {
  font-size: 14px;
  color: #444;
  line-height: 1.7;
  margin-top: 6px;
}
.m-video {
  position: relative;
  margin-top: 10px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
  aspect-ratio: 16 / 9;
  cursor: pointer;
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
.m-imgs {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}
.m-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  display: block;
}
.m-img.single {
  aspect-ratio: 4 / 3;
  max-height: 280px;
}
.m-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.m-tag {
  font-size: 13px;
  color: var(--text-sub);
  background: #f0f1f3;
  border-radius: var(--radius-pill);
  padding: 4px 12px;
}
.m-acts { display: flex; align-items: center; gap: 18px; }
.m-act {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--text-hint);
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
  white-space: nowrap;
}
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
