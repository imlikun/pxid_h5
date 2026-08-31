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
        <span class="search-ico" @click="showSearch = !showSearch">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
      </template>
    </TopBar>

    <!-- 精选搜索（点击右上角图标展开，按商品名本地过滤） -->
    <div v-if="showSearch" class="fsearch">
      <span class="fsearch__icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input
        class="fsearch__input"
        v-model="kw"
        :placeholder="t('featured.searchPlaceholder')"
        @keyup.enter="kw = kw.trim()"
      />
      <span class="fsearch__close" @click="showSearch = false; kw = ''">✕</span>
    </div>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec' && !showSearch">
      <!-- 加载中 -->
      <div v-if="loading" class="load-tip">{{ t('featured.loading') }}</div>

      <!-- 错误提示 -->
      <div v-else-if="error && !all.length" class="err-tip">
        <p>{{ t('featured.loadFail') }}</p>
        <small>{{ error }}</small>
        <button class="press" @click="retry" style="margin-top:8px;padding:6px 16px;border:1px solid var(--brand);border-radius:20px;background:none;color:var(--brand);font-size:13px">{{ t('featured.retry') }}</button>
      </div>

      <template v-else>
      <!-- Banner 产品轮播 -->
      <div v-if="bannerList.length" class="banner" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div class="banner__track" :style="{ transform: `translateX(-${current * 100}%)` }">
          <div
            v-for="(p, i) in bannerList"
            :key="p.id"
            class="banner__slide press"
            @click="goProduct(p)"
          >
            <img class="banner__img" :src="p.cover" :alt="p.name" />
            <div class="banner__mask">
              <div class="banner__name">{{ p.name }}</div>
              <div class="banner__price">
                {{ sym(p.currency) }}{{ p.price }}<span v-if="p.origin" class="banner__origin">{{ sym(p.currency) }}{{ p.origin }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="bannerList.length > 1" class="banner__dots">
          <span
            v-for="(p, i) in bannerList"
            :key="'dot-' + p.id"
            class="dot"
            :class="{ active: current === i }"
            @click.stop="goBanner(i)"
          ></span>
        </div>
      </div>
      <div v-else class="banner">
        <img class="banner__img" :src="bannerImg" alt="Banner" />
      </div>

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

      <button class="enter-store press" @click="enterStore">{{ t('featured.enterStore') }}</button>
      </template><!-- /v-else 有数据 -->
    </template>

    <!-- 踏春装备 -->
    <template v-else-if="activeTab === 'spring' && !showSearch">
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
    <template v-else-if="!showSearch">
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

    <!-- 搜索结果（内联过滤当前已加载商品，按名称匹配） -->
    <template v-else>
      <div class="content">
        <div class="grid2">
          <ProductCard
            v-for="(p, i) in searchResults"
            :key="p.id"
            :product="p"
            :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
          />
        </div>
        <div v-if="!searchResults.length" class="empty-tab">{{ t('featured.searchEmpty') }}</div>
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
import { featuredQuick } from '../data/mock'
import { fetchProducts, getProducts, getStore, getLastError, initRegion, sym, API_BASE } from '../api/shop'
import { bridge } from '../bridge'
import { t, initLocale } from '../i18n'

const router = useRouter()
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'
const store = ref('')
const loading = ref(true)
const error = ref('')

// 精选栏目运营配置（后台 pxid-admin「精选配置」维护；读取失败回退默认值，不白屏）
const cfg = ref({
  bannerHandles: ['p4', '500w-48v-city-folding-electric-scooter-with-app', 'ant5'],
  hotCount: 4,
  springCollection: 'spring',
  bikesCollection: 'bikes',
})
async function fetchFeaturedConfig() {
  try {
    const r = await fetch(`${API_BASE}/featured-config`)
    if (!r.ok) return
    const j = await r.json()
    const d = (j && j.data) || j || {}
    if (Array.isArray(d.bannerHandles) && d.bannerHandles.length) cfg.value.bannerHandles = d.bannerHandles
    if (typeof d.hotCount === 'number') cfg.value.hotCount = d.hotCount
    if (d.springCollection) cfg.value.springCollection = d.springCollection
    if (d.bikesCollection) cfg.value.bikesCollection = d.bikesCollection
  } catch (e) {
    console.warn('[featured] 读取精选配置失败，使用默认值:', e.message || e)
  }
}

onMounted(async () => {
  try {
    await initLocale() // 语言决定内容地区，见 regionFromLocale
    await initRegion()
    await Promise.all([fetchProducts(), fetchFeaturedConfig()])
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

// ---- 顶部 Banner 产品轮播（展示后台配置的车型 handles）----
const current = ref(0)
let _bannerTimer = null
const bannerList = computed(() =>
  all.value.filter(
    (p) => cfg.value.bannerHandles.includes(p.handle) || cfg.value.bannerHandles.includes(String(p.id))
  )
)

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
function goProduct(p) {
  const h = p.handle || p.id
  router.push('/product/' + h)
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

// 精选搜索：点击右上角图标展开，按商品名本地过滤（仅对当前已加载商品生效）
const showSearch = ref(false)
const kw = ref('')
const searchResults = computed(() => {
  const k = (kw.value || '').trim().toLowerCase()
  if (!k) return []
  return all.value.filter(
    (p) => (p.name || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
  )
})

// 精选快捷入口：label 走 i18n（key 不变，展示文案随语言切换）
const featuredQuickI18n = computed(() =>
  featuredQuick.map((q) => ({ ...q, label: t('featured.quick.' + q.key) }))
)

const all = computed(() => getProducts())
const hotProducts = computed(() => all.value.slice(0, cfg.value.hotCount))
const springProducts = computed(() => {
  const list = all.value
  const f = list.filter(
    (p) => p.collection === cfg.value.springCollection || (p.tags || []).includes(cfg.value.springCollection)
  )
  return f.length ? f : list
})
const bikeProducts = computed(() => {
  const list = all.value
  const f = list.filter(
    (p) => p.collection === cfg.value.bikesCollection || (p.tags || []).includes(cfg.value.bikesCollection)
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
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
}
.tabs {
  display: flex;
  align-items: center;
  gap: 16px;
  /* TopBar 自带 padding:0 8px，这里再左推 8px，整体 16px 与下方卡片 margin 对齐 */
  margin-left: 8px;
}
.tab {
  position: relative;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-sub);
  line-height: 1.2;
  padding: 4px 0;
}
.tab.active {
  color: var(--text);
  font-weight: 700;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand, #4a6cf7);
}
.search-ico {
  color: #000000;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.fsearch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 12px 0;
  height: 40px;
  background: var(--surface-2, #f0f1f3);
  border-radius: var(--radius-pill, 999px);
  padding: 0 14px;
}
.fsearch__icon {
  color: var(--text-hint);
  display: flex;
  align-items: center;
}
.fsearch__input {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  background: transparent;
  border: none;
  outline: none;
}
.fsearch__input::placeholder { color: var(--text-hint); }
.fsearch__close {
  color: var(--text-hint);
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
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
.banner__price {
  font-size: 15px;
  font-weight: 700;
}
.banner__origin {
  font-size: 12px;
  font-weight: 400;
  text-decoration: line-through;
  opacity: 0.85;
  margin-left: 6px;
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
  margin: 12px 12px 16px;
  width: calc(100% - 24px);
  padding: 12px 0;
  border-radius: var(--radius-lg);
  background: var(--brand);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  border: none;
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
