<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">车辆体检</span>
    </div>

    <!-- 当前车辆 -->
    <div class="vehicle">
      <div class="v-img"><IconSvg name="scooter" :size="40" /></div>
      <div class="v-info">
        <div class="v-model">PXID {{ vehicle.model }}</div>
        <div class="v-meta">已绑定 {{ vehicle.days }} 天 · 累计 {{ vehicle.km }} km</div>
      </div>
      <button class="v-switch" @click="switchVehicle">切换</button>
    </div>

    <!-- 体检结果 -->
    <div class="card">
      <div class="card-head">
        <span class="ch-title">系统体检</span>
        <span class="ch-time">{{ lastCheck }}</span>
      </div>

      <div v-if="checking" class="loading">
        <span class="spinner"></span>
        <span>正在读取车载模块数据…</span>
      </div>

      <div v-else class="items">
        <div class="item" v-for="it in items" :key="it.key">
          <span class="dot" :class="'dot--' + it.level"></span>
          <span class="it-name">{{ it.name }}</span>
          <span class="it-val" :class="'val--' + it.level">{{ it.value }}</span>
        </div>
        <div class="summary" :class="'summary--' + overall">
          {{ summaryText }}
        </div>
      </div>
    </div>

    <button class="start" :disabled="checking" @click="startCheck">
      {{ checking ? '体检中…' : '开始远程体检' }}
    </button>
    <p class="hint">远程体检由车载模块回传数据，结果仅供参考；异常项建议预约到店检测。</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()

const vehicle = { model: 'P1', days: 128, km: 1280 }

// 初始演示状态（模拟上次体检结果）
const items = ref([
  { key: 'battery', name: '电池健康', value: '良好 96%', level: 'normal' },
  { key: 'tire', name: '胎压', value: '正常', level: 'normal' },
  { key: 'brake', name: '刹车系统', value: '需关注', level: 'warn' },
  { key: 'motor', name: '电机温度', value: '正常', level: 'normal' },
  { key: 'light', name: '灯光', value: '正常', level: 'normal' },
  { key: 'gps', name: '定位模块', value: '正常', level: 'normal' },
])

const checking = ref(false)
const lastCheck = ref('上次体检：2026-05-20')

const overall = computed(() => {
  if (items.value.some((i) => i.level === 'error')) return 'error'
  if (items.value.some((i) => i.level === 'warn')) return 'warn'
  return 'normal'
})
const summaryText = computed(() => {
  if (overall.value === 'error') return '存在异常项，请尽快到店检测'
  if (overall.value === 'warn') return '部分项目需关注，建议预约保养'
  return '车辆状态良好，可放心骑行'
})

function startCheck() {
  if (checking.value) return
  checking.value = true
  bridge.openNative({ action: 'vehicleCheck', model: vehicle.model })
  // 模拟车载模块回传（原生侧真实实现时由 bridge 回调刷新）
  setTimeout(() => {
    items.value = [
      { key: 'battery', name: '电池健康', value: '良好 98%', level: 'normal' },
      { key: 'tire', name: '胎压', value: '正常', level: 'normal' },
      { key: 'brake', name: '刹车系统', value: '已恢复正常', level: 'normal' },
      { key: 'motor', name: '电机温度', value: '正常', level: 'normal' },
      { key: 'light', name: '灯光', value: '正常', level: 'normal' },
      { key: 'gps', name: '定位模块', value: '正常', level: 'normal' },
    ]
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    lastCheck.value = `上次体检：${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    checking.value = false
  }, 1300)
}

function switchVehicle() {
  bridge.openNative({ action: 'bindVehicle' })
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #ffffff;
}
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }

.vehicle {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  margin: 12px;
  border-radius: var(--radius);
  padding: 14px;
}
.v-img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  background: var(--brand-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  flex: none;
}
.v-info { flex: 1; }
.v-model { font-size: 15px; font-weight: 700; color: var(--text); }
.v-meta { font-size: 12px; color: var(--text-sub); margin-top: 4px; }
.v-switch {
  font-size: 12px;
  color: var(--brand);
  border: 1px solid var(--brand);
  border-radius: var(--radius-lg);
  padding: 6px 14px;
}

.card {
  background: var(--card);
  margin: 0 12px;
  border-radius: var(--radius);
  padding: 4px 14px 14px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0 8px;
}
.ch-title { font-size: 14px; font-weight: 700; color: var(--text); }
.ch-time { font-size: 12px; color: var(--text-sub); }

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid #f2f2f2;
}
.dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.dot--normal { background: #34c759; }
.dot--warn { background: #ff9500; }
.dot--error { background: #ff3b30; }
.it-name { flex: 1; font-size: 14px; color: var(--text); }
.it-val { font-size: 13px; font-weight: 600; }
.val--normal { color: #34c759; }
.val--warn { color: #ff9500; }
.val--error { color: #ff3b30; }

.summary {
  margin-top: 14px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 10px;
  border-radius: 10px;
}
.summary--normal { color: #2a8a3e; background: #eafaf0; }
.summary--warn { color: #b9760a; background: #fff6e6; }
.summary--error { color: #c0392b; background: #fdecea; }

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--text-sub);
  font-size: 13px;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #eee;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.start {
  display: block;
  width: calc(100% - 24px);
  margin: 16px 12px 0;
  padding: 14px 0;
  border-radius: 24px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.start:disabled { opacity: 0.6; }
.hint {
  margin: 12px 16px 0;
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.6;
  text-align: center;
}
</style>
