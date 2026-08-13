<template>
  <div class="checkout">
    <div class="topbar">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="t">确认订单</span>
      <span class="sp"></span>
    </div>

    <!-- 收货地址 -->
    <div class="addr" @click="onAddr">
      <div class="addr-info">
        <div class="addr-line">
          <span class="name">{{ address.name }}</span>
          <span class="phone">{{ address.phone }}</span>
        </div>
        <div class="addr-detail">{{ address.detail }}</div>
      </div>
      <svg class="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <!-- 商品清单（勾选项） -->
    <div class="goods">
      <div v-for="it in checkedItems" :key="it.id" class="g-row">
        <div class="g-cover">{{ it.cover }}</div>
        <div class="g-mid">
          <div class="g-name">{{ it.name }}</div>
          <div class="g-spec">{{ it.tag || '原厂配件' }}</div>
        </div>
        <div class="g-right">
          <div class="g-price">¥{{ it.price }}</div>
          <div class="g-qty">x{{ it.qty }}</div>
        </div>
      </div>
    </div>

    <!-- 金额明细 -->
    <div class="amount">
      <div class="a-row">
        <span>商品金额</span>
        <span>¥{{ checkedTotal }}</span>
      </div>
      <div class="a-row">
        <span>运费</span>
        <span>免运费</span>
      </div>
      <div class="a-row">
        <span>优惠</span>
        <span>-¥0</span>
      </div>
      <div class="a-row a-total">
        <span>实付款</span>
        <span class="a-price">¥{{ checkedTotal }}</span>
      </div>
    </div>

    <!-- 提交订单 -->
    <div class="submit">
      <button class="pay-btn" :disabled="submitting" @click="onSubmit">
        {{ submitting ? '提交中...' : `提交订单 · ¥${checkedTotal}` }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { checkedItems, checkedTotal, removeFromCart } from '../store/cart'
import { orders } from '../data/mock'
import bridge from '../bridge'

const router = useRouter()
const submitting = ref(false)

const address = {
  name: '李坤',
  phone: '132 7517 1596',
  detail: '江苏省淮安市 清江浦区 深圳东路 18 号 4 号厂房第三层',
}

function onAddr() {
  // 地址管理留原生：bridge 唤起
  bridge.call('openNative', { target: 'address.list' })
}

async function onSubmit() {
  if (checkedItems.value.length === 0 || submitting.value) return
  submitting.value = true
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const order = {
    orderId: 'PX' + Date.now().toString().slice(-10),
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    status: '待发货',
    items: checkedItems.value.map((i) => ({ name: i.name, cover: i.cover, price: i.price, qty: i.qty })),
    total: checkedTotal.value,
  }
  const ok = await bridge.requestPurchase({ orderId: order.orderId, items: order.items, total: order.total })
  submitting.value = false
  if (ok) {
    orders.unshift(order)
    checkedItems.value.forEach((i) => removeFromCart(i.id))
    router.replace({ path: '/order/success', query: { id: order.orderId, total: order.total } })
  }
}
</script>

<style scoped>
.checkout {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: calc(84px + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #ffffff;
}
.back { display: flex; width: 32px; color: #333; }
.sp { width: 32px; }
.t { font-size: 16px; font-weight: 600; color: #333; }

.addr {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  margin: 12px 12px 0;
  border-radius: 12px;
  padding: 14px;
}
.addr-info { flex: 1; min-width: 0; }
.addr-line { display: flex; align-items: baseline; gap: 10px; }
.name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.phone { font-size: 13px; color: #666; }
.addr-detail { margin-top: 6px; font-size: 13px; color: #666; line-height: 1.5; }
.arrow { flex: none; }

.goods {
  background: #ffffff;
  margin: 12px 12px 0;
  border-radius: 12px;
  padding: 4px 14px;
}
.g-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}
.g-row:last-child { border-bottom: none; }
.g-cover {
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
.g-mid { flex: 1; min-width: 0; }
.g-name { font-size: 14px; color: #333; line-height: 1.4; }
.g-spec { margin-top: 4px; font-size: 12px; color: #999; }
.g-right { text-align: right; }
.g-price { color: #e53935; font-weight: 700; font-size: 15px; }
.g-qty { margin-top: 4px; font-size: 12px; color: #999; }

.amount {
  background: #ffffff;
  margin: 12px 12px 0;
  border-radius: 12px;
  padding: 4px 14px;
}
.a-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #f5f5f5;
}
.a-row:last-child { border-bottom: none; }
.a-total { color: #1a1a1a; font-weight: 600; }
.a-price { color: #e53935; font-weight: 700; font-size: 18px; }

.submit {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 420px;
  padding: 12px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}
.pay-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: #1a1a1a;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}
.pay-btn:disabled { opacity: 0.5; }
</style>