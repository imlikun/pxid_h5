<template>
  <div class="featured" :class="{ 'featured--native': bridge.isNative(), split: isSplit }">
    <div class="cols">
    <div class="leftcol">
    <!-- 顶部：三 tab + 我的订单入口（右上角） -->
    <TopBar sticky :show-back="false">
      <template #left>
        <RootTabs v-model="activeTab" :items="topTabs" :aria-label="t('featured.sections')" />
      </template>
      <template #right>
        <button type="button" class="my-order-btn" @click="openSecondary('/order/list')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span class="my-order-btn__txt">{{ t('featured.myOrder') }}</span>
        </button>
      </template>
    </TopBar>

    <!-- 精选搜索（常驻搜索条，按商品名本地过滤，与发现栏目一致） -->
    <div class="search">
      <span class="sicon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input
        class="sinput"
        v-model="kw"
        :placeholder="t('featured.searchPlaceholder')"
        @keyup.enter="onSearchEnter"
        @compositionstart="isComposing = true"
        @compositionend="onCompositionEnd"
        @click.stop
      />
      <button v-if="kw" type="button" class="search__clear" :aria-label="t('featured.clearSearch')" @click="clearSearch">✕</button>
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
          <button type="button"
            v-for="(p, i) in bannerList"
            :key="p.id"
            class="banner__slide press"
            :aria-label="p.name"
            @click="goProduct(p)"
          >
            <span class="banner__wordmark" aria-hidden="true">PXID</span>
            <span class="banner__handwriting" aria-hidden="true">Better Ride<br />A Brighter Tomorrow</span>
            <img class="banner__img" :src="p.cover" alt="" :loading="i < 2 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : undefined" />
            <div class="banner__mask">
              <div class="banner__eyebrow">PXID <span>RIDE A BRIGHTER TOMORROW</span></div>
              <div class="banner__name">{{ p.name }}</div>
              <div v-if="p.handle === HERO_HANDLE" class="banner__tagline">{{ t('featured.bannerTagline') }}</div>
              <div class="banner__price">
                {{ sym(p.currency) }}{{ p.price }}<span v-if="p.origin" class="banner__origin">{{ sym(p.currency) }}{{ p.origin }}</span>
              </div>
              <span class="banner__cta">{{ t('featured.viewNow') }} <span aria-hidden="true">→</span></span>
            </div>
          </button>
        </div>
        <div v-if="bannerList.length > 1" class="banner__dots">
          <button type="button"
            v-for="(p, i) in bannerList"
            :key="'dot-' + p.id"
            class="dot"
            :class="{ active: current === i }"
            :aria-label="`${i + 1} / ${bannerList.length}`"
            :aria-current="current === i ? 'true' : undefined"
            @click.stop="goBanner(i)"
          ></button>
        </div>
      </div>
      <div v-else class="banner">
        <img class="banner__img" :src="bannerImg" alt="Banner" />
      </div>

      <!-- 三个快捷 -->
      <QuickActions :items="featuredQuickI18n" @tap="onQuick" />

      <!-- 热购榜单 -->
      <div ref="hotSectionRef" class="hot-section"><SectionHeader :title="t('featured.hotTitle')" /></div>
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in hotProducts"
          :key="p.id"
          :product="p"
          :action-label="t('featured.chooseOptions')" :on-select="isSplit ? selectProduct : null"
          :class="[fadeUp(), staggerFor(i)]"
        />
      </div>

      <!-- 整车精选：沿用现有陈列样式，商品仍来自真实商城 -->
      <section class="vehicle-panel">
        <SectionHeader :title="t('featured.vehiclesTitle')" :sub="t('featured.vehiclesSub')" :description="t('featured.vehiclesDescription')" :more="t('featured.more')" @more="activeTab = 'vehicles'" />
        <div class="grid2">
          <ProductCard
            v-for="(p, i) in vehicleProducts"
            :key="p.id"
            :product="p"
            :badge="saleBadge(p)"
            :action-label="t('featured.chooseOptions')" :on-select="isSplit ? selectProduct : null"
            :class="[fadeUp(), staggerFor(i)]"
          />
        </div>
      </section>

      <div class="store-footer">
        <button class="enter-store press" @click="enterStore" :disabled="!store">
          <span>{{ t('featured.enterStore') }}</span><span class="enter-store__arrow" aria-hidden="true">→</span>
        </button>
        <div class="store-trust">
          <div class="store-trust__item"><span class="store-trust__icon"><IconSvg name="shield-check" :size="23" /></span><span class="store-trust__copy"><strong>{{ t('featured.trustOfficial') }}</strong><small>{{ t('featured.trustOfficialSub') }}</small></span></div>
          <div class="store-trust__item"><span class="store-trust__icon"><IconSvg name="shopping-cart" :size="23" /></span><span class="store-trust__copy"><strong>{{ t('featured.trustCheckout') }}</strong><small>{{ t('featured.trustCheckoutSub') }}</small></span></div>
          <div class="store-trust__item"><span class="store-trust__icon"><IconSvg name="clipboard-list" :size="23" /></span><span class="store-trust__copy"><strong>{{ t('featured.trustOrders') }}</strong><small>{{ t('featured.trustOrdersSub') }}</small></span></div>
        </div>
      </div>
      </template><!-- /v-else 有数据 -->
    </template>

    <!-- 整车 -->
    <template v-else-if="activeTab === 'vehicles' && !showSearch">
      <section class="vehicle-panel">
        <SectionHeader :title="t('featured.vehiclesTitle')" :sub="t('featured.vehiclesSub')" :description="t('featured.vehiclesDescription')" />
        <div class="grid2">
          <ProductCard
            v-for="(p, i) in vehicleProducts"
            :key="p.id"
            :product="p"
            :badge="saleBadge(p)"
            :action-label="t('featured.chooseOptions')" :on-select="isSplit ? selectProduct : null"
            :class="[fadeUp(), staggerFor(i)]"
          />
        </div>
        <div v-if="!loading && !vehicleProducts.length" class="empty-tab">{{ t('featured.noVehicles') }}</div>
      </section>
    </template>

    <!-- 原厂配件 -->
    <template v-else-if="!showSearch">
      <SectionHeader :title="t('featured.partsTitle')" :sub="t('featured.partsSub')" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in partProducts"
          :key="p.id"
          :product="p"
          :action-label="t('featured.chooseOptions')" :on-select="isSplit ? selectProduct : null"
          :class="[fadeUp(), staggerFor(i)]"
        />
      </div>
      <div v-if="!loading && !partProducts.length" class="empty-tab">{{ t('featured.noParts') }}</div>
    </template>

    <!-- 搜索结果（内联过滤当前已加载商品，按名称匹配） -->
    <template v-else>
      <div class="content">
        <div class="grid2">
          <ProductCard
            v-for="(p, i) in searchResults"
            :key="p.id"
            :product="p"
            :action-label="t('featured.chooseOptions')" :on-select="isSplit ? selectProduct : null"
            :class="[fadeUp(), staggerFor(i)]"
          />
        </div>
        <div v-if="!searchResults.length" class="empty-tab">{{ t('featured.searchEmpty') }}</div>
      </div>
    </template>
    </div><!-- /leftcol -->

    <!-- 折叠屏右栏商品详情面板：分栏态（≥600px）下作为 .cols 直接子节点与 .leftcol 左右并排。
         点左栏商品卡片切换、▲▼连翻；手机态不渲染。 -->
    <div v-if="isSplit" class="panel">
      <div class="panel__nav">
        <span class="panel__tag">商品详情</span>
        <button class="panel__navbtn" @click="stepDetail(-1)" :disabled="!all.length">▲ 上一条</button>
        <button class="panel__navbtn" @click="stepDetail(1)" :disabled="!all.length">▼ 下一条</button>
      </div>
      <div v-if="detailLoading || !detailItem" class="panel__loading">
        <span v-if="!selectedProduct">选一件商品看看</span>
        <span v-else>加载详情中…</span>
      </div>
      <template v-else>
        <div class="panel__scroll">
          <!-- 图廊（同 ProductDetailView） -->
          <div class="panel__gallery-frame">
            <div ref="panelGallery" class="panel__gallery" @scroll="onGalleryScroll">
              <img
                v-for="(src, i) in galleryImages"
                :key="src + i"
                class="panel__slide"
                :src="src"
                :alt="detailItem.name || ''"
                :loading="i === 0 ? 'eager' : 'lazy'"
              />
              <div v-if="!galleryImages.length" class="panel__slide panel__slide--empty">无图</div>
            </div>
            <div v-if="galleryImages.length > 1" class="panel__dots">
              <span
                v-for="(_, i) in galleryImages"
                :key="i"
                class="panel__dot"
                :class="{ active: i === activeIdx }"
                @click="jumpTo(i)"
              ></span>
            </div>
          </div>

          <!-- 信息卡 -->
          <div class="panel__card panel__info">
            <div class="panel__name">{{ detailItem.name }}</div>
            <div v-if="detailItem.tagline" class="panel__tagline">{{ detailItem.tagline }}</div>
            <div class="panel__meta">
              <span v-if="detailItem.vendor" class="panel__pill">{{ detailItem.vendor }}</span>
              <span v-if="detailItem.tag" class="panel__pill panel__pill--brand">{{ detailItem.tag }}</span>
            </div>
            <div class="panel__price-row">
              <span class="panel__price-main">{{ sym(detailItem.currency) }}{{ detailItem.price }}</span>
              <span v-if="detailItem.origin" class="panel__price-origin">{{ sym(detailItem.currency) }}{{ detailItem.origin }}</span>
            </div>
          </div>

          <!-- 描述 -->
          <div v-if="detailItem.description" class="panel__card panel__desc">
            <div class="panel__block-title">商品详情</div>
            <div class="panel__prose" v-html="descriptionHtml"></div>
            <div v-if="detailItem.shopUrl" class="panel__more-link press" @click="openOrigin">前往 Shopify 查看完整详情 ↗</div>
          </div>

          <!-- 规格参数 -->
          <div v-if="detailItem.specs && detailItem.specs.length" class="panel__card">
            <div class="panel__block-title">规格参数</div>
            <div class="panel__spec-table">
              <div class="panel__spec-row" v-for="(s, i) in detailItem.specs" :key="i">
                <span class="panel__spec-k">{{ (s && typeof s === 'object') ? (s.label || '—') : '—' }}</span>
                <span class="panel__spec-v">{{ (s && typeof s === 'object') ? (s.value || '—') : s }}</span>
              </div>
            </div>
          </div>

          <!-- 核心卖点 -->
          <div v-if="detailItem.sellingPoints && detailItem.sellingPoints.length" class="panel__card">
            <div class="panel__block-title">核心卖点</div>
            <ul class="panel__points-list">
              <li v-for="(p, i) in detailItem.sellingPoints" :key="i">{{ p }}</li>
            </ul>
          </div>

          <div class="panel__gap"></div>
        </div>

        <!-- 操作区（同 ProductDetailView 底部按钮风格） -->
        <div class="panel__actions">
          <button class="panel__btn panel__btn--cart press" @click="openDetail">加入购物车</button>
          <button class="panel__btn panel__btn--buy press" @click="openDetail">立即购买</button>
        </div>
      </template>
    </div>
    </div>
  </div>
