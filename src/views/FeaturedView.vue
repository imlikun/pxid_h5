<template>
  <div class="featured">
    <!-- 下拉刷新指示器（手机 WebView 必需，调好后可删除） -->
    <div
      class="pull-indicator"
      :class="{ pulling: pulling, ready: pullReady, refreshing: refreshing }"
      :style="{ transform: pulling && !refreshing ? `translateX(-50%) translateY(${pullDelta - 8}px)` : 'translateX(-50%) translateY(-8px)' }"
    >
      <div class="pull-spinner" v-if="refreshing || pulling"></div>
      <span class="pull-text">{{ refreshing ? '刷新中…' : (pullReady ? '释放刷新' : '下拉刷新') }}</span>
    </div>

    <!-- 顶部：三 tab + 搜索图标 -->
    <div class="topbar">
      <div class="tabs">
        <span
          v-for="t in topTabs"
          :key="t.key"
          class="tab tab-bounce"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
          >{{ t.label }}</span
        >
      </div>
      <span class="search-ico">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
    </div>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec'">
      <!-- Banner -->
      <div class="banner">
        <img class="banner__img" :src="bannerImg" alt="Banner" />
      </div>

      <!-- 三个快捷 -->
      <QuickActions :items="featuredQuick" @tap="onQuick" />

      <!-- 热购榜单 -->
      <SectionHeader title="热购榜单" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in hotProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>

      <!-- 踏春装备 | 限时直降 -->
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" @more="activeTab = 'spring'" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in springProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </template>

    <!-- 踏春装备 -->
    <template v-else-if="activeTab === 'spring'">
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in springProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </template>

    <!-- Bikes -->
    <template v-else>
      <SectionHeader title="Bikes" sub="车型原厂配件" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in bikeProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QuickActions from '../components/QuickActions.vue'
import SectionHeader from '../components/SectionHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import { featuredQuick } from '../data/mock'
import { fetchProducts } from '../api/shop'

const router = useRouter()
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'

const topTabs = [
  { key: 'rec', label: '推荐' },
  { key: 'spring', label: '踏春装备' },
  { key: 'bikes', label: 'Bikes' },
]
const activeTab = ref('rec')

// 商品数据：真实 Shopify（每国店），失败回落 mock
const allProducts = ref([])
async function refreshFeatured() {
  allProducts.value = await fetchProducts()
}
onMounted(async () => {
  await refreshFeatured()
  attachPullRefresh()
})
onUnmounted(() => teardownPullRefresh())

// ===== 下拉刷新（手机 WebView 必备，调好后可删除） =====
const PULL_THRESHOLD = 60 // 释放触发阈值（像素）
const pulling = ref(false)
const pullReady = ref(false)
const pullDelta = ref(0)
const refreshing = ref(false)
let pullStartY = 0
let touchAttached = false

function onTouchStart(e) {
  if (refreshing.value) return
  // 已在内容顶部才响应下拉，避免与正常滚动冲突
  if ((window.scrollY || document.documentElement.scrollTop || 0) > 4) {
    pulling.value = false
    return
  }
  pullStartY = e.touches[0].clientY
  pulling.value = true
  pullReady.value = false
  pullDelta.value = 0
}
function onTouchMove(e) {
  if (!pulling.value || refreshing.value) return
  const y = e.touches[0].clientY
  const delta = y - pullStartY
  if (delta <= 0) { pulling.value = false; return }
  // 阻尼：超过阈值后增速放缓
  pullDelta.value = Math.min(delta * 0.45, PULL_THRESHOLD * 1.4)
  pullReady.value = pullDelta.value >= PULL_THRESHOLD
}
async function onTouchEnd() {
  if (!pulling.value) return
  pulling.value = false
  if (pullReady.value) await doRefresh()
  pullDelta.value = 0
  pullReady.value = false
}
async function doRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refreshFeatured()
  } catch (e) {
    /* swallow; 数据保持原状 */
  } finally {
    // 至少展示 350ms spinner，避免一闪而过
    await new Promise((r) => setTimeout(r, 350))
    refreshing.value = false
  }
}
function attachPullRefresh() {
  if (touchAttached) return
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
  touchAttached = true
}
function teardownPullRefresh() {
  if (!touchAttached) return
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  touchAttached = false
}

const hotProducts = computed(() => allProducts.value.slice(0, 4))
const springProducts = computed(() => allProducts.value.filter((p) => p.collection === 'spring'))
const bikeProducts = computed(() => allProducts.value.filter((p) => p.collection === 'p1parts'))

function onQuick(q) {
  if (q.key === 'hot') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (q.key === 'new') {
    activeTab.value = 'spring'
  } else if (q.key === 'points') {
    router.push('/points')
  }
}
</script>

<style scoped>
.featured {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 14px) 12px 8px;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
}
.tabs {
  display: flex;
  align-items: center;
  gap: 16px;
}
.tab {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-sub);
  line-height: 1.2;
  transform-origin: bottom center;
  transform: scale(0.96);
}
.tab.active {
  color: var(--text);
  font-weight: 700;
}
.search-ico {
  color: #000000;
  display: flex;
  align-items: center;
}
.banner {
  margin: 12px 12px 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.banner__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 12px 16px;
}
/* 下拉刷新指示器（调好后可删除） */
.pull-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-sub);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 9;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.pull-indicator.pulling,
.pull-indicator.refreshing {
  opacity: 1;
}
.pull-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e5e7eb;
  border-top-color: var(--brand, #f97316);
  border-radius: 50%;
  animation: pull-spin 0.8s linear infinite;
}
@keyframes pull-spin {
  to { transform: rotate(360deg); }
}
</style>
