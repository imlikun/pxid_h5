<template>
  <div class="publish">
    <!-- 顶部：返回 + 发布 -->
    <div class="topbar fade-up">
      <span class="back press" @click="goBack">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="title">发布动态</span>
      <button class="post press pop" :class="{ active: canPost }" :disabled="!canPost" @click="onPublish">发布</button>
    </div>

    <div class="body">
      <div class="card input-wrap fade-up stagger-1 focus-lift">
        <textarea
          class="content"
          v-model="content"
          placeholder="分享你的骑行日常、改装心得或活动体验…&#10;用 #车型# 标记车型，如 #MOTA Z3#"
          maxlength="1000"
        />
        <div class="counter">{{ content.length }}/1000</div>
      </div>

      <!-- 车型选择 -->
      <div class="card section fade-up stagger-2">
        <div class="label">关联车型</div>
        <ModelPicker v-model="carModel" :options="carModels" :visible-count="5" placeholder="选择车型" />
      </div>

      <!-- 用户图片上传 -->
      <div class="card section fade-up stagger-3">
        <div class="label">添加图片</div>
        <div class="uploader">
          <div v-for="(src, i) in selected" :key="i" class="gitem">
            <img :src="src" alt="" />
            <span class="del press" @click="removeImage(i)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </span>
          </div>
          <div v-if="selected.length < 9" class="gitem add press" @click="pickImages">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span class="add-txt">{{ selected.length }}/9</span>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFiles" />
        <div class="hint">最多 9 张，单张自动压缩至 ≤1MB；预览态以 base64 提交，接后端后改直传。</div>
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
import { carModels } from '../data/mock'
import { publishFeed, getDeviceId } from '../api/feed'
import ModelPicker from '../components/ModelPicker.vue'
import bridge from '../bridge'

const router = useRouter()

const content = ref('')
const carModel = ref('')
const selected = ref([]) // base64 data-uri 列表
const fileInput = ref(null)

const MAX_IMAGES = 9
const MAX_BYTES = 1024 * 1024 // 压缩目标 ≤1MB

const canPost = computed(() => content.value.trim().length > 0)

// 选图：触发隐藏 file input
function pickImages() {
  fileInput.value && fileInput.value.click()
}

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = '' // 允许重复选同一文件
  for (const f of files) {
    if (selected.value.length >= MAX_IMAGES) {
      showToast('最多 ' + MAX_IMAGES + ' 张')
      break
    }
    try {
      const dataUrl = await fileToCompressedDataURL(f)
      selected.value.push(dataUrl)
    } catch (err) {
      showToast('图片读取失败')
    }
  }
}

function removeImage(i) {
  selected.value.splice(i, 1)
}

// file → 等比缩放（最长边 ≤1280）+ JPEG 渐进压缩至 ≤1MB
function fileToCompressedDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) return reject(new Error('not-image'))
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const max = 1280
        let { width, height } = img
        if (width > max || height > max) {
          const scale = max / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        let q = 0.82
        let out = canvas.toDataURL('image/jpeg', q)
        while (out.length > MAX_BYTES && q > 0.4) {
          q -= 0.1
          out = canvas.toDataURL('image/jpeg', q)
        }
        resolve(out)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
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

async function onPublish() {
  if (!canPost.value) return
  // 原生环境：交由原生发布器承载（保持契约一致）
  if (bridge.isNative()) {
    bridge.openNative('discover/publish?content=' + encodeURIComponent(content.value.trim()))
    return
  }
  // H5 预览：走数据层发布（后端就绪调 POST /feed；当前 localStorage 持久化，刷新不丢）
  const res = await publishFeed({
    content: content.value.trim(),
    images: selected.value.slice(),
    carModel: carModel.value,
    tags: carModel.value ? [carModel.value] : [],
    nickname: '我',
    deviceId: getDeviceId(),
  })
  if (res.ok) {
    showToast('已发布')
    setTimeout(() => router.push('/discover'), 600)
  } else {
    showToast(res.message || '发布失败')
  }
}
</script>

<style scoped>
.publish {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
}
.topbar {
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 16px;
  background: var(--bg);
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
  background: #fff;
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 500;
  height: 30px;
  padding: 0 14px;
  border-radius: 10px;
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
  background: #fff;
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
.uploader {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.gitem {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg);
}
.gitem img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.gitem.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-hint);
  border: 1.5px dashed var(--line);
  background: var(--bg);
}
.gitem.add:active { background: var(--bg-press); }
.add-txt {
  font-size: 12px;
  color: var(--text-hint);
}
.del {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.del:active { background: rgba(0, 0, 0, 0.7); }
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
