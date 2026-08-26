<template>
  <div class="featured">
    <!-- 顶部：三 tab + 搜索图标 -->
    <TopBar sticky :show-back="false">
      <template #left>
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
      </template>
      <template #right>
        <span class="search-ico">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
      </template>
    </TopBar>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec'">
      <!-- 加载中 -->
      <div v-if="loading" class="load-tip">{{ t('featured.loading') }}</div>

      <!-- 错误提示 -->
      <div v-else-if="error && !all.length" class="err-tip">
        <p>{{ t('featured.loadFail') }}</p>
        <small>{{ error }}</small>
        <button class="press" @click="retry" style="margin-top:8px;padding:6px 16px;border:1px solid var(--brand);border-radius:20px;background:none;color:var(--brand);font-size:13px">{{ t('featured.retry') }}</button>
      </div>

      <template v-else>
      <!-- Banner 车型轮播（2-3 个在售车型，点击跳车型详情） -->
      <div v-if="bannerList.length" class="banner" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div class="banner__track" :style="{ transform: `translateX(-${current * 100}%)` }">
          <div
            v-for="(c, i) in bannerList"
            :key="c.id"
            class="banner__slide press"
            @click="goModel(c)"
          >
            <img class="banner__img" :src="bannerImgOf(c)" :alt="c.name" />
            <div class="banner__mask">
              <div class="banner__name">{{ c.name }}</div>
              <div class="banner__sub">{{ t('featured.viewModel') }}</div>
            </div>
          </div>
        </div>
        <div v-if="bannerList.length > 1" class="banner__dots">
          <span
            v-for="(c, i) in bannerList"
            :key="'dot-' + c.id"
            class="dot"
            :class="{ active: current === i }"
            @click.stop="goBanner(i)"
          ></span>
        </div>
      </div>
      <div v-else class="banner">
        <img class="banner__img" :src="bannerImg" alt="Banner" />
      </div>
      <button class="enter-store press" @click="enterStore">{{ t('featured.enterStore') }}</button>

      <!-- 三个快捷 -->
      <QuickActions :items="featuredQuickI18n" @tap="onQuick" />

      <!-- 热购榜单 -->
      <SectionHeader :title="t('featured.hotTitle')" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in hotProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>

      <!-- 踏春装备 | 限时直降 -->
      <SectionHeader :title="t('featured.springTitle')" :sub="t('featured.springSub')" :more="t('featured.more')" @more="activeTab = 'spring'" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in springProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
      </template><!-- /v-else 有数据 -->
    </template>

    <!-- 踏春装备 -->
    <template v-else-if="activeTab === 'spring'">
      <SectionHeader :title="t('featured.springTitle')" :sub="t('featured.springSub')" :more="t('featured.more')" />
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
      <SectionHeader :title="t('featured.bikesTitle')" :sub="t('featured.bikesSub')" />
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
import TopBar from '../components/TopBar.vue'
import { featuredQuick, plazaShowcase } from '../data/mock'
import { fetchProducts, getProducts, getStore, getLastError, initRegion } from '../api/shop'
import { bridge } from '../bridge'
import { t } from '../i18n'

const router = useRouter()
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'
const store = ref('')
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await initRegion()
    await fetchProducts()
    store.value = getStore()
    error.value = getLastError()
  } finally {
    loading.value = false
  }
  startBanner()
})
onUnmounted(stopBanner)

function enterStore() {
  if (store.value) bridge.openShopify('https://' + store.value)
}

// ---- 顶部 Banner 车型轮播（取 2-3 个代表车型，与发现页"广场-车型展示"同源 plazaShowcase）----
const BANNER_MODEL_IDS = ['scooter-F1', 'ebike-P2', 'motorcycle-P5']
const bannerList = computed(() =>
  plazaShowcase.filter((m) => BANNER_MODEL_IDS.includes(m.id))
)
function bannerImgOf(c) {
  return import.meta.env.BASE_URL + c.cover
}
const current = ref(0)
let _bannerTimer = null

function startBanner() {
  stopBanner()
  if (bannerList.value.length > 1) {
    _bannerTimer = setInterval(() => {
      current.value = (current.value + 1) % bannerList.value.length
    }, 4000)
  }
}
function stopBanner() {
  if (_bannerTimer) {
    clearInterval(_bannerTimer)
    _bannerTimer = null
  }
}
function goBanner(i) {
  current.value = i
  startBanner()
}
function goModel(c) {
  // 优先走 H5 车型详情页（Flutter 端未实现 vehicle 原生路由时会弹 toast 不跳转）
  router.push('/vehicle/' + c.id)
}
let _touchX = 0
function onTouchStart(e) {
  _touchX = e.touches[0].clientX
  stopBanner()
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - _touchX
  const len = bannerList.value.length
  if (dx > 40 && current.value > 0) goBanner(current.value - 1)
  else if (dx < -40 && current.value < len - 1) goBanner(current.value + 1)
  else startBanner()
}

const topTabs = computed(() => [
  { key: 'rec', label: t('featured.tab.rec') },
  { key: 'spring', label: t('featured.tab.spring') },
  { key: 'bikes', label: t('featured.tab.bikes') },
])
const activeTab = ref('rec')

// 精选快捷入口：label 走 i18n（key 不变，展示文案随语言切换）
const featuredQuickI18n = computed(() =>
  featuredQuick.map((q) => ({ ...q, label: t('featured.quick.' + q.key) }))
)

const all = computed(() => getProducts())
const hotProducts = computed(() => all.value.slice(0, 4))
const springProducts = computed(() => {
  const list = all.value
  const f = list.filter(
    (p) => p.collection === 'spring' || (p.tags || []).includes('spring')
  )
  return f.length ? f : list
})
const bikeProducts = computed(() => {
  const list = all.value
  const f = list.filter(
    (p) => p.collection === 'bikes' || (p.tags || []).includes('bike')
  )
  return f.length ? f : list
})

function onQuick(q) {
  if (q.key === 'hot') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (q.key === 'new') {
    activeTab.value = 'spring'
  } else if (q.key === 'points') {
    router.push('/points')
  }
}

async function retry() {
  loading.value = true
  error.value = ''
  try {
    await fetchProducts()
    store.value = getStore()
    error.value = getLastError()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.featured {
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(77, 124, 255, 0.07) 0%, rgba(77, 124, 255, 0) 200px),
    var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
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
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner {
  position: relative;
  margin: 12px 12px 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: var(--card);
}
.banner__track {
  display: flex;
  height: 100%;
  transition: transform 0.4s ease;
}
.banner__slide {
  position: relative;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.banner__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.banner__mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 14px 14px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0));
  color: #fff;
}
.banner__name {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}
.banner__sub {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.9;
  margin-top: 2px;
}
.banner__dots {
  position: absolute;
  right: 12px;
  bottom: 10px;
  display: flex;
  gap: 6px;
  z-index: 2;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.25s;
}
.dot.active {
  width: 16px;
  background: #fff;
  border-radius: 3px;
}
.enter-store {
  display: block;
  margin: 12px 12px 0;
  width: calc(100% - 24px);
  padding: 13px 0;
  border-radius: var(--radius-pill);
  background: var(--brand-gradient);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  border: none;
  box-shadow: 0 4px 14px rgba(77, 124, 255, 0.35);
  transition: transform 0.18s ease;
}
.enter-store:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(77, 124, 255, 0.3);
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 12px 16px;
}
.load-tip,
.err-tip {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-sub);
  font-size: 14px;
}
.err-tip small {
  display: block;
  color: #e53e3e;
  margin-top: 4px;
  font-size: 12px;
}
</style>
