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
            @click="selectCar(m)"
            >{{ m }}</span
          >
        </div>
      </div>

      <!-- 图片上传（真实上传 /media/upload，jpg/png/webp 白名单，≤9 张） -->
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
          <div v-if="picked.length < 9" class="gitem add" @click="onPickImageClick">
            <input
              v-if="!isFlutterEnv()"
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;z-index:1;"
              @change="onPick"
              @click.stop
            />
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </div>
        </div>
        <div class="hint">{{ uploading ? t('publish.uploading') : t('publish.uploadTip') }}</div>
      </div>

      <!-- 视频上传（统一 /media/upload，封面自动取首帧，≤60s / ≤200MB） -->
      <div class="card section">
        <div class="label">{{ t('publish.video') }}</div>
          <div v-if="!videoFile" class="vadd" style="position:relative;" @click="onPickVideoClick">
            <input
              v-if="!isFlutterEnv()"
              ref="fileInputVideo"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;z-index:1;"
              @change="onPickVideo"
              @click.stop
            />
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <span>{{ t('publish.addVideo') }}</span>
        </div>
        <div v-else class="vprev">
          <video class="vprev__v" :src="videoFile.url" muted playsinline preload="metadata"></video>
          <span class="vprev__del" @click="removeVideo">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </span>
          <span class="vprev__dur">{{ Math.round(videoFile.duration || 0) }}s</span>
        </div>
        <div class="hint">{{ t('publish.videoTip') }}</div>
      </div>

      <!-- 发布选项：位置 + @提到 -->
      <div class="card section opts">
        <button class="opt" :class="{ on: located }" @click="onLocate" :disabled="locating">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ locating ? '…' : (located ? t('publish.locationOn') : t('publish.location')) }}
        </button>
        <button class="opt" @click="openMention">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
          {{ t('publish.mention') }}
        </button>
        <div v-if="mentions.length" class="mtags">
          <span v-for="m in mentions" :key="m.deviceId" class="mtag">@{{ m.nickname }}</span>
        </div>
      </div>
    </div>

    <!-- @选人弹层 -->
    <transition name="fade">
      <div v-if="showMention" class="sheet-mask" @click="showMention = false">
        <div class="sheet" @click.stop>
          <div class="sheet__title">{{ t('publish.mentionTitle') }}</div>
          <div class="sheet__list">
            <div v-for="u in mentionUsers" :key="u.deviceId" class="sheet__item" @click="pickMention(u)">{{ u.nickname }}</div>
            <div v-if="!mentionUsers.length" class="sheet__empty">{{ t('publish.mentionEmpty') }}</div>
          </div>
          <div class="sheet__cancel" @click="showMention = false">{{ t('feed.cancel') }}</div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { carModels } from '../data/mock'
import bridge from '../bridge'
import { getDeviceId } from '../utils/device'
import { t, locale, regionFromLocale } from '../i18n'
import { fetchFeedUsers } from '../api/feed'
import { uploadMedia } from '../storage'
import TopBar from '../components/TopBar.vue'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const router = useRouter()
const route = useRoute()
const fileInput = ref(null)
const fileInputVideo = ref(null)

const content = ref('')
const carModel = ref('')
// 我的车型回退方案：H5 localStorage 记忆（Flutter getUserInfo 未返回 carModel 时使用）
// 第一方案仍是 Flutter getUserInfo().carModel，此处仅作兜底
const MY_CAR_KEY = 'pxid_my_car_model'
function persistMyCar(model) {
  if (model && carModels.includes(model)) {
    try { localStorage.setItem(MY_CAR_KEY, model) } catch (e) {}
  }
}
function selectCar(m) {
  carModel.value = m
  persistMyCar(m)
}
// 从广场车型卡跳过来时预选车型（?carModel=P2），并记忆
const presetModel = route.query.carModel
if (presetModel && carModels.includes(presetModel)) {
  carModel.value = presetModel
  persistMyCar(presetModel)
}
// 已选图片：{ file, url(本地预览), uploadedUrl, uploading }
const picked = ref([])
const uploading = ref(false)
// 已选视频：{ file, url(本地预览), duration }
const videoFile = ref(null)

// 定位（附近 LBS）与 @提到 状态
const lat = ref(null)
const lng = ref(null)
const located = ref(false)
const locating = ref(false)
const showMention = ref(false)
const mentionUsers = ref([])
const mentions = ref([]) // [{ deviceId, nickname }]

// 发布内容所属地区由当前语言映射：zh→CN，pt→BR，en→US
function getRegion() {
  return regionFromLocale(locale.value)
}

