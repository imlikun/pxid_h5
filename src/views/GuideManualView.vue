<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">{{ model }} 产品说明书</span>
      <span class="dl" @click="onDownload">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
      </span>
    </div>

    <div class="doc">
      <div v-for="s in manualSections" :key="s.page" class="sec">
        <div class="sec__head">
          <span class="sec__page">{{ s.page }}</span>
          <span class="sec__title">{{ s.title }}</span>
        </div>
        <p class="sec__body">{{ s.body }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { manualSections } from '../data/mock'
import { bridge } from '../bridge'

const route = useRoute()
const model = ref(route.query.model || 'P1')

function onDownload() {
  // 真实环境：调用 bridge 拉起原生下载 / 或直接打开 PDF
  bridge.openNative({ action: 'downloadManual', model: model.value })
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav { height: 48px; display: flex; align-items: center; justify-content: center; position: relative; background: var(--card); border-bottom: 1px solid var(--line); }
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.dl { position: absolute; right: 12px; display: flex; color: var(--text); }
.doc { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.sec { background: var(--card); border-radius: var(--radius); padding: 14px; }
.sec__head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.sec__page { background: var(--text); color: #fff; font-size: 11px; border-radius: var(--radius); padding: 2px 8px; }
.sec__title { font-size: 15px; font-weight: 600; color: var(--text); }
.sec__body { font-size: 13px; color: var(--text-sub); line-height: 1.7; margin: 0; }
</style>
