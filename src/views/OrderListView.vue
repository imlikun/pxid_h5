<template>
  <div class="orders">
    <div class="topbar">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="t">我的订单</span>
      <span class="sp"></span>
    </div>

    <!-- 状态 tab -->
    <div class="tabs">
      <span
        v-for="tb in orderTabs"
        :key="tb"
        class="tab"
        :class="{ active: activeTab === tb }"
        @click="activeTab = tb"
      >{{ tb }}</span>
    </div>

    <!-- 订单列表 -->
    <div class="list">
      <div v-for="o in filteredOrders" :key="o.id" class="card">
        <div class="o-head">
          <span class="o-id">订单号 {{ o.id }}</span>
          <span class="o-status" :class="'s-' + statusKey(o.status)">{{ o.status }}</span>
        </div>
        <div class="o-time">{{ o.time }}</div>

        <div class="o-items">
          <div v-for="(it, i) in o.items" :key="i" class="o-item">
            <IconSvg :name="it.cover" :size="40" style="width:48px;height:48px;border-radius:8px;background:var(--brand-soft);color:var(--brand);padding:9px;box-sizing:border-box;flex:none" />
            <div class="o-mid">
              <div class="o-name">{{ it.name }}</div>
              <div class="o-spec">¥{{ it.price }} × {{ it.qty }}</div>
            </div>
          </div>
        </div>

        <div class="o-foot">
          <span class="o-total">共 {{ oCount(o) }} 件 合计 <b>¥{{ o.total }}</b></span>
          <div class="o-actions">
            <button v-if="o.status === '待付款'" class="btn dark" @click="pay(o)">去支付</button>
            <template v-else>
              <button class="btn ghost" @click="buyAgain(o)">再来一单</button>
              <button class="btn ghost" @click="detail(o)">查看详情</button>
            </template>
          </div>
        </div>
      </div>

      <div v-if="filteredOrders.length === 0" class="empty">暂无订单</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { orderTabs, orders } from '../data/mock'
import { addToCart } from '../store/cart'
import bridge from '../bridge'
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()
const activeTab = ref('全部')

const statusKey = (s) => ({ 待付款: 'pay', 待发货: 'ship', 已发货: 'sent', 已完成: 'done' }[s] || '')
const oCount = (o) => o.items.reduce((s, i) => s + i.qty, 0)

const filteredOrders = computed(() =>
  activeTab.value === '全部' ? orders : orders.filter((o) => o.status === activeTab.value)
)

function pay(o) {
  bridge.requestPurchase({ orderId: o.id, total: o.total })
}
function buyAgain(o) {
  o.items.forEach((i) => addToCart({ id: i.name, name: i.name, cover: i.cover, price: i.price }, i.qty))
  router.push('/cart')
}
function detail(o) {
  console.log('order detail:', o.id)
}
</script>

<style scoped>
.orders { min-height: 100vh; background: var(--bg); padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
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

.tabs {
  display: flex;
  background: #ffffff;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
}
.tab {
  padding: 12px 14px;
  font-size: 14px;
  color: #666;
  position: relative;
}
.tab.active { color: #1a1a1a; font-weight: 700; }
.tab.active::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: #1a1a1a;
}

.list { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
}
.o-head { display: flex; align-items: center; justify-content: space-between; }
.o-id { font-size: 13px; color: #666; }
.o-status { font-size: 13px; font-weight: 600; }
.s-pay { color: #f59e0b; }
.s-ship { color: var(--brand-light); }
.s-sent { color: #34a853; }
.s-done { color: #999; }
.o-time { margin-top: 4px; font-size: 12px; color: #bbb; }

.o-items { margin-top: 12px; }
.o-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f7f7f7;
}
.o-item:last-child { border-bottom: none; }
.o-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex: none;
}
.o-mid { flex: 1; min-width: 0; }
.o-name { font-size: 14px; color: #333; }
.o-spec { margin-top: 4px; font-size: 12px; color: #999; }

.o-foot {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.o-total { font-size: 13px; color: #666; }
.o-total b { color: #e53935; font-size: 15px; }
.o-actions { display: flex; gap: 8px; }
.btn {
  border-radius: 16px;
  padding: 7px 14px;
  font-size: 12px;
}
.btn.dark { background: #1a1a1a; color: #ffffff; }
.btn.ghost { background: #ffffff; border: 1px solid #e0e0e0; color: #333; }

.empty { text-align: center; color: #999; padding: 48px 0; font-size: 13px; }
</style>