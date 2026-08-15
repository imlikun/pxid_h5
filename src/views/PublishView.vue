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
      <div class="card input-wrap">
        <textarea
          class="content"
          v-model="content"
          placeholder="分享你的骑行日常、改装心得或活动体验…&#10;用 #车型# 标记车型，如 #MOTA Z3#"
          maxlength="1000"
        />
        <div class="counter">{{ content.length }}/1000</div>
      </div>

      <!-- 车型选择 -->
      <div class="card section">
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
      </div>

      <!-- 图片选择（本地图库，无后端上传） -->
      <div class="card section">
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
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  border-radius: 50%;
}
.back:active {
  background: var(--bg-press);
}
.title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}
.post {
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 500;
  height: 32px;
  padding: 0 18px;
  border-radius: 12px;
  transition: all 0.15s ease;
}
.post.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.post:disabled {
  pointer-events: none;
}
.body {
  padding: 16px;
}
.card {
  background: var(--card);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}
.input-wrap {
  position: relative;
}
.content {
  width: 100%;
  min-height: 140px;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  line-height: 1.65;
  color: var(--text);
  background: transparent;
  font-family: inherit;
}
.content::placeholder {
  color: var(--text-hint);
}
.counter {
  text-align: right;
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 8px;
  line-height: 1;
}
.section {
  margin-top: 4px;
}
.label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 7px 14px;
  transition: all 0.12s ease;
}
.chip:active {
  transform: scale(0.96);
}
.chip.active {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
  font-weight: 500;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.gitem {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: var(--bg);
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
.gitem.on::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(77, 124, 255, 0.22);
  pointer-events: none;
}
.tick {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}
.hint {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 12px;
  line-height: 1.5;
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
