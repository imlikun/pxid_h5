<template>
  <div class="page">
    <div class="nav">
      <span class="back press" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">使用指南</span>
    </div>

    <div class="hero fade-up stagger-1">
      <img class="hero__img" :src="guideVehicleImg[model]" alt="" />
      <button class="model-pick press" @click="showPicker = true">
        {{ model }} <span class="caret">▼</span>
      </button>
    </div>

    <div class="entries fade-up stagger-2">
      <div class="entry press" @click="go('video')">
        <span class="entry__icon"><IconSvg name="play-circle" :size="22" /></span>
        <span class="entry__t">新手指导视频</span>
        <span class="entry__arrow">›</span>
      </div>
      <div class="entry press" @click="go('manual')">
        <span class="entry__icon"><IconSvg name="book-open" :size="22" /></span>
        <span class="entry__t">产品资料</span>
        <span class="entry__arrow">›</span>
      </div>
    </div>

    <div v-if="showPicker" class="picker-mask" @click.self="showPicker = false">
      <div class="picker">
        <div
          v-for="m in guideModels"
          :key="m"
          class="picker__item"
          :class="{ active: m === model }"
          @click="selectModel(m)"
        >{{ m }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { guideModels, guideVehicleImg } from '../data/mock'
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()
const model = ref('P1')
const showPicker = ref(false)

function selectModel(m) {
  model.value = m
  showPicker.value = false
}
function go(kind) {
  router.push(`/service/guide/${kind}?model=${model.value}`)
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.nav { height: 48px; display: flex; align-items: center; justify-content: center; position: relative; background: var(--card); border-bottom: 1px solid var(--line); }
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.hero { position: relative; margin: 12px; border-radius: var(--radius); overflow: hidden; background: var(--line); }
.hero__img { width: 100%; height: 220px; object-fit: cover; display: block; }
.model-pick { position: absolute; left: 12px; top: 12px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: var(--radius); padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 4px; }
.caret { font-size: 10px; }
.entries { margin: 12px; background: var(--card); border-radius: var(--radius); overflow: hidden; }
.entry { padding: 16px; display: flex; align-items: center; gap: 12px; }
.entry:first-child { border-bottom: 1px solid var(--line); }
.entry__icon { color: var(--brand); display: flex; }
.entry__t { flex: 1; font-size: 15px; font-weight: 600; color: var(--text); }
.entry__arrow { color: var(--text-hint); font-size: 22px; }
.picker-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; z-index: 50; }
.picker { background: var(--card); width: 100%; border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); animation: rise .2s ease; }
@keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
.picker__item { text-align: center; padding: 14px; font-size: 15px; color: var(--text); }
.picker__item.active { color: var(--brand); font-weight: 600; }
</style>
