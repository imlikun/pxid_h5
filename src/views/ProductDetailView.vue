<template>
  <div class="detail" v-if="product">
    <!-- 顶栏 -->
    <div class="topbar">
      <span class="back press" @click="goBack">←</span>
      <span class="t">商品详情</span>
      <span class="cart press" @click="goCart"><IconSvg name="shopping-cart" :size="22" /></span>
    </div>

    <!-- 主图轮播 + 缩略图 -->
    <div class="gallery fade-up stagger-1">
      <div class="g-main" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
        <img v-if="gallery[gIdx]" :src="gallery[gIdx]" :alt="product.name" />
        <div class="g-count">{{ gIdx + 1 }} / {{ gallery.length }}</div>
      </div>
      <div v-if="gallery.length > 1" class="g-thumbs">
        <img
          v-for="(g, i) in gallery"
          :key="i"
          :src="g"
          :class="{ on: i === gIdx }"
          @click="gIdx = i"
        />
      </div>
    </div>

    <!-- 信息 -->
    <div class="info fade-up stagger-2">
      <div v-if="product.tags && product.tags.length" class="tags">
        <span v-for="t in product.tags.slice(0, 3)" :key="t" class="tag">{{ t }}</span>
      </div>
      <div class="name">{{ product.name }}</div>
      <div class="price-row">
        <span class="price">{{ fmtPrice(activeVariant ? activeVariant.price : product.price) }}</span>
        <span v-if="product.origin" class="origin">{{ fmtPrice(product.origin) }}</span>
      </div>
    </div>

    <!-- 规格选择（真实 options/variants） -->
    <div v-for="(opt, oi) in product.options" :key="oi" class="block fade-up stagger-3">
      <div class="block__title">{{ opt.name }}</div>
      <div class="opts">
        <span
          v-for="(val, vi) in opt.values"
          :key="vi"
          class="opt chip-bounce"
          :class="{ active: selectedOption[opt.name] === val, disabled: !optionAvailable(opt, val) }"
          @click="pickOption(opt, val)"
          >{{ val }}</span
        >
      </div>
    </div>

    <!-- 数量 -->
    <div class="block fade-up stagger-4">
      <div class="block__title">数量</div>
      <div class="qty">
        <button class="press" @click="changeQty(-1)">－</button>
        <span>{{ qty }}</span>
        <button class="press" @click="changeQty(1)">＋</button>
      </div>
    </div>

    <!-- 商品介绍（结构化 intro 优先，body_html 兜底，最后显示"待完善"占位） -->
    <div class="block fade-up stagger-5">
      <div class="block__title">商品介绍</div>

      <!-- 结构化介绍：summary / highlights / specs / sections -->
      <template v-if="product.intro">
        <div v-if="product.intro.summary" class="intro__summary">{{ product.intro.summary }}</div>
        <ul v-if="product.intro.highlights && product.intro.highlights.length" class="intro__chips">
          <li v-for="(h, i) in product.intro.highlights" :key="i" class="intro__chip">{{ h }}</li>
        </ul>
        <div v-if="product.intro.sections && product.intro.sections.length" class="intro__sections">
          <div v-for="(s, i) in product.intro.sections" :key="i" class="intro__sec">
            <div class="intro__sec-title">{{ s.title }}</div>
            <div v-if="s.body" class="intro__sec-body">{{ s.body }}</div>
            <img v-if="s.image" class="intro__sec-img" :src="s.image" :alt="s.title" />
            <div v-if="s.specs && s.specs.length" class="intro__specs">
              <div v-for="sp in s.specs" :key="sp.k" class="intro__specs-row">
                <span class="intro__specs-k">{{ sp.k }}</span>
                <span class="intro__specs-v">{{ sp.v }}</span>
              </div>
            </div>
          </div>
        </div>
        <video v-if="product.intro.video" class="intro__video" controls :src="product.intro.video"></video>
      </template>

      <!-- 兜底：原始 body_html 富文本（兼容老数据） -->
      <div v-else-if="product.body_html" class="desc" v-html="safeHtml(product.body_html)"></div>

      <!-- 最后兜底 -->
      <div v-else class="intro__empty">商品介绍待完善</div>
    </div>

    <div class="gap"></div>

    <!-- 底部操作 -->
    <div class="actions fade-up stagger-6">
      <button class="btn btn--cart pop press" :disabled="!buyable" @click="onAddCart">加入购物车</button>
      <button class="btn btn--buy pop press" :disabled="!buyable" @click="onBuy">立即购买</button>
    </div>

    <!-- toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>

  <div class="empty" v-else>
    <p>商品不存在</p>
    <button class="press" @click="goBack">返回</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProduct } from '../api/shop'
