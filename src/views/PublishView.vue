<template>
  <div class="publish">
    <!-- 顶部：返回 + 发布 -->
    <div class="topbar">
      <span class="back" @click="goBack">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="title">发布动态</span>
      <button class="post" :class="{ active: canPost }" :disabled="!canPost" @click="onPublish">发布</button>
    </div>

    <div class="body">
      <textarea
        class="content"
        v-model="content"
        placeholder="分享你的骑行日常、改装心得或活动体验…&#10;用 #车型# 标记车型，如 #MOTA Z3#"
        maxlength="1000"
      />
      <div class="counter">{{ content.length }}/1000</div>

      <!-- 车型选择 -->
      <div class="label">关联车型</div>
      <div class="chips">
        <span
          v-for="m in carModels"
          :key="m"
          class="chip"
          :class="{ active: carModel === m }"
          @click="carModel = m"
          >{{ m }}</span
        >
      </div>

      <!-- 图片选择（本地图库，无后端上传） -->
      <div class="label">添加图片</div>
      <div class="gallery">
        <div
          v-for="g in gallery"
          :key="g"
          class="gitem"
          :class="{ on: selected.includes(g) }"
          @click="toggle(g)"
        >
          <img :src="imgBase + g" alt="" />
          <span v-if="selected.includes(g)" class="tick">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </span>
        </div>
      </div>
      <div class="hint">预览态图片取自本地图库；接入后端后改为上传。</div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { carModels, defaultAvatar } from '../data/mock'
import { publishGallery, addMoment } from '../store/publish'
import bridge from '../bridge'

const router = useRouter()
const imgBase = import.meta.env.BASE_URL
const gallery = publishGallery

const content = ref('')
const carModel = ref('')
const selected = ref([])

const canPost = computed(() => content.value.trim().length > 0)

function toggle(g) {
  const i = selected.value.indexOf(g)
  if (i >= 0) selected.value.splice(i, 1)
  else if (selected.value.length < 9) selected.value.push(g)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

const toast = ref('')
let t = null
function showToast(m) {
  toast.value = m
  clearTimeout(t)
  t = setTimeout(() => (toast.value = ''), 1600)
}

function onPublish() {
  if (!canPost.value) return
  // 原生环境：交由原生发布器承载（保持契约一致）
  if (bridge.isNative()) {
    bridge.openNative('discover/publish?content=' + encodeURIComponent(content.value.trim()))
    return
  }
  const text = content.value.trim()
  const cm = carModel.value || 'P1'
  const newMoment = {
    id: 'U' + Date.now(),
    itemType: 'moment',
    author: '我',
    avatar: defaultAvatar,
    title: text.slice(0, 20) || '我的动态',
    content: text,
    images: selected.value.slice(),
    tags: cm ? [cm] : [],
    carModel: cm,
    likes: 0,
    isLiked: false,
    comments: 0,
    time: '刚刚',
    followed: false,
    focusCar: cm,
  }
  addMoment(newMoment, '动态')
  showToast('已发布')
  setTimeout(() => router.push('/discover'), 600)
}
</script>

<style scoped>
.publish {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.topbar {
  height: calc(48px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  padding-right: 12px;
  background: var(--card);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.post {
  border: none;
  background: var(--brand);
  color: #fff;
  font-size: 14px;
  padding: 7px 16px;
  border-radius: 18px;
  opacity: 0.4;
}
.post.active {
  opacity: 1;
}
.post:disabled {
  pointer-events: none;
}
.body {
  padding: 14px 16px 24px;
}
.content {
  width: 100%;
  min-height: 130px;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  background: transparent;
  font-family: inherit;
}
.counter {
  text-align: right;
  font-size: 12px;
  color: var(--text-hint);
}
.label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 18px 0 10px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 6px 12px;
}
.chip.active {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
}
.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.gitem {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
}
.gitem.on {
  border-color: var(--brand);
}
.gitem img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tick {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hint {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 10px;
}
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 10px;
  z-index: 100;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
