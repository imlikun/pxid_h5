<template>
  <div class="moment press" @click="open">
    <div class="m-head">
      <img class="m-avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
      <div class="m-meta">
        <div class="m-name">{{ item.author }}</div>
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

    <div class="m-imgs" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <img
        v-for="(img, i) in item.images"
        :key="i"
        class="m-img"
        :class="{ single: cols === 1 }"
        :src="img"
        :alt="item.title"
        @click.stop="onPreview(img)"
      />
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
import { defaultAvatar } from '../data/mock'
import { requireLogin } from '../utils/auth'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()

const liked = ref(!!props.item.isLiked)
const likeCount = ref(props.item.likes || 0)

const cols = computed(() => {
  const n = props.item.images ? props.item.images.length : 0
  if (n <= 1) return 1
  if (n <= 4) return 2
  return 3
})

function open() {
  router.push('/feed/' + props.item.id)
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