import { addToCart } from '../store/cart'
import IconSvg from '../components/IconSvg.vue'

const route = useRoute()
const router = useRouter()

const product = ref(null)
const gIdx = ref(0)
const qty = ref(1)
const toast = ref('')
// 当前选中的规格（option 名 → 值），默认取每个 option 第一个值
const selectedOption = ref({})

const gallery = computed(() => (product.value && product.value.images && product.value.images.length ? product.value.images : product.value ? [product.value.cover] : []))

const activeVariant = computed(() => {
  if (!product.value || !product.value.variants || !product.value.variants.length) return null
  const sel = selectedOption.value
  const names = (product.value.options || []).map((o) => o.name)
  // 多规格：匹配所有选中维度；单规格：直接取第一个变体
  const hit = product.value.variants.find((v) => {
    return names.every((n, i) => !sel[n] || (i === 0 ? v.option1 : i === 1 ? v.option2 : v.option3) === sel[n])
  })
  return hit || null
})

const buyable = computed(() => {
  if (!product.value) return false
  if (!activeVariant.value) return false
  return activeVariant.value.available !== false
})

function optionAvailable(opt, val) {
  if (!product.value || !product.value.variants) return true
  const sel = { ...selectedOption.value, [opt.name]: val }
  const names = (product.value.options || []).map((o) => o.name)
  return product.value.variants.some((v) => {
    return names.every((n) => {
      const i = names.indexOf(n)
      const vv = i === 0 ? v.option1 : i === 1 ? v.option2 : v.option3
      if (n === opt.name) return vv === val
      return !sel[n] || vv === sel[n]
    })
  })
}

function pickOption(opt, val) {
  if (!optionAvailable(opt, val)) return
  selectedOption.value = { ...selectedOption.value, [opt.name]: val }
}

function fmtPrice(v) {
  const currency = (product.value && product.value.currency) || 'USD'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(v)
  } catch (e) {
    return currency + ' ' + v
  }
}

function safeHtml(html) {
  // body_html 来自 Shopify 商品描述（可信源），直接渲染
  return html
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 1500)
}

function changeQty(d) {
  qty.value = Math.max(1, qty.value + d)
}

// 主图手指滑动切换（左滑下一张 / 右滑上一张）
let touchStartX = 0
let touchStartY = 0
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  // 横向滑动距离 > 40px 且不被纵向滚动主导，判定为切换手势
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) nextImg()
    else prevImg()
  }
}
function nextImg() {
  if (!gallery.value.length) return
  gIdx.value = (gIdx.value + 1) % gallery.value.length
}
function prevImg() {
  if (!gallery.value.length) return
  gIdx.value = (gIdx.value - 1 + gallery.value.length) % gallery.value.length
}

function goBack() {
  router.back()
}
function goCart() {
  router.push('/cart')
}

function onAddCart() {
  if (!buyable.value || !product.value) return
  addToCart(
    {
      id: product.value.id,
      name: product.value.name,
      price: activeVariant.value ? activeVariant.value.price : product.value.price,
      origin: product.value.origin,
      cover: product.value.cover,
      tag: product.value.tag,
      shopUrl: product.value.shopUrl,
      variantId: activeVariant.value ? activeVariant.value.id : null,
      spec: activeVariant.value ? activeVariant.value.title : '',
      currency: product.value.currency || 'USD',
    },
    qty.value
  )
  showToast('已加入购物车')
}

function onBuy() {
  if (!buyable.value || !product.value) return
  onAddCart()
  router.push('/cart/checkout')
}