</template>

<script setup>
import { productRoute } from '../utils/productNavigation'
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import QuickActions from '../components/QuickActions.vue'
import SectionHeader from '../components/SectionHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import TopBar from '../components/TopBar.vue'
import RootTabs from '../components/RootTabs.vue'
import IconSvg from '../components/IconSvg.vue'
import { featuredQuick } from '../data/mock'
import { fetchProducts, getProducts, getStore, getLastError, initRegion, sym, API_BASE, fetchProductDetail } from '../api/shop'
import { bridge } from '../bridge'
import { t, initLocale, locale } from '../i18n'

const router = useRouter()
const hotSectionRef = ref(null)
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'
const store = ref('')
const loading = ref(true)
const error = ref('')

// 精选栏目运营配置（后台 pxid-admin「精选配置」维护；读取失败回退默认值，不白屏）
const cfg = ref({
  bannerHandles: ['p4', '500w-48v-city-folding-electric-scooter-with-app', 'ant5'],
  hotCount: 4,
  springCollection: 'spring',
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
  } catch (e) {
    console.warn('[featured] 读取精选配置失败，使用默认值:', e.message || e)
  }
}

// 入场动画只播一次（2026-09-07，镜像 DiscoverView 同款修复）：
// .fade-up 是 CSS animation，keep-alive 从详情返回时组件 DOM 被重新插入 → 整屏卡片
// 重播浮入（0.45s + stagger 错开 ≈ 0.95s），叠在返回转场上观感就是「精选动画乱了」。
// 做法：首屏播完后把 class 摘掉，之后（返回/切 tab）DOM 再插入也没有动画可播。
const enterAnim = ref(true)
let enterAnimTimer = null
// 只给首屏前 6 张做错开，且错开上限 6 档：
//   原来用 i % 10 → 双列网格里第 11 张又从头错开，看着随机；
//   且触底追加/搜索结果卡片也带 stagger，每批都要重播一次。
const staggerFor = (i) => (enterAnim.value && i < 6 ? 'stagger-' + (i + 1) : '')
const fadeUp = () => (enterAnim.value ? 'fade-up' : '')

