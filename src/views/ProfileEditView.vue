<template>
  <div class="pedit">
    <TopBar sticky title="编辑资料" :back="goBack" />

    <div class="pedit-card">
      <!-- 头像 -->
      <div class="row">
        <span class="row-label">头像</span>
        <div class="avatar-wrap" @click="onPickAvatar">
          <img v-if="avatar" :src="avatar" class="avatar-img" @error="onAvatarError" />
          <span v-else class="avatar-ph">{{ nickname ? nickname.slice(0, 1).toUpperCase() : '?' }}</span>
          <span class="avatar-edit">更换</span>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
      </div>

      <!-- 昵称 -->
      <div class="row">
        <span class="row-label">昵称</span>
        <input
          v-model="nickname"
          class="txt"
          type="text"
          maxlength="20"
          placeholder="请输入昵称"
        />
      </div>

      <!-- 我的车型 -->
      <div class="row">
        <span class="row-label">我的车型</span>
        <div class="car-grid">
          <button
            v-for="c in carOptions"
            :key="c"
            class="car-chip"
            :class="{ on: carModel === c }"
            @click="carModel = c"
          >{{ c }}</button>
          <button class="car-chip" :class="{ on: carModel === '' }" @click="carModel = ''">不填</button>
        </div>
      </div>
    </div>

    <div class="tip">资料将同步到你的动态、评论与「我的」主页</div>

    <button class="save-btn" :disabled="saving" @click="onSave">
      {{ saving ? '保存中…' : '保存' }}
    </button>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { fetchMyProfile, updateMyProfile, uploadMedia } from '../api/feed'
import { CAR_MODEL_LABELS } from '../data/carModels'

const router = useRouter()
const carOptions = CAR_MODEL_LABELS

const nickname = ref('')
const avatar = ref('')
const carModel = ref('')
const saving = ref(false)
const toast = ref('')
const fileInput = ref(null)
let toastTimer = null
let avatarFile = null // 待上传的新头像文件

function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/user/me')
}

function onPickAvatar() {
  fileInput.value && fileInput.value.click()
}

async function onFileChange(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  if (!/^image\//.test(f.type)) { showToast('请选择图片'); return }
  avatarFile = f
  // 本地预览
  avatar.value = URL.createObjectURL(f)
  e.target.value = ''
}

function onAvatarError() {
  avatar.value = ''
}

async function onSave() {
  if (saving.value) return
  saving.value = true
  try {
    let avatarUrl = avatar.value
    // 有选择新头像才上传
    if (avatarFile) {
      showToast('上传头像中…')
      avatarUrl = await uploadMedia(avatarFile)
    }
    const payload = {}
    if (nickname.value.trim()) payload.nickname = nickname.value.trim()
    if (avatarUrl) payload.avatar = avatarUrl
    payload.carModel = carModel.value
    await updateMyProfile(payload)
    showToast('资料已更新')
    setTimeout(() => router.back(), 700)
  } catch (e) {
    showToast('保存失败：' + (e.message || '请重试'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const p = await fetchMyProfile()
    if (p) {
      nickname.value = p.nickname && p.nickname !== '骑友' ? p.nickname : ''
      avatar.value = p.avatar || ''
      carModel.value = p.carModel || ''
    }
  } catch (e) { /* 忽略，允许空白编辑 */ }
})
</script>

<style scoped>
.pedit {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: env(safe-area-inset-bottom);
}
.pedit-card {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f2f3f5;
}
.row:last-child { border-bottom: none; }
.row-label {
  width: 72px;
  flex: none;
  font-size: 15px;
  color: var(--text-sub);
}
.txt {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--text);
  background: transparent;
  text-align: right;
}
.avatar-wrap {
  margin-left: auto;
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #e8ecf4 0%, #dfe3ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-ph { font-size: 22px; font-weight: 700; color: var(--brand, #4a6cf7); }
.avatar-edit {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  font-size: 10px;
  text-align: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  padding: 2px 0;
}
.car-grid {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  max-width: 70%;
}
.car-chip {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid #e3e6ec;
  background: #fff;
  color: var(--text-sub);
}
.car-chip.on {
  border-color: var(--brand, #4a6cf7);
  color: var(--brand, #4a6cf7);
  background: var(--brand-soft, rgba(74, 108, 247, 0.08));
}
.tip {
  margin: 12px 16px;
  font-size: 12px;
  color: var(--text-hint);
}
.save-btn {
  display: block;
  width: calc(100% - 24px);
  margin: 24px 12px;
  padding: 14px 0;
  border: none;
  border-radius: 24px;
  background: var(--brand, #4a6cf7);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.save-btn:disabled { opacity: 0.6; }
.toast {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 22px;
  z-index: 9999;
  white-space: nowrap;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
