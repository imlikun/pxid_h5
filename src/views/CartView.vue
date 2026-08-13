<template>
  <div class="cart">
    <div class="topbar">
      <span class="back" @click="goBack">←</span>
      <span class="t">购物车</span>
      <span class="sp"></span>
    </div>

    <div v-if="cart.items.length" class="list">
      <div v-for="it in cart.items" :key="it.id" class="row">
        <div class="cover">{{ it.cover }}</div>
        <div class="mid">
          <div class="name">{{ it.name }}</div>
          <div class="price">¥{{ it.price }}</div>
        </div>
        <div class="qty">
          <button @click="changeQty(it.id, -1)">－</button>
          <span>{{ it.qty }}</span>
          <button @click="changeQty(it.id, 1)">＋</button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="e-emoji">🛒</div>
      <p>购物车还是空的</p>
      <button @click="goDiscover">去精选逛逛</button>
    </div>

    <!-- 结算条 -->
    <div v-if="cart.items.length" class="checkout">
      <div class="total">合计 <span class="price">¥{{ cartTotal }}</span></div>
      <button class="pay" @click="onPay">去结算</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { cart, changeQty, cartTotal } from '../store/cart'
import { bridge } from '../bridge'

const router = useRouter()

function goBack() {
  router.back()
}
function goDiscover() {
  router.push('/featured')
}
function onPay() {
  bridge.requestPurchase({ type: 'checkout', items: cart.items, total: cartTotal.value })
}
</script>

<style scoped>
.cart {
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
.back {
  font-size: 18px;
  width: 32px;
}
.sp {
  width: 32px;
}
.t {
  font-size: 15px;
  font-weight: 600;
}
.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  background: #fff;
  border-radius: var(--radius);
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cover {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f3f6ff, #eaf1ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex: none;
}
.mid {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 14px;
}
.price {
  color: var(--price);
  font-weight: 700;
  margin-top: 4px;
}
.qty {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qty button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--line);
  font-size: 14px;
  color: var(--text);
}
.empty {
  padding: 80px 20px;
  text-align: center;
  color: var(--text-sub);
}
.e-emoji {
  font-size: 56px;
}
.empty button {
  margin-top: 14px;
  background: var(--brand);
  color: #fff;
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 13px;
}
.checkout {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--line);
}
.total {
  font-size: 13px;
  color: var(--text-sub);
}
.price {
  color: var(--price);
  font-weight: 700;
  font-size: 18px;
}
.pay {
  background: var(--brand);
  color: #fff;
  border-radius: 22px;
  padding: 10px 28px;
  font-size: 15px;
  font-weight: 600;
}
</style>
