<template>
  <div class="product-page">
  <div class="detail" v-if="product">
    <!-- 顶栏 -->
    <TopBar sticky :title="product.name" :back="goBack">
      <template #right>
        <span class="cart press" @click="goCart">
          <IconSvg name="shopping-cart" :size="24" />
          <span v-if="cartCount > 0" class="badge">{{ cartCount > 99 ? '99+' : cartCount }}</span>
        </span>
      </template>
    </TopBar>

    <!-- 当前颜色图廊：首帧沿用列表封面，切色才加载对应图片 -->
    <div class="gallery" ref="gallery" @scroll="onGalleryScroll">
      <img
        v-for="(src, i) in galleryImages"
        :key="src"
        class="slide"
        :src="src"
        :alt="product.name"
        :loading="i === 0 ? 'eager' : 'lazy'"
      />
      <div v-if="!galleryImages.length" class="slide empty-slide">无图</div>
    </div>
    <div class="dots" v-if="galleryImages.length > 1">
      <span
        v-for="(src, i) in galleryImages"
        :key="i"
        class="dot"
        :class="{ active: i === activeIdx }"
      ></span>
    </div>

    <!-- 缩略图 -->
    <div class="thumbs" v-if="galleryImages.length > 1">
      <img
        v-for="(src, i) in galleryImages"
        :key="i"
        class="thumb"
        :class="{ active: i === activeIdx }"
        :src="src"
        @click="jumpTo(i)"
      />
    </div>

    <!-- 信息卡 -->
    <div class="card info">
      <div class="name">{{ product.name }}</div>
      <div class="tagline" v-if="product.tagline">{{ product.tagline }}</div>
      <div class="meta">
        <span v-if="product.vendor" class="pill">{{ product.vendor }}</span>
        <span v-if="product.tag" class="pill pill--brand">{{ product.tag }}</span>
      </div>
      <div class="price-row">
        <span class="price">{{ sym(product.currency) }}{{ displayPrice }}</span>
        <span v-if="product.origin" class="origin">{{ sym(product.currency) }}{{ product.origin }}</span>
      </div>
    </div>

    <!-- 颜色选择（有颜色选项时显示，联动轮播图与规格） -->
    <div class="card color-card" v-if="hasColor">
      <div class="block__title">选择颜色</div>
      <p v-if="detailReady && !activeColor" class="color-hint">请选择颜色以查看对应图片</p>
      <div class="colors">
        <button
          v-for="cv in colorValues"
          :key="cv"
          class="color-btn"
          :class="{ active: activeColor === cv }"
          @click="selectColor(cv)"
          :disabled="!detailReady"
        >
          <img v-if="activeColor === cv && colorImageMap[cv]" :src="colorImageMap[cv]" :alt="cv" class="color-swatch" />
          <span v-else class="color-swatch color-swatch--dot" :style="{ background: swatchDot(cv) }"></span>
          <span>{{ cv }}</span>
        </button>
      </div>
    </div>

    <!-- 规格（仅展示颜色之外的维度；颜色已由上方颜色卡选择） -->
    <div class="card spec-card" v-if="specDims.length">
      <div class="block__title">选择规格</div>
      <div class="spec-dim" v-for="dim in specDims" :key="dim.name">
        <div class="spec-dim__label">{{ specLabel(dim.name) }}</div>
        <div class="opts">
          <span
            v-for="val in dim.values"
            :key="val"
            class="opt"
            :class="{ active: (specPick[dim.name] || '') === val, soldout: !specComboAvailable(dim.name, val) }"
            @click="pickSpec(dim.name, val)"
            >{{ val }}<i v-if="!specComboAvailable(dim.name, val)">缺货</i></span
          >
        </div>
      </div>
    </div>

    <!-- 数量（紧跟规格，决策区） -->
    <div class="card card--inline">
      <div class="block__title">数量</div>
      <div class="qty">
        <button class="press" @click="changeQty(-1)">－</button>
        <span>{{ qty }}</span>
        <button class="press" @click="changeQty(1)">＋</button>
      </div>
    </div>

    <!-- 规格参数 -->
    <div class="card" v-if="product.specs && product.specs.length">
      <div class="block__title">规格参数</div>
      <div class="specs">
        <div class="spec" v-for="(s, i) in product.specs" :key="i">
          <span class="spec__k">{{ s.label }}</span>
          <span class="spec__v">{{ s.value }}</span>
        </div>
      </div>
    </div>

    <!-- 核心卖点（参数之后，强化购买理由） -->
    <div class="card" v-if="product.sellingPoints && product.sellingPoints.length">
      <div class="block__title">核心卖点</div>
      <ul class="points">
        <li v-for="(s, i) in product.sellingPoints" :key="i">{{ s }}</li>
      </ul>
    </div>

    <!-- 商品描述（Shopify body_html 富文本） -->
    <div class="card desc" v-if="product.description">
      <div class="block__title">商品详情</div>
      <div class="prose" v-html="descriptionHtml"></div>
      <div class="more-link press" @click="openOrigin" v-if="product.shopUrl">
        前往 Shopify 查看完整详情 ↗
      </div>
    </div>
    <!-- 无描述时也提供入口 -->
    <div class="card desc" v-else-if="product.shopUrl">
      <div class="more-link press" @click="openOrigin">
        前往 Shopify 查看完整详情 ↗
      </div>
    </div>

    <div v-if="error" class="detail-error">{{ error }} <button @click="reload">重新加载</button></div>
    <div class="gap"></div>

    <!-- 底部吸底操作 -->
    <div class="actions">
      <button class="btn btn--cart pop press" @click="onAddCart" :disabled="!detailReady || (variantList.length > 0 && !currentVariant)">加入购物车</button>
      <button class="btn btn--buy pop press" @click="onBuy" :disabled="!detailReady || (variantList.length > 0 && !currentVariant)">立即购买</button>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>

  <div class="empty" v-else>
    <p v-if="loading">加载中…</p>
    <template v-else>
      <p>{{ error || '商品不存在' }}</p>
      <div class="empty__acts">
        <button class="press btn--retry" @click="goBack">返回精选</button>
        <button class="press btn--retry" @click="reload">重新加载</button>
      </div>
    </template>
  </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProductDetail, getStore, sym, API_BASE, getRegion } from '../api/shop'