onMounted(async () => {
  try {
    await initLocale() // 语言决定内容地区，见 regionFromLocale
    await initRegion()
    await fetchProducts() // 商品先出，不阻塞
    store.value = getStore()
    error.value = getLastError()
  } catch (e) {
    error.value = getLastError() || String(e.message || e)
  } finally {
    loading.value = false
  }
  // 入场动画播完就摘掉 class：keep-alive 返回时 DOM 重新插入也不会重播
  // （fade-up 0.45s + 最大 0.25s 错开，留 900ms 余量；从首屏数据就绪起算，
  //   慢网下数据晚到动画也来得及完整播完）
  clearTimeout(enterAnimTimer)
  enterAnimTimer = setTimeout(() => { enterAnim.value = false }, 900)
  fetchFeaturedConfig() // 后台精选配置：异步补，不阻塞首屏商品渲染（配置回来后各 computed 自动重算）
  startBanner()
  document.addEventListener('visibilitychange', onVis)
})
onUnmounted(() => {
  stopBanner()
  clearTimeout(enterAnimTimer)
  enterAnimTimer = null
  document.removeEventListener('visibilitychange', onVis)
})
onDeactivated(stopBanner) // 切到别的 Tab（IndexedStack 隐藏本 WebView）时停掉，避免隐藏期间持续制造合成层
onActivated(() => {
  startBanner() // 回到本 Tab 恢复轮播
  // 自愈：keep-alive 切回本页时，若首屏取数失败/为空，自动重拉商品（不再依赖整页刷新救回）
  if (all.value.length === 0 || error.value) {
    loading.value = true
    error.value = ''
    fetchProducts()
      .then(() => {
        store.value = getStore()
        error.value = getLastError()
      })
      .finally(() => {
        loading.value = false
      })
  }
})

