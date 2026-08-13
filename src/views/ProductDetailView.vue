<template>
  <div class="detail" v-if="product">
    <!-- 顶栏 -->
    <div class="topbar">
      <span class="back" @click="goBack">←</span>
      <span class="t">商品详情</span>
      <span class="cart" @click="goCart">🛒</span>
    </div>

    <!-- 主图 -->
    <div class="cover">{{ product.cover }}</div>

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

    <!-- 底部操作 -->
    <div class="actions">
      <button class="btn btn--cart" @click="onAddCart">加入购物车</button>
      <button class="btn btn--buy" @click="onBuy">立即购买</button>
    </div>
  </div>

  <div class="empty" v-else>
    <p>商品不存在</p>
    <button @click="goBack">返回</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { products } from '../data/mock'
import { addToCart } from '../store/cart'
import { bridge } from '../bridge'

const route = useRoute()
const router = useRouter()

const product = computed(() =>
  products.find((p) => String(p.id) === String(route.params.id))
)

function goBack() {
  router.back()
}
function goCart() {
  router.push('/cart')
}
function onAddCart() {
  if (product.value) addToCart(product.value)
  bridge.requestPurchase({ type: 'addToCart', id: product.value?.id })
}
function onBuy() {
  bridge.requestPurchase({ type: 'buyNow', product: product.value })
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
}
.back,
.cart {
  font-size: 18px;
  width: 32px;
}
.t {
  font-size: 15px;
  font-weight: 600;
}
.cover {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 140px;
  background: linear-gradient(135deg, #f3f6ff, #eaf1ff);
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
.empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-sub);
}
</style>
