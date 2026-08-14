<template>
  <div class="detail" v-if="product">
    <!-- 顶栏 -->
    <div class="topbar">
      <span class="back" @click="goBack">←</span>
      <span class="t">{{ product.name }}</span>
      <span class="cart" @click="goCart"><IconSvg name="shopping-cart" :size="22" /></span>
    </div>

    <!-- 主图 -->
    <img class="cover" :src="product.cover" :alt="product.name" />

    <!-- 信息 -->
    <div class="info">
      <div class="name">{{ product.name }}</div>
      <div class="price-row">
        <span class="price">¥{{ product.price }}</span>
        <span v-if="product.origin" class="origin">¥{{ product.origin }}</span>
        <span class="sales">已售 {{ product.sales }}</span>
      </div>
      <span v-if="product.tag" class="tag">{{ product.tag }}</span>
    </div>

    <!-- 规格选择 -->
    <div class="block">
      <div class="block__title">规格</div>
      <div class="opts">
        <span
          v-for="(s, i) in specs"
          :key="i"
          class="opt"
          :class="{ active: activeSpec === i }"
          @click="activeSpec = i"
          >{{ s }}</span
        >
      </div>
    </div>

    <!-- 数量 -->
    <div class="block">
      <div class="block__title">数量</div>
      <div class="qty">
        <button @click="changeQty(-1)">－</button>
        <span>{{ qty }}</span>
        <button @click="changeQty(1)">＋</button>
      </div>
    </div>

    <div class="gap"></div>

    <!-- 底部操作 -->
    <div class="actions">
      <button class="btn btn--cart" @click="onAddCart">去 Shopify 加购</button>
      <button class="btn btn--buy" @click="onBuy">去 Shopify 购买</button>
    </div>

    <!-- toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>

  <div class="empty" v-else>
    <p>商品不存在</p>
    <button @click="goBack">返回</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products } from '../data/mock'
import { bridge } from '../bridge'
import IconSvg from '../components/IconSvg.vue'

const route = useRoute()
const router = useRouter()

const product = computed(() =>
  products.find((p) => String(p.id) === String(route.params.id))
)

const specs = ['标准版', '旗舰版', 'Pro 套装']
const activeSpec = ref(0)
const qty = ref(1)
const toast = ref('')

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
  bridge.openShopify('https://shop.pxid.com/cart')
}
function onAddCart() {
  if (!product.value) return
  bridge.openShopify(product.value.shopUrl)
  showToast('正在前往 Shopify…')
}
function onBuy() {
  if (!product.value) return
  bridge.openShopify(product.value.shopUrl)
  showToast('正在前往 Shopify…')
}
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
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
.cover {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}
.info {
  background: #fff;
  margin-top: 10px;
  padding: 14px;
}
.name {
  font-size: 17px;
  font-weight: 700;
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
.sales {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-sub);
}
.tag {
  display: inline-block;
  margin-top: 8px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
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
}
.opt.active {
  color: var(--brand);
  border-color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
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