async function getLocation() {
  // 优先原生桥（Flutter 注入坐标），降级浏览器 geolocation
  try {
    const loc = await bridge.getLocation()
    if (loc && loc.lat != null && loc.lng != null) return loc
  } catch (e) {}
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000 }
    )
  })
}

async function onLocate() {
  if (located.value) {
    located.value = false
    lat.value = null
    lng.value = null
    return
  }
  locating.value = true
  const loc = await getLocation()
  locating.value = false
  if (loc) {
    lat.value = loc.lat
    lng.value = loc.lng
    located.value = true
  } else {
    showToast(t('publish.locationFail'))
  }
}

async function openMention() {
  const region = await getRegion()
  const list = await fetchFeedUsers(region)
  mentionUsers.value = list
  showMention.value = true
}

function pickMention(u) {
  if (!mentions.value.find((m) => m.deviceId === u.deviceId)) {
    mentions.value.push({ deviceId: u.deviceId, nickname: u.nickname })
  }
  content.value = (content.value ? content.value + ' ' : '') + '@' + u.nickname + ' '
  showMention.value = false
}

const canPost = computed(() => content.value.trim().length > 0 && !uploading.value)

// 图片/视频选择入口
// ⚠️ 关键修复：Flutter WebView 内 <input type=file> 没有 file-chooser delegate 时点击会「完全没反应」。
//   旧逻辑在 native 环境下若桥未实现就静默回退 file input，正是「点击加号没反应」的真因之一。
//   现改为：native 环境必须真正发起 bridge.pickImages/pickVideo 调用（让 Flutter 侧产生 request 日志），
//   桥缺失/失败后给出明确 toast 并打印诊断，绝不再静默回退 file input。
//   判据用 window.PXIDBridge.isNative 的 truthy（而非严格 ===true），容错 Flutter 误传字符串 'true'。
function isFlutterEnv() {
  return !!(window.PXIDBridge && window.PXIDBridge.isNative)
}
async function onPickImageClick() {
  if (isFlutterEnv()) {
    try {
      const remain = 9 - picked.value.length
      if (remain <= 0) return
      const images = await bridge.pickImages({ maxCount: remain })
      if (Array.isArray(images)) {
        for (const img of images) {
          const url = img.url || img.path || img.uri || ''
          if (url) picked.value.push({ file: null, url, uploadedUrl: url, uploading: false })
        }
      } else {
        showToast('选择图片失败')
      }
    } catch (e) {
      console.error('[Publish] pickImages failed:', e, {
        isNative: window.PXIDBridge && window.PXIDBridge.isNative,
        hasPickImages: !!(window.PXIDBridge && typeof window.PXIDBridge.pickImages === 'function'),
      })
      showToast(e && e.message ? e.message : '选择图片失败')
    }
    return
  }
  // 独立预览（浏览器）：走原生文件选择
  if (fileInput.value) fileInput.value.click()
}
async function onPickVideoClick() {
  if (isFlutterEnv()) {
    try {
      const video = await bridge.pickVideo({ maxDuration: 60 })
      if (video && video.url) {
        videoFile.value = { file: null, url: video.url, duration: video.duration || 0 }
      } else {
        showToast('选择视频失败')
      }
    } catch (e) {
      console.error('[Publish] pickVideo failed:', e, {
        isNative: window.PXIDBridge && window.PXIDBridge.isNative,
        hasPickVideo: !!(window.PXIDBridge && typeof window.PXIDBridge.pickVideo === 'function'),
      })
      showToast(e && e.message ? e.message : '选择视频失败')
    }
    return
  }
  if (fileInputVideo.value) fileInputVideo.value.click()
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

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.src = URL.createObjectURL(file)
    v.onloadedmetadata = () => { resolve(v.duration || 0); URL.revokeObjectURL(v.src) }
    v.onerror = () => { resolve(0); URL.revokeObjectURL(v.src) }
  })
}
async function onPickVideo(e) {
  const f = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!f) return
  if (f.size > 200 * 1024 * 1024) { showToast(t('publish.videoTooBig')); return }
  const dur = await getVideoDuration(f)
  if (dur > 60) { showToast(t('publish.videoTooLong')); return }
  if (videoFile.value && videoFile.value.url) URL.revokeObjectURL(videoFile.value.url)
  videoFile.value = { file: f, url: URL.createObjectURL(f), duration: dur }
}
function removeVideo() {
  if (videoFile.value && videoFile.value.url) URL.revokeObjectURL(videoFile.value.url)
  videoFile.value = null
}
// 抽首帧当封面（返回 jpeg blob）
function captureFrame(file, atSec = 0.1) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.src = URL.createObjectURL(file)
    v.onloadedmetadata = () => { v.currentTime = Math.min(atSec, (v.duration || 1) / 2) }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas')
        c.width = v.videoWidth
        c.height = v.videoHeight
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((blob) => { URL.revokeObjectURL(v.src); resolve(blob) }, 'image/jpeg', 0.8)
      } catch (e) { URL.revokeObjectURL(v.src); resolve(null) }
    }
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(null) }
  })
}

