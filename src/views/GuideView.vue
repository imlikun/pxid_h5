<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">使用指南</span>
    </div>

    <div class="hero">
      <img class="hero__img" :src="guideVehicleImg[model]" alt="" />
      <button class="model-pick" @click="showPicker = true">
        {{ model }} <span class="caret">▼</span>
      </button>
    </div>

    <div class="entries">
      <div class="entry" @click="go('video')">
        <div class="entry__txt">
          <div class="entry__t">新手指导视频</div>
          <div class="entry__s">开箱 / 操作 / 保养</div>
        </div>
        <span class="entry__arrow">›</span>
      </div>
      <div class="entry" @click="go('manual')">
        <div class="entry__txt">
          <div class="entry__t">产品资料</div>
          <div class="entry__s">说明书 / 参数</div>
        </div>
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
.page { min-height: 100vh; background: #efefef; padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav { height: 48px; display: flex; align-items: center; justify-content: center; position: relative; background: #ffffff; }
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.hero { position: relative; margin: 12px; border-radius: var(--radius); overflow: hidden; background: #e9e9e9; }
.hero__img { width: 100%; height: 220px; object-fit: cover; display: block; }
.model-pick { position: absolute; left: 12px; top: 12px; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: var(--radius-lg); padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 4px; }
.caret { font-size: 10px; }
.entries { margin: 12px; display: flex; flex-direction: column; gap: 12px; }
.entry { background: #fff; border-radius: var(--radius); padding: 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.entry__t { font-size: 15px; font-weight: 600; color: #333; }
.entry__s { font-size: 12px; color: #999; margin-top: 4px; }
.entry__arrow { color: #ccc; font-size: 22px; }
.picker-mask { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: flex-end; z-index: 50; }
.picker { background: #fff; width: 100%; border-radius: 16px 16px 0 0; padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); animation: rise .2s ease; }
@keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
.picker__item { text-align: center; padding: 14px; font-size: 15px; color: #333; }
.picker__item.active { color: var(--brand); font-weight: 600; }
</style>
