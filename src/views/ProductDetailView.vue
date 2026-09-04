<template>
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

    <!-- 图廊：横向滑动 + 圆点（轮播=颜色主图，无颜色则全部图） -->
    <div class="gallery" ref="gallery" @scroll="onGalleryScroll">
      <img
        v-for="(src, i) in galleryImages"
        :key="i"
        class="slide"
        :src="src"
        :alt="product.name"
        loading="lazy"
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
      <div class="colors">
        <button
          v-for="cv in colorValues"
          :key="cv"
          class="color-btn"
          :class="{ active: activeColor === cv }"
          @click="selectColor(cv)"
        >
          <img :src="colorImageMap[cv]" :alt="cv" class="color-swatch" />
          <span>{{ cv }}</span>
        </button>
      </div>
    </div>

    <!-- 规格（变体） -->
    <div class="card" v-if="product.variants && product.variants.length">
      <div class="block__title">选择规格</div>
      <div class="opts">
        <span
          v-for="(v, i) in product.variants"
          :key="v.id"
          class="opt"
          :class="{ active: activeVariant === i, soldout: !v.available }"
          @click="activeVariant = i"
          >{{ v.title }}<em v-if="v.price && v.price !== product.price"> +{{ sym(product.currency) }}{{ v.price }}</em><i v-if="!v.available">缺货</i></span
      >
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
      <div class="prose" v-html="product.description"></div>
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

    <!-- 商品图册：轮播之外的其余图（场景/细节/参数图） -->
    <div class="card gallery-extra" v-if="extraImages.length">
      <div class="block__title">商品图册</div>
      <div class="extra-imgs">
        <img
          v-for="(src, i) in extraImages"
          :key="i"
          class="extra-img"
          :src="src"
          :alt="product.name"
          loading="lazy"
        />
      </div>
    </div>

    <div class="gap"></div>

    <!-- 底部吸底操作 -->
    <div class="actions">
      <button class="btn btn--cart pop press" @click="onAddCart">加入购物车</button>
      <button class="btn btn--buy pop press" @click="onBuy">立即购买</button>
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
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProducts, fetchProductDetail, getProductByHandle, getStore, sym, API_BASE, initRegion, getRegion } from '../api/shop'
import { initLocale } from '../i18n'
import { addToCart, cartCount } from '../store/cart'
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const loading = ref(true)
const error = ref('')
const activeIdx = ref(0)
const activeVariant = ref(0)
const qty = ref(1)
const toast = ref('')
const gallery = ref(null)

const currentVariant = computed(() => {
  const vs = product.value && product.value.variants
  if (vs && vs.length) return vs[activeVariant.value] || vs[0]
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
const hasColor = computed(() =>
  colorValues.value.length > 0 && colorValues.value.some((cv) => colorImageMap.value[cv])
)
// 轮播图：有颜色=各色主图（每色一张）；无颜色=全部图（维持原状）
const galleryImages = computed(() => {
  if (!hasColor.value) return imageList.value.map((i) => i.src)
  const arr = []
  colorValues.value.forEach((cv) => {
    const s = colorImageMap.value[cv]
    if (s && !arr.includes(s)) arr.push(s)
  })
  if (!arr.length && imageList.value[0]) arr.push(imageList.value[0].src)
  return arr
})
// 其余图（非轮播）：放进商品图册
const extraImages = computed(() => {
  if (!hasColor.value) return []
  const g = new Set(galleryImages.value)
  return imageList.value.map((i) => i.src).filter((s) => s && !g.has(s))
})
const activeColor = ref('')
function selectColor(cv) {
  activeColor.value = cv
  const idx = galleryImages.value.indexOf(colorImageMap.value[cv])
  if (idx >= 0) jumpTo(idx)
  // 联动规格：选中该色对应的 variant（影响价格/库存）
  const vi = variantList.value.findIndex((v) =>
    (v.selectedOptions || []).some((o) => isColorOpt(o.name) && o.value === cv)
  )
  if (vi >= 0) activeVariant.value = vi
}

// 因 App.vue 用 <keep-alive> 缓存所有页面，切不同商品时组件被复用 → 必须监听路由重载，否则“永远同一片”
async function load() {
  await initLocale() // 语言决定内容地区，见 regionFromLocale
  const handle = route.params.id
  product.value = null
  loading.value = true
  error.value = ''
  activeIdx.value = 0
  activeVariant.value = 0
  activeColor.value = ''
  qty.value = 1
  await initRegion()
  // 1️⃣ 先用列表缓存快速首屏（含图/价/卖点/规格/描述）
  const cached = getProductByHandle(handle)
  if (cached) {
    product.value = cached
    loading.value = false
  }
  // 2️⃣ 缓存未命中时（直链/刷新详情页），先拉列表填充缓存
  if (!cached) {
    try { await fetchProducts() } catch (_) { /* 非阻塞 */ }
    const retryCached = getProductByHandle(handle)
    if (retryCached) {
      product.value = retryCached
      loading.value = false
    }
  }
  // 3️⃣ 再按 Shopify 单品链接真拉完整详情（覆盖缓存，带重试）
  try {
    const detail = await fetchProductDetail(handle)
    if (detail) {
      product.value = detail
      if (activeVariant.value >= (detail.variants || []).length) activeVariant.value = 0
      // 初始化颜色选择（精选多色商品）：默认首个能匹配到主图的颜色
      activeColor.value = hasColor.value
        ? (colorValues.value.find((cv) => colorImageMap.value[cv]) || colorValues.value[0] || '')
        : ''
      error.value = '' // 清除之前的错误
    } else if (!product.value) {
      error.value = '未找到该商品'
    }
  } catch (e) {
    if (!product.value) error.value = '详情加载失败，请重试'
  }
  loading.value = false
}

onMounted(load)
// 同一个组件实例下，/product/:id 变化重新拉详情（含重置轮播/规格/数量）
watch(() => route.params.id, load)

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
function onAddCart() {
  if (!product.value) return
  addToCart(product.value, {
    variantId: currentVariant.value ? currentVariant.value.id : 'def',
    variantTitle: currentVariant.value ? currentVariant.value.title : '',
    price: displayPrice.value,
    qty: qty.value,
    region: 'US',
    store: getStore(),
  })
  showToast('已加入购物车')
}
async function onBuy() {
  if (!product.value) return
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
        region: getRegion(),
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
    const store = getStore()
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
.color-btn span {
  font-size: 12px;
  color: var(--text);
}
/* 商品图册（轮播之外的其余图） */
.gallery-extra .extra-imgs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.extra-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 10px;
  background: var(--bg);
}
</style>
