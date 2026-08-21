<template>
  <div class="page">
    <TopBar title="车型详情" />

    <div v-if="car" class="body">
      <img class="cover fade-up stagger-1" :src="coverUrl" :alt="car.name" />
      <div class="name fade-up stagger-2">{{ car.name }}</div>
      <div class="specs fade-up stagger-3">
        <div class="spec"><span>续航</span><b>80 km</b></div>
        <div class="spec"><span>最高时速</span><b>25 km/h</b></div>
        <div class="spec"><span>最大载重</span><b>150 kg</b></div>
        <div class="spec"><span>充电时长</span><b>5 h</b></div>
      </div>
      <p class="note">以上为演示参数，最终以原生车型页与购车定制页为准。</p>
    </div>
    <div v-else class="notfound">未找到该车型</div>

    <div class="footer">
      <button class="buy press" @click="onCustomize">立即定制</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { plazaShowcase } from '../data/mock'
import { bridge } from '../bridge'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
const route = useRoute()
const car = computed(() => plazaShowcase.find((c) => c.id === route.params.id) || null)
const coverUrl = computed(() => (car.value ? import.meta.env.BASE_URL + car.value.cover : ''))

function onCustomize() {
  // 决策 8：车型详情页「立即定制」归口购车定制（原生承载；H5 兜底跳 /purchase/customize）
  bridge.openNative('purchase/customize')
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-bottom: calc(76px + env(safe-area-inset-bottom)); }
.body { padding: 12px; }
.cover { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius); background: var(--card); }
.name { font-size: 20px; font-weight: 700; color: var(--text); margin: 14px 0 12px; }
.specs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.spec { background: var(--card); border-radius: var(--radius); padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.spec span { font-size: 12px; color: var(--text-hint); }
.spec b { font-size: 16px; color: var(--text); }
.note { margin-top: 14px; font-size: 12px; color: var(--text-hint); line-height: 1.6; }
.notfound { text-align: center; color: var(--text-hint); padding: 80px 0; }
.footer { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: var(--card); border-top: 1px solid var(--line); }
.buy { width: 100%; height: 48px; border: none; border-radius: 24px; background: var(--brand-gradient); color: #fff; font-size: 16px; font-weight: 600; }
</style>
