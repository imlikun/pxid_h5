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
      <div class="g-main">
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

    <!-- 商品介绍 -->
    <div class="block fade-up stagger-5" v-if="product.body_html">
      <div class="block__title">商品介绍</div>
      <div class="desc" v-html="safeHtml(product.body_html)"></div>
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
import { ref, computed, onMounted } from 'vue'
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
  const idx = names.indexOf(opt.name)
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

onMounted(async () => {
  const id = route.params.id
  product.value = await fetchProduct(id)
  if (product.value) {
    // 默认选中每个 option 的第一个可用值
    const sel = {}
    ;(product.value.options || []).forEach((o) => {
      const first = o.values.find((val) => true)
      sel[o.name] = first
    })
    selectedOption.value = sel
  }
})
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
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

.gap {
  height: 10px;
}
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
