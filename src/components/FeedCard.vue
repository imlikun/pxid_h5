<template>
  <div class="fcard press" @click="go">
    <div class="fcard__coverwrap">
      <img class="fcard__cover" :src="coverUrl" :alt="item.title" loading="lazy" @error="onImgErr" />
      <span v-if="item.pinned" class="fcard__pin">置顶</span>
      <span v-if="item.videoUrl" class="fcard__play"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></span>
    </div>
    <div class="fcard__title">{{ item.title }}</div>
    <div class="fcard__foot">
      <div class="author" @click.stop="goUser">
        <img class="avatar" :src="avatarUrl" :alt="item.author" loading="lazy" @error="(e) => handleAvatarError(e, item.author)" />
        <span class="name">{{ item.author }}</span>
      </div>
      <span class="like">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span class="like__num">{{ item.likes }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'
import { mediaUrl } from '../storage'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()
// 封面兜底：cover → images[0] → 静态占位图（避免 src='' 出现 broken 图）
const FALLBACK = import.meta.env.BASE_URL + 'feed_default.jpg'
const coverUrl = computed(() => {
  const it = props.item || {}
  if (it.videoUrl) {
    const c = mediaUrl(it.videoCover)
    if (c) return c
  }
  return it.cover || (Array.isArray(it.images) && it.images[0]) || FALLBACK
})
const avatarUrl = computed(() => resolveAvatar(props.item.author, props.item.avatar))
function onImgErr(e) {
  // 网络抖动/原图失效 → 换兜底（再失败也不再递归）
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}

function go() {
  router.push('/feed/' + props.item.id)
}
// 点作者 → 个人主页（他人/自己统一由主页按 id 识别）
function goUser() {
  if (props.item && props.item.deviceId) router.push('/user/' + encodeURIComponent(props.item.deviceId))
}
</script>

<style scoped>
.fcard {
  background: transparent;
  border-radius: var(--radius);
  overflow: hidden;
}
.fcard__coverwrap {
  position: relative;
}
.fcard__cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.fcard__pin {
  position: absolute;
  top: 6px;
  left: 6px;
  background: var(--brand);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 4px;
  z-index: 2;
}
.fcard__play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  pointer-events: none;
}
.fcard__title {
  padding: 10px 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.45;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fcard__foot {
  padding: 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.name {
  font-size: 12px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.like {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-hint);
  flex: none;
}
.like__num {
  transform: translateY(0.5px);
}
</style>