// 路由 id 变化时重新加载（keep-alive 下 onMounted 只跑一次，必须用 watch 跟路由）
async function load(id) {
  product.value = null
  selectedOption.value = {}
  gIdx.value = 0
  qty.value = 1
  product.value = await fetchProduct(id)
  if (product.value) {
    const sel = {}
    ;(product.value.options || []).forEach((o) => {
      sel[o.name] = o.values[0]
    })
    selectedOption.value = sel
  }
}
watch(() => route.params.id, (id) => load(id), { immediate: true })
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  /* 全宽铺满：与底部按钮栏左右对齐，避免电脑预览时"中右块"视觉错位 */
  max-width: 100%;
  margin: 0;
  background: var(--bg);
}
.topbar {
  height: calc(48px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: env(safe-area-inset-top) 12px 0;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.back {
  font-size: 18px;
  width: 32px;
}
.cart {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.t {
  font-size: 15px;
  font-weight: 600;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 图库 */
.gallery {
  background: #fff;
}
.g-main {
  position: relative;
  width: 100%;
  height: 320px;
  background: #f5f5f5;
}
.g-main img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.g-count {
  position: absolute;
  right: 12px;
  bottom: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  border-radius: 8px;
  padding: 2px 8px;
}
.g-thumbs {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  overflow-x: auto;
}
.g-thumbs img {
  width: 56px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  flex: none;
  border: 2px solid transparent;
  opacity: 0.75;
}
.g-thumbs img.on {
  border-color: var(--brand);
  opacity: 1;
}

.info {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
}
.tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.tag {
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
}
.name {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 22px;
}
.origin {
  color: var(--text-sub);
  font-size: 13px;
  text-decoration: line-through;
}

.block {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
}
.block__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
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
  padding: 7px 16px;
  transition: transform 0.12s ease;
}
.opt.active {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
}
.opt.disabled {
  opacity: 0.35;
  text-decoration: line-through;
}
.qty {
  display: flex;
  align-items: center;
  gap: 14px;
}
.qty button {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  font-size: 16px;
  color: var(--text);
}
.qty span {
  font-size: 15px;
  min-width: 20px;
  text-align: center;
}
.desc {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.7;
}
.desc :deep(p) { margin: 0 0 8px; }
.desc :deep(img) { max-width: 100%; border-radius: 8px; }
.desc :deep(h1), .desc :deep(h2), .desc :deep(h3) { font-size: 15px; color: var(--text); margin: 10px 0 6px; }
.desc :deep(ul) { padding-left: 18px; margin: 0 0 8px; }

/* body_html 为空时的规格参数卡（保证任何商品都有内容） */
.specs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.specs__row {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
}
.specs__k {
  flex: none;
  width: 72px;
  color: var(--text-sub);
}
.specs__v {
  flex: 1;
  color: var(--text);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.specs__chip {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
}

/* 结构化商品介绍（按 Codex 契约 §8 渲染） */
.intro__summary {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 10px;
  font-weight: 500;
}
.intro__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
  padding: 0;
  list-style: none;
}
.intro__chip {
  background: var(--brand-soft);
  color: var(--brand);
  border-radius: 16px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
}
.intro__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 4px;
}
.intro__sec-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.intro__sec-body {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.7;
  margin-bottom: 8px;
}
.intro__sec-img {
  width: 100%;
  border-radius: 10px;
  margin: 8px 0;
  display: block;
}
.intro__specs {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 0.5px solid var(--line);
  background: var(--bg);
  margin-top: 8px;
}
.intro__specs-row {
  display: flex;
  font-size: 13px;
  padding: 10px 12px;
  border-bottom: 0.5px solid var(--line);
}
.intro__specs-row:last-child { border-bottom: none; }
.intro__specs-k {
  flex: none;
  width: 92px;
  color: var(--text-sub);
}
.intro__specs-v {
  flex: 1;
  color: var(--text);
}
.intro__video {
  width: 100%;
  border-radius: 10px;
  margin-top: 12px;
  background: #000;
}
.intro__empty {
  font-size: 13px;
  color: var(--text-sub);
  padding: 20px 0;
  text-align: center;
}

.gap {
  height: 10px;
}
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
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
.btn:disabled { opacity: 0.4; }
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
</style>