import { initLocale } from '../i18n'
import { productEntry } from '../utils/productNavigation'
import { variantForCover, colorOf, imagesForColor, sameImage } from '../utils/productPresentation'
import { addToCart, cartCount } from '../store/cart'
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const detailReady = ref(false)
const entryCover = ref('')
const productRegion = ref('')
const loading = ref(true)
const error = ref('')
const activeIdx = ref(0)
const activeVariant = ref(0)
const qty = ref(1)
const toast = ref('')
const gallery = ref(null)

const currentVariant = computed(() => {
  const vs = product.value && product.value.variants
  if (vs && vs.length) return vs[activeVariant.value] || null
  return null
})
const displayPrice = computed(() => {
  if (currentVariant.value && currentVariant.value.price) return currentVariant.value.price
  return product.value ? product.value.price : 0
})

// —— 颜色主图联动（精选商品详情）——
// images 统一成对象（兼容列表缓存的字符串数组）；variants 取 selectedOptions 匹配颜色
const imageList = computed(() =>
  (product.value?.images || []).map((im) =>
    typeof im === 'string' ? { src: im, alt: '', id: '', variantIds: [] } : im
  )
)
const descriptionHtml = computed(() => {
  if (!product.value?.description) return ''
  const doc = new DOMParser().parseFromString(product.value.description, 'text/html')
  doc.querySelectorAll('img').forEach((im) => { im.setAttribute('loading', 'lazy'); im.setAttribute('decoding', 'async') })
  return doc.body.innerHTML
})
const variantList = computed(() => product.value?.variants || [])
const colorOption = computed(() =>
  (product.value?.options || []).find((o) => /color|colour|颜色/i.test(o.name)) || null
)
const colorValues = computed(() => (colorOption.value ? colorOption.value.values || [] : []))
const isColorOpt = (name) => /color|colour|颜色/i.test(name || '')
// 颜色值 -> 主图 src（优先级：variant.imageId 回查 > image.variantIds 命中 > alt 含色名）
function pickColorImage(cv) {
  const v = variantList.value.find((x) =>
    (x.selectedOptions || []).some((o) => isColorOpt(o.name) && o.value === cv)
  )
  if (v && v.imageId) {
    const im = imageList.value.find((i) => String(i.id) === String(v.imageId))
    if (im) return im.src
  }
  if (v) {
    const im = imageList.value.find((i) => (i.variantIds || []).map(String).includes(String(v.id)))
    if (im) return im.src
  }
  const byAlt = imageList.value.find((i) => (i.alt || '').toLowerCase().includes(cv.toLowerCase()))
  if (byAlt) return byAlt.src
  return null
}
const colorImageMap = computed(() => {
  const m = {}
  colorValues.value.forEach((cv) => { m[cv] = pickColorImage(cv) })
  return m
})
// 有颜色选项即可选色；缺少图片关联时显示占位，不加载其它颜色冒充。
const hasColor = computed(() => {
  const cv = colorValues.value
  if (!cv.length) return false
  return variantList.value.some((v) =>
    (v.selectedOptions || []).some((o) => isColorOpt(o.name) && o.value)
  )
})
// 列表封面在详情补全后继续保留；只渲染当前颜色，不把其它颜色先塞入 DOM。
const galleryImages = computed(() => {
  if (!product.value) return []
  const selected = hasColor.value
    ? (colorValues.value.length === 1 ? imageList.value.map((i) => i.src) : imagesForColor(product.value, activeColor.value))
    : (detailReady.value ? imageList.value.map((i) => i.src) : [])
  const first = entryCover.value || selected[0] || (!hasColor.value ? product.value.cover : '') || ''
  return first ? [first, ...selected.filter((s) => !sameImage(s, first))] : selected
})
const activeColor = ref('')
const specPick = reactive({}) // 颜色之外各规格维度的当前选中值 { Battery: '10 Ah' }