// 逐张上传图片（统一走 storage/uploadMedia，local 模式即 /media/upload，返回完整 URL 与 images 字段约定一致）
async function uploadImages() {
  const token = await bridge.getAuthToken()
  if (!token) throw new Error('NO_TOKEN')
  const pending = picked.value.filter((g) => !g.uploadedUrl && g.file)
  if (!pending.length) return
  for (const g of pending) {
    g.uploading = true
    const r = await uploadMedia(g.file, token)
    g.uploadedUrl = r.url
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
  // 统一走 H5 自管发布（选→传→发），不再甩回原生 openNative，确保图片/视频都能上传
  uploading.value = true
  try {
    const token = await bridge.getAuthToken()
    if (!token) { showToast(t('publish.needLogin')); uploading.value = false; return }
    const region = await getRegion()
    const cm = carModel.value || ''
    // 1) 图片
    await uploadImages()
    const images = picked.value.map((g) => g.uploadedUrl).filter(Boolean)
    // 2) 视频 + 封面（封面自动抽首帧；原生环境 Flutter 已上传直接取 URL）
    let videoKey = ''
    let coverKey = ''
    if (videoFile.value) {
      if (videoFile.value.file) {
        const blob = await captureFrame(videoFile.value.file, 0.1)
        if (blob) {
          const coverFile = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
          const cr = await uploadMedia(coverFile, token)
          coverKey = cr.objectKey
        }
        const vr = await uploadMedia(videoFile.value.file, token)
        videoKey = vr.objectKey
      } else if (videoFile.value.url) {
        videoKey = videoFile.value.url
      }
    }
    // 3) 发帖
    const profile = await bridge.getUserInfo().catch(() => ({}))
    const r = await fetch(API_BASE + '/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        content: content.value.trim(),
        images,
        carModel: cm,
        tags: cm ? [cm] : [],
        region,
        // ⚠️ 不再兜底「骑友」（2026-09-01 北帆整改清单 问题D）：取不到就传空，
        //    由后端按 token 身份从 user_profiles 解析真实昵称；传「骑友」会被写进 feeds 表
        //    并在后续 /users/me 兜底查询里被当成真实昵称回显。
        nickname: profile.nickname || '',
        avatar: profile.avatar || '',
        deviceId: await getDeviceId(),
        lat: lat.value,
        lng: lng.value,
        mentions: mentions.value.map((m) => ({ deviceId: m.deviceId, nickname: m.nickname })),
        video: videoKey,
        cover: coverKey,
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
    console.error('[Publish] error:', e)
    showToast(e.message === 'NO_TOKEN' ? t('publish.needLogin') : (e.message || t('publish.fail')))
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
/* 视频选择 */
.vadd {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-sub);
  border: 1.5px dashed var(--line);
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  font-size: 14px;
}
.vadd:active {
  background: var(--bg-press);
}
.vprev {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 16 / 9;
}
.vprev__v {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.vprev__del {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.vprev__dur {
  position: absolute;
  left: 8px;
  bottom: 8px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 4px;
  padding: 2px 6px;
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

/* @选人弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: var(--card, #fff);
  border-radius: 20px 20px 0 0;
  padding: 12px 0 24px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.sheet__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
  padding: 8px 20px 14px;
}
.sheet__list {
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}
.sheet__item {
  padding: 14px 20px;
  font-size: 15px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.sheet__item:active {
  background: var(--bg-press, rgba(0,0,0,0.05));
}
.sheet__empty {
  padding: 30px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--text-hint);
}
.sheet__cancel {
  margin-top: 10px;
  padding: 14px 20px;
  text-align: center;
  font-size: 16px;
  color: var(--text-sub);
  font-weight: 500;
  border-top: 1px solid var(--line);
  cursor: pointer;
}
.sheet__cancel:active {
  background: var(--bg-press, rgba(0,0,0,0.05));
}
</style>
