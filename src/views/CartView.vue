<template>
  <div class="cart">
    <div class="topbar">
      <span class="back" @click="goBack">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="t">购物车</span>
      <span class="sp"></span>
    </div>

    <div v-if="cart.items.length" class="list">
      <div v-for="it in cart.items" :key="it.id" class="row">
        <!-- 勾选 -->
        <span class="check" :class="{ on: it.checked }" @click="toggleChecked(it.id)">
          <svg v-if="it.checked" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
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
      <span class="all" @click="toggleAllChecked(!allChecked)">
        <span class="check" :class="{ on: allChecked }">
          <svg v-if="allChecked" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <span class="all-txt">全选</span>
      </span>
      <div class="total">
        合计 <span class="price">¥{{ checkedTotal }}</span>
      </div>
      <button class="pay" :disabled="checkedCount === 0" @click="goCheckout">
        去结算({{ checkedCount }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import {
  cart,
  changeQty,
  toggleChecked,
  toggleAllChecked,
  allChecked,
  checkedTotal,
  checkedCount,
} from '../store/cart'

const router = useRouter()

function goBack() {
  router.back()
}
function goDiscover() {
  router.push('/featured')
}
function goCheckout() {
  if (checkedCount.value === 0) return
  router.push('/cart/checkout')
}
</script>

<style scoped>
.cart {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #ffffff;
}
.back { font-size: 18px; width: 32px; display: flex; color: #333; }
.sp { width: 32px; }
.t { font-size: 15px; font-weight: 600; color: #333; }

.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  transition: all 0.15s;
}
.check.on {
  background: #1a1a1a;
  border-color: #1a1a1a;
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
.mid { flex: 1; min-width: 0; }
.name { font-size: 14px; color: #333; line-height: 1.4; }
.price { color: #e53935; font-weight: 700; margin-top: 4px; font-size: 15px; }
.qty {
  display: flex;
  align-items: center;
  gap: 8px;
}
.qty button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  font-size: 14px;
  color: #333;
  background: #fff;
}
.qty span { min-width: 18px; text-align: center; font-size: 14px; }

.empty {
  padding: 80px 20px;
  text-align: center;
  color: #999;
}
.e-emoji { font-size: 56px; }
.empty button {
  margin-top: 14px;
  background: #548eff;
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
  gap: 12px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}
.all {
  display: flex;
  align-items: center;
  gap: 6px;
}
.all .check { width: 18px; height: 18px; }
.all-txt { font-size: 13px; color: #666; }
.total { flex: 1; text-align: right; font-size: 13px; color: #666; }
.total .price { color: #e53935; font-weight: 700; font-size: 18px; }
.pay {
  background: #1a1a1a;
  color: #fff;
  border-radius: 22px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 600;
}
.pay:disabled { opacity: 0.4; }
</style>