// 颜色之外的规格维度（如 Battery）；Title/单一默认维度视为无规格
const specDims = computed(() => {
  const opts = (product.value && product.value.options) || []
  const vs = variantList.value
  return opts
    .filter((o) => o.name && !isColorOpt(o.name) && !/^title$/i.test(o.name))
    .map((d) => {
      const seen = []
      vs.forEach((v) => {
        const so = (v.selectedOptions || []).find((s) => s.name === d.name)
        if (so && so.value && !seen.includes(so.value)) seen.push(so.value)
      })
      return { name: d.name, values: seen.length ? seen : (d.values || []).filter(Boolean) }
    })
    .filter((d) => d.values.length)
})

// 维度名汉化（英文店铺选项名 → 中文界面展示）
const SPEC_LABEL = { Battery: '电池容量', Size: '尺寸', Voltage: '电压', Capacity: '容量', Model: '型号', Color: '颜色' }
function specLabel(name) {
  return SPEC_LABEL[name] || name
}

// 某 variant 是否满足「当前颜色 + 各规格已选 + 覆盖项」组合
function matchVariant(v, overrides = {}) {
  const so = v.selectedOptions || []
  // 颜色条件：有颜色商品需匹配 activeColor
  if (hasColor.value && activeColor.value) {
    const hit = so.find((o) => isColorOpt(o.name))
    if (!hit || hit.value !== activeColor.value) return false
  }
  // 其它规格维度：已选值需匹配（overrides 优先）
  for (const d of specDims.value) {
    const want = overrides[d.name] !== undefined ? overrides[d.name] : specPick[d.name]
    if (!want) continue
    const hit = so.find((o) => o.name === d.name)
    if (!hit || hit.value !== want) return false
  }
  return true
}

