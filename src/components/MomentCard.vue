<template>
  <div class="moment press" @click="open">
    <div class="m-head" @click.stop="goUser">
      <img class="m-avatar" :src="avatarUrl" :alt="item.author" loading="lazy" @error="(e) => handleAvatarError(e, item.author)" />
      <div class="m-meta">
        <div class="m-name"><span v-if="item.pinned" class="m-pin">置顶</span>{{ item.author }}</div>
        <div class="m-time">{{ item.time }}</div>
      </div>
      <button
        v-if="!item.followed"
        class="m-follow"
        @click.stop="onFollow"
      >+ 关注</button>
      <span v-else class="m-followed" @click.stop>已关注</span>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import bridge from '../bridge'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'
import { mediaUrl } from '../storage'
import { requireLogin } from '../utils/auth'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()

const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)

// 图列表兜底：原 images 数组；空就放占位图（FALLBACK）防 m-imgs 区域空白
const FALLBACK = import.meta.env.BASE_URL + 'feed_default.jpg'
const videoCoverUrl = computed(() => {
  const c = mediaUrl(props.item && props.item.videoCover)
  return c || FALLBACK
})
const avatarUrl = computed(() => resolveAvatar(props.item.author, props.item.avatar))
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
  router.push('/feed/' + props.item.id)
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
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
  bridge.openNative('feed/interact?type=like&id=' + props.item.id)
}
async function onFollow() {
  const ok = await requireLogin()
  if (!ok) return
  props.item.followed = true
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
</style>