function enterStore() {
  if (store.value) bridge.openShopify('https://' + store.value)
}

// ---- 顶部 Banner 产品轮播（展示后台配置的车型 handles）----
const current = ref(0)
let _bannerTimer = null
const HERO_HANDLE = '500w-48v-city-folding-electric-scooter-with-app'
const bannerList = computed(() => {
  const handles = [HERO_HANDLE, ...cfg.value.bannerHandles.filter((h) => h !== HERO_HANDLE)]
  return handles.map((handle) => all.value.find((p) => p.handle === handle || String(p.id) === handle)).filter(Boolean)
})

function startBanner() {
  stopBanner()
  if (document.hidden) return // 后台/WebView Offstage 时不跑，避免持续制造合成层
  if (bannerList.value.length > 1) {
    _bannerTimer = setInterval(() => {
      current.value = (current.value + 1) % bannerList.value.length
    }, 4000)
  }
}
function onVis() {
  if (document.hidden) stopBanner()
  else startBanner()
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
  if (isSplit.value) { selectProduct(p); return }
  openSecondary(productRoute(p))
}

// 白名单二级路由统一走全屏右滑通道（2026-09-08 对接说明），同 DiscoverView.openSecondary
function openSecondary(route) {
  if (bridge.openFullscreenRoute(route)) return
  router.push(route)
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
  { key: 'vehicles', label: t('featured.tab.vehicles') },
  { key: 'parts', label: t('featured.tab.parts') },
])
const activeTab = ref('rec')

// 精选搜索：常驻搜索条，按商品名本地过滤（仅对当前已加载商品生效，与发现栏目一致）
const showSearch = ref(false)
const kw = ref('')
const isComposing = ref(false)
const searchResults = computed(() => {
  const k = (kw.value || '').trim().toLowerCase()
  if (!k) return []
  return all.value.filter(
    (p) => (p.name || '').toLowerCase().includes(k) || (p.title || '').toLowerCase().includes(k)
  )
})
// 搜索：回车触发；结果态随关键词清空自动退出（避免整页只剩「0 个结果」）
function onSearchEnter() {
  if (isComposing.value) return // IME 组合中不触发搜索
  onSearch()
}
function onSearch() {
  showSearch.value = !!String(kw.value || '').trim()
}
function onCompositionEnd() {
  isComposing.value = false
}
function clearSearch() {
  kw.value = ''
  showSearch.value = false
}
watch(kw, (k) => {
  if (!String(k || '').trim()) showSearch.value = false
})