// 颜色卡点击：替换当前色图片，并选择该颜色下存在的规格组合。
function selectColor(cv) {
  if (!detailReady.value) return
  activeColor.value = cv
  entryCover.value = ''
  resolveVariant()
  resetGallery()
}
// 规格维度点击：更新该维值 → 重建选中变体
function pickSpec(dimName, val) {
  if (!detailReady.value) return
  const exists = variantList.value.some((v) => matchVariant(v, { [dimName]: val }))
  if (!exists) return // 该颜色下无此组合，忽略点击
  specPick[dimName] = val
  resolveVariant()
}
// 某维度值在「当前颜色 + 其它已选维度」下是否存在可用变体（决定缺货标）
function specComboAvailable(dimName, val) {
  return variantList.value.some(
    (v) => v.available !== false && matchVariant(v, { [dimName]: val })
  )
}
// 优先保留其它规格；不存在该组合时回退到新颜色的首个真实变体。
function resolveVariant() {
  const vs = variantList.value
  if (!vs.length) return
  const idx = vs.findIndex((v) => matchVariant(v))
  if (idx >= 0) activeVariant.value = idx
  else {
    const colorIndex = vs.findIndex((v) => colorOf(v) === activeColor.value)
    if (colorIndex >= 0) { activeVariant.value = colorIndex; syncSpecFromVariant() }
  }
}
// 从当前选中变体回填各规格维度的默认选中值（首次进入/换商品时）
function syncSpecFromVariant() {
  const v = variantList.value[activeVariant.value] || variantList.value[0]
  if (!v) return
  const so = v.selectedOptions || []
  specDims.value.forEach((d) => {
    const hit = so.find((s) => s.name === d.name)
    specPick[d.name] = hit && hit.value ? hit.value : d.values[0]
  })
}
// 颜色/规格选中态初始化（cache 首屏与 detail 覆盖后共用）
function initSelection(preferredId = '') {
  const vs = variantList.value
  const preferred = vs.find((v) => String(v.id) === String(preferredId))
    || variantForCover(product.value, entryCover.value || product.value?.cover)
    || (colorValues.value.length <= 1 ? vs[0] : null)
  activeVariant.value = vs.indexOf(preferred)
  activeColor.value = colorOf(preferred)
  syncSpecFromVariant()
}
function resetGallery() {
  activeIdx.value = 0
  nextTick(() => { if (gallery.value) gallery.value.scrollLeft = 0 })
}
// 无色图时的 swatch 兜底色（按色名稳定 hash 出浅色调）
function swatchDot(cv) {
  let h = 0
  for (let i = 0; i < cv.length; i++) h = (h * 31 + cv.charCodeAt(i)) % 360
  const colors = { black: '#222', white: '#fff', red: '#c83b39', blue: '#3576b9', green: '#49855a', brown: '#92613f', golden: '#c8a34a', gold: '#c8a34a', silver: '#b7bcc3', grey: '#888', gray: '#888', 黑色: '#222', 白色: '#fff', 红色: '#c83b39', 蓝色: '#3576b9' }
  return colors[cv.toLowerCase()] || `hsl(${h}, 55%, 62%)`
}

// 在首次 setup / 路由切换的同步阶段展示快照；异步回包只补当前商品。
let loadSeq = 0
async function load() {
  if (route.name !== 'product') return
  const handle = String(route.params.id)
  const path = route.fullPath
  const seq = ++loadSeq
  const query = { ...route.query }
  const stale = () => seq !== loadSeq || route.fullPath !== path
  const snapshot = productEntry(handle, query)
  product.value = snapshot
  entryCover.value = snapshot?.cover || ''
  detailReady.value = false
  loading.value = true
  error.value = ''
  activeVariant.value = 0
  activeColor.value = ''
  Object.keys(specPick).forEach((k) => delete specPick[k])
  qty.value = 1
  resetGallery()
  // 列表数据可能没有图与变体关联，不猜颜色；可解析时同步选中。
  if (snapshot && query.variant) initSelection(query.variant)
  try {
    await initLocale()
    if (stale()) return
    productRegion.value = ['CN', 'US', 'BR'].includes(query.region) ? query.region : getRegion()
    // 直链/全屏冷启动同样只请求这一件商品，不再请求商品全列表。
    const detail = await fetchProductDetail(handle, productRegion.value)
    if (stale()) return
    if (detail) {
      product.value = detail
      if (!entryCover.value) entryCover.value = detail.cover || ''
      initSelection(query.variant)
      detailReady.value = true
    } else {
      error.value = '详情加载失败，请重试'
    }
  } catch (e) {
    if (!stale()) error.value = '详情加载失败，请重试'
  } finally {
    if (!stale()) loading.value = false
  }
}
watch(() => route.name === 'product' ? route.fullPath : '', (path) => {
  if (path) load()
  else ++loadSeq // 离屏时废弃在途请求，不重置正在离场的 DOM。
}, { immediate: true, flush: 'sync' })

