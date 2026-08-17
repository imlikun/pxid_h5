<template>
  <div class="page">
    <!-- 顶部导航 -->
    <div class="nav">
      <span class="back press" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">道路救援</span>
      <span class="search" @click="onSearch">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      </span>
    </div>

    <!-- 地图区域（约 60%，原生能力，此处占位） -->
    <div class="map fade-up stagger-1" @click="onMap">
      <div class="map-marker">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
          <path d="M5.5 12.5l3-1 2 2 3-3 1.5 1.5a3 3 0 11-1.4 1.4L14 12l-3 3-2-2-2 1.5z"/>
        </svg>
        <div class="map-marker-base"></div>
      </div>
      <span class="map-tip">地图区域 · 原生提供</span>
    </div>

    <!-- 双 Tab -->
    <div class="tabs fade-up stagger-2">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }}</div>
    </div>

    <!-- 地址行 -->
    <div class="address press fade-up stagger-3" @click="onAddress">
      <svg class="addr-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
      <span class="addr-text">{{ addressText }}</span>
      <svg class="addr-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </div>

    <!-- 表单（每个字段独立卡片） -->
    <div class="field press fade-up stagger-4" @click="showTime = !showTime">
      <span class="f-label">救援时间</span>
      <span class="f-value">{{ rescueTime }}</span>
      <svg class="f-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7F7F7F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
      <div v-if="showTime" class="picker">
        <div v-for="opt in timeOptions" :key="opt" class="picker-item" @click.stop="pickTime(opt)">{{ opt }}</div>
      </div>
    </div>

    <div class="field fade-up stagger-5">
      <span class="f-label">联系电话</span>
      <input
        v-model="phone"
        class="f-input"
        type="tel"
        placeholder="请填写联系电话"
        @focus="onFieldFocus"
      />
    </div>

    <div class="field field--area fade-up stagger-6">
      <span class="f-label">故障描述</span>
      <textarea
        v-model="desc"
        class="f-area"
        rows="3"
        placeholder="请文字描述或上传图片"
        @focus="onFieldFocus"
      ></textarea>
      <svg class="f-icon f-icon--pen" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7F7F7F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>
    </div>

    <!-- 吸底按钮 -->
    <div class="footer fade-up stagger-7">
      <button class="submit pop press" @click="onSubmit">发起救援</button>
    </div>

    <!-- 轻提示 -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { bridge } from '../bridge'

const router = useRouter()

const tabs = [
  { key: 'road', label: '道路救援' },
  { key: 'shop', label: '到店维修' },
]
const activeTab = ref('road')

const addressText = ref('淮安市清江浦区深圳东路18号4号厂房第三层')

const rescueTime = ref('立即')
const showTime = ref(false)
const timeOptions = ['立即', '1 小时后', '2 小时后', '今天 18:00', '明天 09:00']
const phone = ref('')
const desc = ref('')
const toast = ref('')

function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1800)
}

function pickTime(opt) {
  rescueTime.value = opt
  showTime.value = false
}

function onFieldFocus() {
  showTime.value = false
}

function onSearch() {
  showToast('搜索功能由原生提供')
}

function onMap() {
  bridge.openMap({ name: addressText.value })
}

function onAddress() {
  if (activeTab.value === 'shop') {
    router.push('/service/stores')
    return
  }
  bridge.openMap({ name: addressText.value })
}

watch(activeTab, (v) => {
  addressText.value =
    v === 'shop'
      ? '请选择服务门店'
      : '淮安市清江浦区深圳东路18号4号厂房第三层'
})

function onSubmit() {
  if (!phone.value.trim()) {
    showToast('请填写联系电话')
    return
  }
  if (!desc.value.trim()) {
    showToast('请描述故障情况')
    return
  }
  const rescueParams = new URLSearchParams({
    type: activeTab.value,
    time: rescueTime.value,
    phone: phone.value,
    desc: desc.value,
    address: addressText.value,
  }).toString()
  bridge.openNative('rescue/submit?' + rescueParams)
  showToast('救援请求已提交')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(76px + env(safe-area-inset-bottom));
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
}
.back { position: absolute; left: 12px; display: flex; color: #333; }
.title { font-size: 17px; font-weight: 600; color: #333; }
.search { position: absolute; right: 14px; display: flex; color: #333; }

.tabs {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
}
.tab {
  flex: 1;
  text-align: center;
  font-size: 15px;
  color: #999;
  padding: 12px 0 14px;
  position: relative;
}
.tab.active {
  color: var(--brand);
  font-weight: 600;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand);
}

.map {
  position: relative;
  height: 320px;
  margin: 12px;
  border-radius: var(--radius);
  background:
    linear-gradient(135deg, #e8eef7 0%, #dbe6f5 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.map-marker {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}
.map-marker-base {
  position: absolute;
  bottom: -6px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 10px solid var(--brand);
  filter: blur(0.3px);
}
.map-tip {
  position: absolute;
  bottom: 8px;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.7);
  padding: 2px 8px;
  border-radius: 10px;
}

.address {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.addr-icon { flex: none; color: var(--brand); }
.addr-text {
  flex: 1;
  font-size: 16px;
  color: #111111;
}
.addr-arrow { flex: none; }

.field {
  position: relative;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  margin: 0 12px 12px;
}
.field:last-child { margin-bottom: 0; }
.field--area { align-items: flex-start; }
.f-label {
  width: 72px;
  flex: none;
  font-size: 16px;
  color: #111111;
  font-weight: 400;
}
.f-value {
  flex: 1;
  font-size: 16px;
  color: #111111;
}
.f-input, .f-area {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #111111;
  background: transparent;
  resize: none;
  font-family: inherit;
}
.f-input::placeholder, .f-area::placeholder { color: #7F7F7F; }
.f-icon { flex: none; margin-left: 8px; }
.f-icon--pen { align-self: flex-start; margin-top: 2px; }

.picker {
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 20;
  overflow: hidden;
}
.picker-item {
  padding: 12px;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #f2f2f2;
}
.picker-item:last-child { border-bottom: none; }
.picker-item:active { background: #f5f7ff; }

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}
.submit {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 10px;
  background: #2F2F2F;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 8px;
  z-index: 100;
}
</style>