// 精选快捷入口：label 走 i18n（key 不变，展示文案随语言切换）
const featuredQuickI18n = computed(() =>
  featuredQuick.map((q) => ({ ...q, icon: q.key === 'points' ? 'coins' : q.icon, label: t('featured.quick.' + q.key) }))
)

const all = computed(() => getProducts())
const saleBadge = (p) => {
  const price = Number(p.price)
  const origin = Number(p.origin)
  if (!origin || !price || price >= origin) return ''
  if (locale.value === 'zh') return `${(price / origin * 10).toFixed(1)}折`
  return `${Math.round((1 - price / origin) * 100)}% OFF`
}
const hotProducts = computed(() => all.value.slice(0, cfg.value.hotCount))
// 商城目前仍把整车归在 spring collection；待商品源改名后由精选配置切换。
const vehicleProducts = computed(() =>
  all.value.filter(
    (p) => p.collection === cfg.value.springCollection || (p.tags || []).includes(cfg.value.springCollection)
  )
)
const partProducts = computed(() =>
  all.value.filter(
    (p) => p.collection === 'p1parts' || (p.tags || []).includes('p1parts')
  )
)

function onQuick(q) {
  if (q.key === 'hot') {
    hotSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (q.key === 'vehicles') {
    activeTab.value = 'vehicles'
  } else if (q.key === 'points') {
    openSecondary('/points')
  }
}

// ---- 折叠屏两栏（≥600px）：右栏商品详情面板 ----
// 手机（<600px）isSplit=false，右栏不渲染、不拉详情，零影响。
// 854 / 1337 都 ≥600 → 两栏；H5 只做「左商品列表 + 右详情」两栏，自动等分吃满宽度。
const SPLIT_MQ = window.matchMedia('(min-width: 600px)')
const isSplit = ref(SPLIT_MQ.matches)
function onSplitChange(e) { isSplit.value = e.matches }
if (SPLIT_MQ.addEventListener) SPLIT_MQ.addEventListener('change', onSplitChange)
else SPLIT_MQ.addListener(onSplitChange)
onUnmounted(() => {
  if (SPLIT_MQ.removeEventListener) SPLIT_MQ.removeEventListener('change', onSplitChange)
  else SPLIT_MQ.removeListener(onSplitChange)
})

// 右栏选中项 + 全量详情（分栏态点左栏卡片只切右栏，不跳页）
const selectedProduct = ref(null)
const detailLoading = ref(false)
const detailItem = ref(null)      // fetchProductDetail 全量（含描述/规格/卖点/图集）
async function loadPanel(product) {
  selectedProduct.value = product
  if (!product) return
  detailLoading.value = true
  const detail = await fetchProductDetail(product.handle || product.id)
  // 快速连点/翻页时，旧请求返回不得覆盖当前选中
  if (selectedProduct.value && (selectedProduct.value.handle || String(selectedProduct.value.id)) === (product.handle || String(product.id))) {
    detailItem.value = detail || product
  }
  detailLoading.value = false
}
function selectProduct(product) {
  if (product && product.id != null) loadPanel(product)
}
function openDetail() {
  if (selectedProduct.value) openSecondary(productRoute(selectedProduct.value))
}
// ▲ 上一条 / ▼ 下一条：在全部商品流里循环翻
function stepDetail(delta) {
  const list = all.value
  if (!list.length) return
  const cur = selectedProduct.value && (selectedProduct.value.handle || String(selectedProduct.value.id))
  const i = list.findIndex((x) => (x.handle || String(x.id)) === cur)
  const n = i < 0 ? 0 : (i + delta + list.length) % list.length
  selectProduct(list[n])
}
const panelGallery = ref(null)
const activeIdx = ref(0)
const galleryImages = computed(() => {
  const imgs = detailItem.value?.images || []
  return imgs
    .map((im) => (typeof im === 'string' ? im : im?.src))
    .filter(Boolean)
})
function onGalleryScroll() {
  const el = panelGallery.value
  if (!el) return
  activeIdx.value = Math.round(el.scrollLeft / el.clientWidth)
}
function jumpTo(i) {
  const el = panelGallery.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  activeIdx.value = i
}
// 切商品时图廊回到第一张
watch(selectedProduct, () => {
  activeIdx.value = 0
  nextTick(() => { if (panelGallery.value) panelGallery.value.scrollLeft = 0 })
})

const descriptionHtml = computed(() => {
  const d = detailItem.value?.description || ''
  if (!d) return ''
  const s = String(d).trim()
  // 已经是 HTML 就直接用；纯文本按段落包 <p>
  if (/<[^>]+>/.test(s)) return s
  return s
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
})
function openOrigin() {
  if (detailItem.value?.shopUrl) bridge.openShopify(detailItem.value.shopUrl)
}
// 分栏首屏：商品数据回来后默认选中第一件，右栏不留白
watch(all, (l) => {
  if (isSplit.value && l.length && !selectedProduct.value) selectProduct(l[0])
})
watch(isSplit, (v) => {
  if (v && !selectedProduct.value && all.value.length) selectProduct(all.value[0])
})

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
  background: var(--root-page-bg);
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
}
/* 原生底栏可能覆盖 WebView：安全区不代表底栏高度，末项需要可滚入可见区域。 */
.featured--native {
  padding-bottom: calc(var(--tab-h, 56px) + max(16px, env(safe-area-inset-bottom, 0px)));
}
.leftcol > :deep(.tb-bar > .tb-left) { min-width: 0; flex: 1; overflow: hidden; }
.leftcol > :deep(.tb-bar > .tb-right) { min-width: 0; flex: none; }
.my-order-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #18264b;
  background: #fff;
  border: 1px solid #e2eafb;
  border-radius: 999px;
  box-shadow: 0 3px 10px rgba(39, 83, 163, .08);
  min-height: 35px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.my-order-btn svg { width: 18px; height: 18px; }
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px 0;
  height: 50px;
  background: #fff;
  border: 1px solid #d4e0f3;
  border-radius: var(--radius-pill, 999px);
  padding: 0 17px;
  box-shadow: 0 5px 16px rgba(47, 84, 148, .11);
}
.search:focus-within {
  border-color: #6694f8;
  box-shadow: 0 0 0 3px rgba(63, 108, 248, .13), 0 6px 18px rgba(47, 84, 148, .12);
}
.sicon {
  color: #4d72b8;
  display: flex;
  align-items: center;
}
.sinput {
  flex: 1;
  font-size: 15px;
  color: var(--text);
  background: transparent;
  border: none;
  outline: none;
}
.sinput::placeholder { color: #7787a3; }
.search__clear {
  color: var(--text-hint);
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
  border: 0;
  background: transparent;
}
.banner {
  position: relative;
  margin: 15px clamp(12px, 3vw, 40px) 0;
  border-radius: 20px;
  overflow: hidden;
  height: clamp(216px, 44vw, 460px);
  background: radial-gradient(ellipse at 83% 76%, rgba(219, 234, 255, .85), transparent 49%), linear-gradient(143deg, #eef5ff 0%, #f8fbff 43%, #dfebff 100%);
  border: 1px solid #fff;
  box-shadow: 0 9px 25px rgba(49, 91, 158, .09);
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
  border: 0;
  padding: 0;
  text-align: left;
  font: inherit;
  background: transparent;
}
.banner__slide::before {
  content: '';
  position: absolute;
  width: 120%;
  height: 85%;
  right: -34%;
  top: -37%;
  border-radius: 0 0 0 90%;
  transform: rotate(-11deg);
  background: rgba(255, 255, 255, .46);
}
.banner__wordmark {
  position: absolute;
  right: 1%;
  top: 5%;
  font-size: clamp(74px, 25vw, 160px);
  line-height: 1;
  font-weight: 900;
  letter-spacing: -.09em;
  font-style: italic;
  color: rgba(101, 150, 237, .10);
  pointer-events: none;
}
.banner__handwriting {
  position: absolute;
  right: 5%;
  top: 37%;
  transform: rotate(-9deg);
  color: rgba(81, 131, 230, .6);
  font-family: cursive;
  font-size: clamp(11px, 3vw, 17px);
  font-style: italic;
  line-height: 1.15;
  text-align: right;
  pointer-events: none;
}
.banner__img {
  position: absolute;
  right: -5%;
  bottom: -9%;
  width: 78%;
  height: 100%;
  object-fit: contain;
  object-position: right center;
  display: block;
  mix-blend-mode: multiply;
}
.banner__mask {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: min(59%, 370px);
  padding: 18px 0 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: linear-gradient(to right, rgba(241, 247, 255, .98) 35%, rgba(241, 247, 255, .87) 68%, rgba(241, 247, 255, 0));
  color: #101d43;
  pointer-events: none;
}
.banner__eyebrow {
  font-size: 18px;
  font-weight: 850;
  letter-spacing: .11em;
  line-height: 1;
}
.banner__eyebrow span {
  display: block;
  font-size: 6px;
  letter-spacing: .27em;
  margin-top: 5px;
  color: #647ba7;
}
.banner__name {
  font-size: clamp(15px, 4.2vw, 23px);
  font-weight: 750;
  line-height: 1.17;
  margin-top: 14px;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.banner__tagline { margin-top: 7px; color: #6a80a9; font-size: 10px; line-height: 1.25; }
.banner__price {
  font-size: clamp(19px, 5vw, 27px);
  font-weight: 800;
  color: #356bfb;
  margin-top: auto;
}
.banner__origin {
  font-size: 11px;
  font-weight: 400;
  text-decoration: line-through;
  color: #8c9ab0;
  margin-left: 6px;
}
.banner__cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  background: linear-gradient(120deg, #5a96ff, #3869f7);
  box-shadow: 0 5px 12px rgba(56, 105, 247, .24);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 13px;
  margin-top: 7px;
}
.banner__dots {
  position: absolute;
  right: 12px;
  bottom: 11px;
  display: flex;
  gap: 5px;
  z-index: 2;
  padding: 6px 8px;
  background: rgba(255, 255, 255, .86);
  border-radius: 999px;
}
.dot {
  width: 7px;
  height: 7px;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: #c7d7f9;
  transition: all 0.25s;
}
.dot.active {
  width: 20px;
  background: #4275fa;
  border-radius: 3px;
}
.store-footer {
  margin: 8px 12px 18px;
  padding: 12px 12px 14px;
  background: #fff;
  border-radius: 19px;
  box-shadow: 0 5px 18px rgba(42, 86, 156, .06);
}
.enter-store {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  min-height: 58px;
  padding: 8px 52px 8px 14px;
  border-radius: 999px;
  background: linear-gradient(110deg, #68a8ff, #4077fb 60%, #3766f4);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  border: none;
  box-shadow: 0 7px 15px rgba(52, 100, 239, .24);
}
.enter-store:disabled { opacity: .55; }
.enter-store__arrow {
  display: grid;
  place-items: center;
  position: absolute;
  right: 6px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: #fff;
  color: #3766f4;
  font-size: 24px;
  font-weight: 400;
}
.store-trust {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 16px;
  color: #475879;
  font-size: 11px;
}
.store-trust__item {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.store-trust__item + .store-trust__item { border-left: 1px solid #e4eafb; }
.store-trust__icon { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border-radius: 50%; background: #eff5ff; box-shadow: inset 0 0 0 1px #e0eaff; }
.store-trust__copy { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.store-trust__copy strong { font-size: 10px; color: #172b51; white-space: nowrap; }
.store-trust__copy small { margin-top: 3px; font-size: 8px; color: #8999b3; white-space: nowrap; }
.store-trust svg { color: #4077fb; flex-shrink: 0; }
.vehicle-panel { margin: 7px 12px 10px; padding-top: 1px; border-radius: 19px; background: linear-gradient(145deg, #eef5ff, #f5f9ff 55%, #eaf3ff); border: 1px solid #e8f0ff; }
.vehicle-panel :deep(.sheader) { padding: 14px 11px 11px; }
.vehicle-panel .grid2 { padding: 0 9px 12px; gap: 8px; }
.vehicle-panel :deep(.pcard) { border-color: #f2f5fb; box-shadow: 0 3px 10px rgba(64, 104, 174, .045); }
.hot-section { scroll-margin-top: 58px; }
@media (max-width: 350px) {
  .my-order-btn__txt { display: none; }
  .banner__mask { width: 66%; }
  .banner__name { font-size: 14px; }
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px 18px;
}
@media (min-width: 600px) {
  .grid2 {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 0 clamp(16px, 3vw, 40px) 24px;
  }
}
@media (min-width: 1040px) {
  .grid2 {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
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

/* ===== 折叠屏两栏（≥600px）：左商品列表 + 右详情面板 =====
   手机 <600px：.cols 塌成单栏（.leftcol 无约束、.panel 不渲染），与现状一致。
   两栏各自 100vh 独立滚动（iPad 双 pane 范式）。 */
@media (min-width: 600px) {
  .featured { padding-bottom: 0; }
  .cols {
    display: flex;
    align-items: flex-start;
  }
  .leftcol {
    flex: 1 1 0;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .panel {
    flex: 1 1 0;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--card);
    border-left: 1px solid var(--line, #eee);
  }
}

/* 右栏商品详情面板内部（仅分栏态出现） —— 视觉对齐 ProductDetailView */
.panel { background: var(--bg); }
.panel__nav {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 14px;
  box-sizing: border-box;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.panel__tag {
  background: var(--brand-soft, rgba(74, 108, 247, .1));
  color: var(--brand, #4a6cf7);
  border-radius: 9px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 500;
}
.panel__navbtn {
  margin-left: auto;
  background: var(--card);
  border: 1px solid var(--line, #eee);
  border-radius: 9px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-sub);
}
.panel__navbtn + .panel__navbtn { margin-left: 6px; }
.panel__navbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.panel__loading {
  padding: 40px 16px;
  color: var(--text-hint);
  font-size: 13px;
  text-align: center;
}

/* 图廊 */
.panel__gallery-frame {
  position: relative;
  height: clamp(300px, 50vw, 460px);
  background: #fff;
}
.panel__gallery {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  background: #fff;
}
.panel__gallery::-webkit-scrollbar { display: none; }
.panel__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
  scroll-snap-align: center;
}
.panel__slide--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}
.panel__dots {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 8px 0;
  background: transparent;
}
.panel__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line);
}
.panel__dot.active {
  background: var(--brand);
  width: 16px;
  border-radius: 3px;
}

/* 卡片块（同 ProductDetailView .card） */
.panel__card {
  background: #fff;
  margin: 10px 16px 0;
  padding: 14px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}
.panel__block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.panel__block-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}
.panel__info .panel__name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 6px;
}
.panel__tagline {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 6px;
  line-height: 1.5;
}
.panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.panel__pill {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 3px 10px;
  border-radius: 12px;
}
.panel__pill--brand {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
}
.panel__price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 12px;
}
.panel__price-main {
  color: var(--price, #ee3d48);
  font-weight: 700;
  font-size: 24px;
}
.panel__price-origin {
  color: var(--text-sub);
  font-size: 13px;
  text-decoration: line-through;
}

/* 描述富文本 */
.panel__prose {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}
.panel__prose :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  margin: 10px 0;
}
.panel__prose :deep(p) {
  margin: 0 0 14px;
  line-height: 1.8;
}
.panel__prose :deep(h1),
.panel__prose :deep(h2),
.panel__prose :deep(h3) {
  font-size: 16px;
  margin: 18px 0 10px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.panel__prose :deep(h1)::before,
.panel__prose :deep(h2)::before,
.panel__prose :deep(h3)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand);
}
.panel__prose :deep(a) { color: var(--brand); }
.panel__prose :deep(ul),
.panel__prose :deep(ol) { padding-left: 20px; margin: 0 0 10px; }
.panel__more-link {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
}

/* 规格参数表 */
.panel__spec-table {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  border: 0.5px solid var(--line);
}
.panel__spec-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
}
.panel__spec-row:nth-child(even) { background: var(--brand-soft); }
.panel__spec-k { color: var(--text-sub); flex: none; }
.panel__spec-v { color: var(--text); text-align: right; font-weight: 500; }

/* 核心卖点 */
.panel__points-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel__points-list li {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 14px 12px 40px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  background: var(--brand-soft);
  border-radius: 10px;
}
.panel__points-list li::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand);
}
.panel__points-list li::after {
  content: '';
  position: absolute;
  left: 18px;
  top: 50%;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: translateY(-65%) rotate(45deg);
}
.panel__gap { height: 12px; }

/* 底部操作区 */
.panel__actions {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}
.panel__btn {
  flex: 1;
  border-radius: 22px;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
  border: 0;
  cursor: pointer;
}
.panel__btn--cart {
  background: var(--brand-soft);
  color: var(--brand);
}
.panel__btn--buy {
  background: var(--brand);
  color: #fff;
}
</style>