function onGalleryScroll() {
  const el = gallery.value
  if (!el) return
  const w = el.clientWidth
  activeIdx.value = Math.round(el.scrollLeft / w)
}
function jumpTo(i) {
  const el = gallery.value
  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  activeIdx.value = i
}
function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1500)
}
function changeQty(d) {
  qty.value = Math.max(1, qty.value + d)
}
function goBack() {
  // /product/:id 为全屏 WebView 白名单路由（2026-09-08 对接说明）：
  // 第一层（无 H5 内部历史）关全屏路由回精选根页；有 H5 内部历史（如返回已跳的深层页）先 back
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    if (bridge.isWebViewFirstPage()) app.postMessage('closeWebView')
    else router.back()
    return
  }
  router.back()
}
async function reload() {
  await load()
}
function goCart() {
  router.push('/cart')
}
function openOrigin() {
  if (product.value && product.value.shopUrl) bridge.openShopify(product.value.shopUrl)
}
function productStore() {
  try { return new URL(product.value.shopUrl).hostname } catch { return getStore() }
}
function onAddCart() {
  if (!product.value || !detailReady.value || (variantList.value.length && !currentVariant.value)) return
  addToCart(product.value, {
    variantId: currentVariant.value ? currentVariant.value.id : 'def',
    variantTitle: currentVariant.value ? currentVariant.value.title : '',
    price: displayPrice.value,
    qty: qty.value,
    region: productRegion.value || getRegion(),
    store: productStore(),
  })
  showToast('已加入购物车')
}
async function onBuy() {
  if (!product.value || !detailReady.value) return
  const vid = currentVariant.value ? currentVariant.value.id : 'def'
  // 走后端 checkout-v2 建 Shopify 购物车并预填邮箱/地址（region + Multipass 收敛在后端）
  try {
    // 拉取 Flutter 注入的用户资料：email + shippingAddress 用于 Shopify 结算页自动预填
    let profile = {}
    try { profile = (await bridge.getUserInfo()) || {} } catch (e) { profile = {} }
    const r = await fetch(`${API_BASE}/mall-api/checkout-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: vid,
        qty: qty.value,
        region: productRegion.value || getRegion(),
        email: profile.email || '',
        shippingAddress: profile.shippingAddress || null,
      }),
    })
    const j = await r.json()
    const url = (j.data && j.data.url) || (j.url)
    if (!url) throw new Error('empty checkout url')
    bridge.openShopify(url)
    showToast('正在前往 Shopify…')
  } catch (e) {
    // 兜底：直接拼 permalink，保证不阻塞
    const store = productStore()
    if (store) {
      bridge.openShopify(`https://${store}/cart/${vid}:${qty.value}`)
      showToast('正在前往 Shopify…')
    } else {
      showToast('结算失败，请重试')
    }
  }
}
</script>

