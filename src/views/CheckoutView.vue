<template>
  <div class="checkout">
    <TopBar sticky title="前往 Shopify 结算" />

    <div class="body">
      <div class="spinner"></div>
      <p class="main">正在前往 Shopify 结算…</p>
      <p class="sub">订单与支付均在 Shopify 完成，PXID 不存储任何交易信息</p>
      <button class="pay-btn" @click="jump">手动前往 Shopify 结算 ›</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkedItems, clearChecked } from '../store/cart'
import { getStore } from '../api/shop'
import { bridge } from '../bridge'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
let done = false

function jump() {
  if (done) return
  const store = getStore()
  if (!store || checkedItems.value.length === 0) {
    router.replace('/cart')
    return
  }
  const parts = checkedItems.value
    .map((it) => `${it.variantId}:${it.qty}`)
    .join(',')
  done = true
  bridge.openShopify(`https://${store}/cart/${parts}`)
  // 跳转即代表已带入 Shopify 车，清空本地车
  clearChecked()
  router.replace('/cart')
}

// 进入即自动跳转（兜底中转：主路径已由 CartView 直接拼 permalink 跳转）
onMounted(jump)
</script>

<style scoped>
.checkout {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  display: flex;
  flex-direction: column;
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px 80px;
  text-align: center;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #eee;
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.main { font-size: 15px; color: #333; font-weight: 600; }
.sub { font-size: 12px; color: #999; margin-top: 8px; line-height: 1.6; }
.pay-btn {
  margin-top: 24px;
  background: #1a1a1a;
  color: #fff;
  border-radius: 24px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
}
</style>
