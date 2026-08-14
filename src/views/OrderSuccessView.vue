<template>
  <div class="success">
    <div class="icon">
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </div>
    <h2>支付成功</h2>
    <p class="sub">订单已提交，我们会尽快为你发货</p>

    <div class="card">
      <div class="row"><span>订单编号</span><span class="mono">{{ orderId }}</span></div>
      <div class="row"><span>实付金额</span><span class="price">¥{{ total }}</span></div>
    </div>

    <div class="btns">
      <button class="btn ghost" @click="goFeatured">返回精选</button>
      <button class="btn dark" @click="goOrders">查看订单</button>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const orderId = route.query.id || '—'
const total = route.query.total || '0'

function goFeatured() {
  router.replace('/featured')
}
function goOrders() {
  router.replace('/order/list')
}
</script>

<style scoped>
.success {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 90px;
  padding: 90px 24px 0;
}
.icon {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4caf50, #2e9e44);
  display: flex;
  align-items: center;
  justify-content: center;
}
h2 { margin-top: 20px; font-size: 22px; font-weight: 700; color: #1a1a1a; }
.sub { margin-top: 8px; font-size: 14px; color: #999; }
.card {
  width: 100%;
  background: #f7f7f7;
  border-radius: var(--radius);
  margin-top: 32px;
  padding: 6px 16px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #ececec;
}
.row:last-child { border-bottom: none; }
.mono { color: #333; }
.price { color: #e53935; font-weight: 700; font-size: 17px; }
.btns {
  width: 100%;
  display: flex;
  gap: 12px;
  margin-top: 32px;
}
.btn {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
}
.ghost { background: #ffffff; border: 1px solid #e0e0e0; color: #333; }
.dark { background: #1a1a1a; color: #ffffff; }
</style>