<style scoped>
.product-page { min-height: 100vh; }
.color-hint { color: var(--text-sub); font-size: 13px; margin-bottom: 12px; }
.btn:disabled { opacity: .45; }
.detail-error { padding: 16px; text-align: center; }
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
.cart {
  position: relative;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #e53935;
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
}
/* 图廊 */
.gallery {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  background: #000;
}
.gallery::-webkit-scrollbar {
  display: none;
}
.slide {
  flex: 0 0 100%;
  width: 100%;
  height: 360px;
  object-fit: cover;
  scroll-snap-align: center;
}
.empty-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}
.dots {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 8px 0;
  background: #fff;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line);
}
.dot.active {
  background: var(--brand);
  width: 16px;
  border-radius: 3px;
}
.thumbs {
  display: flex;
  gap: 8px;
  padding: 0 12px 10px;
  background: #fff;
  overflow-x: auto;
}
.thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid transparent;
  flex: none;
}
.thumb.active {
  border-color: var(--brand);
}
/* 卡片 */
.card {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.03);
}
.info .name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.pill {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--line);
  padding: 3px 10px;
  border-radius: 12px;
}
.pill--brand {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 12px;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 24px;
}
.origin {
  color: var(--text-sub);
  font-size: 13px;
  text-decoration: line-through;
}
.block__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.block__title::before {
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
.opts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.opt {
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 16px;
}
.opt em {
  font-style: normal;
  color: var(--price);
  font-size: 12px;
}
.opt i {
  font-style: normal;
  color: var(--text-sub);
  font-size: 11px;
  margin-left: 4px;
}
.opt.active {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
}
.opt.soldout {
  opacity: 0.5;
  text-decoration: line-through;
}
/* 规格多维度：每维度独立一行 */
.spec-dim {
  margin-bottom: 14px;
}
.spec-dim:last-child {
  margin-bottom: 0;
}
.spec-dim__label {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 8px;
}
.spec-card .opts {
  gap: 8px;
}
/* 数量（决策区内联） */
.card--inline {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
}
.card--inline .block__title {
  margin-bottom: 0;
  font-size: 13px;
  color: var(--text-sub);
  flex-shrink: 0;
}
.card--inline .qty {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}
.qty button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  font-size: 16px;
  color: var(--text);
}
.qty span {
  font-size: 16px;
  min-width: 24px;
  text-align: center;
}
/* 描述富文本 */
.desc .prose {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}
.desc .prose :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  margin: 10px 0;
}
.desc .prose :deep(p) {
  margin: 0 0 14px;
  line-height: 1.8;
}
.desc .prose :deep(h1),
.desc .prose :deep(h2),
.desc .prose :deep(h3) {
  font-size: 16px;
  margin: 18px 0 10px;
  padding-left: 10px;
  position: relative;
  color: var(--text);
}
.desc .prose :deep(h1)::before,
.desc .prose :deep(h2)::before,
.desc .prose :deep(h3)::before {
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
.desc .prose :deep(a) {
  color: var(--brand);
}
.desc .prose :deep(ul),
.desc .prose :deep(ol) {
  padding-left: 20px;
  margin: 0 0 10px;
}
.desc .prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.desc .prose :deep(td),
.desc .prose :deep(th) {
  border: 1px solid var(--line);
  padding: 6px 8px;
}
/* 描述底部辅助链接 */
.more-link {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 13px;
  color: var(--text-sub);
}
.gap {
  height: 4px;
}
/* 卖点 / 参数 */
.tagline {
  font-size: 13px;
  color: var(--text-sub);
  margin-top: 6px;
  line-height: 1.5;
}
.points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.points li {
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
.points li::before {
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
.points li::after {
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
.specs {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  border: 0.5px solid var(--line);
}
.spec {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
}
.spec:nth-child(even) {
  background: var(--brand-soft);
}
.spec__k {
  color: var(--text-sub);
  flex: none;
}
.spec__v {
  color: var(--text);
  text-align: right;
  font-weight: 500;
}
/* 吸底操作 */
.actions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 420px;
  display: flex;
  gap: 10px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}
.btn {
  flex: 1;
  border-radius: 22px;
  padding: 12px 0;
  font-size: 15px;
  font-weight: 600;
}
.btn--cart {
  background: var(--brand-soft);
  color: var(--brand);
}
.btn--buy {
  background: var(--brand);
  color: #fff;
}
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  z-index: 100;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-sub);
}
.empty p {
  margin-bottom: 20px;
  font-size: 15px;
}
.empty__acts {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn--retry {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--text);
}
.btn--retry:active {
  background: var(--bg);
}
/* 颜色选择（联动轮播图） */
.color-card .colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.color-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 76px;
  padding: 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
}
.color-btn.active {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.color-swatch {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  background: #fff;
}
.color-swatch--dot {
  display: block;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.color-btn span {
  font-size: 12px;
  color: var(--text);
}
</style>
