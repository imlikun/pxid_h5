<template>
  <div class="publish">
    <!-- 顶部：返回 + 发布 -->
    <TopBar sticky :title="t('publish.title')" :back="goBack">
      <template #right>
        <button class="post" :class="{ active: canPost && !uploading }" :disabled="!canPost || uploading" @click="onPublish">{{ t('publish.post') }}</button>
      </template>
    </TopBar>

    <div class="body">
      <div class="card input-wrap">
        <textarea
          class="content"
          v-model="content"
          :placeholder="t('publish.placeholder')"
          maxlength="1000"
        />
        <div class="counter">{{ content.length }}/1000</div>
      </div>

      <!-- 车型选择 -->
      <div class="card section">
        <div class="label">{{ t('publish.carModel') }}</div>
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

      <!-- 图片上传（真实上传 /feed/upload，jpg/png/webp 白名单，≤9 张） -->
      <div class="card section">
        <div class="label">{{ t('publish.images') }}</div>
        <div class="gallery">
          <div
            v-for="(g, i) in picked"
            :key="i"
            class="gitem on"
          >
            <img :src="g.url" alt="" />
            <span class="tick" @click="removePick(i)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </span>
            <span v-if="g.uploading" class="upmask">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </span>
          </div>
          <div v-if="picked.length < 9" class="gitem add" @click="pickFiles">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none" @change="onPick" />
        <div class="hint">{{ uploading ? t('publish.uploading') : t('publish.uploadTip') }}</div>
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
import bridge from '../bridge'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const router = useRouter()
const fileInput = ref(null)

const content = ref('')
const carModel = ref('')
// 已选图片：{ file, url(本地预览), uploadedUrl, uploading }
const picked = ref([])
const uploading = ref(false)

const canPost = computed(() => content.value.trim().length > 0 && !uploading.value)

// 选图（≤9 张，jpg/png/webp）
function pickFiles() {
  fileInput.value && fileInput.value.click()
}
function onPick(e) {
  const files = Array.from(e.target.files || [])
  const remain = 9 - picked.value.length
  files.slice(0, remain).forEach((f) => {
    picked.value.push({ file: f, url: URL.createObjectURL(f), uploadedUrl: '', uploading: false })
  })
  e.target.value = ''
}

function removePick(i) {
  const g = picked.value[i]
  if (g.url.startsWith('blob:')) URL.revokeObjectURL(g.url)
  picked.value.splice(i, 1)
}

// 逐张上传 /feed/upload（requireAuth，jpg/png/webp 白名单，单张≤5MB）
async function uploadImages() {
  const token = await bridge.getToken()
  if (!token) throw new Error('NO_TOKEN')
  const pending = picked.value.filter((g) => !g.uploadedUrl)
  if (!pending.length) return
  for (const g of pending) {
    g.uploading = true
    const fd = new FormData()
    fd.append('images', g.file)
    const r = await fetch(API_BASE + '/feed/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    })
    const j = await r.json()
    if (j.code === 0 && j.data && j.data.urls && j.data.urls.length) {
      g.uploadedUrl = j.data.urls[0]
    } else {
      throw new Error(j.message || 'UPLOAD_FAIL')
    }
    g.uploading = false
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

const toast = ref('')
let toastTimer = null
function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

async function onPublish() {
  if (!canPost.value) return
  // 原生环境：交由原生发布器承载（契约一致，图片在原生侧处理）
  if (bridge.isNative()) {
    bridge.openNative('discover/publish?content=' + encodeURIComponent(content.value.trim()))
    return
  }
  uploading.value = true
  try {
    // 1) 先传图
    await uploadImages()
    const images = picked.value.map((g) => g.uploadedUrl).filter(Boolean)
    // 2) 带 token + 当前地区发帖
    const token = await bridge.getToken()
    if (!token) { showToast(t('publish.needLogin')); uploading.value = false; return }
    let region = 'US'
    try {
      const reg = await bridge.getRegion()
      if (['CN', 'BR', 'US'].includes(String(reg).toUpperCase())) region = String(reg).toUpperCase()
    } catch (e) { /* 默认 US */ }
    const cm = carModel.value || ''
    const r = await fetch(API_BASE + '/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        content: content.value.trim(),
        images,
        carModel: cm,
        tags: cm ? [cm] : [],
        region,
        nickname: '骑友',
        deviceId: await bridge.getDeviceId(),
      }),
    })
    const j = await r.json()
    uploading.value = false
    if (j.code === 0) {
      showToast(t('publish.success'))
      setTimeout(() => router.push('/discover'), 600)
    } else {
      showToast(j.message || t('publish.fail'))
    }
  } catch (e) {
    uploading.value = false
    showToast(e.message === 'NO_TOKEN' ? t('publish.needLogin') : t('publish.fail'))
  }
}
</script>

<style scoped>
.publish {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
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
.gitem.add {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-hint);
  border: 1.5px dashed var(--line);
  background: var(--bg);
}
.gitem.add:active {
  background: var(--bg-press);
}
.upmask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
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
