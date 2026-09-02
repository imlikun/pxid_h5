<template>
  <div class="od">
    <TopBar sticky :title="t('order.detailTitle')" />

    <div v-if="loading" class="tip">{{ t('order.loading') }}</div>
    <div v-else-if="!order" class="tip empty">{{ t('order.notFound') }}</div>

    <template v-else>
      <!-- 状态条 -->
      <div class="status">
        <div class="status__txt">{{ order.status }}</div>
        <div class="status__sub">{{ statusHint(order.status) }}</div>
      </div>

      <!-- 物流时间轴（仅有真实物流信息时显示） -->
      <div v-if="order.tracking && order.tracking.length" class="card">
        <div class="card__title">{{ t('order.logistics') }}</div>
        <div class="timeline">
          <div v-for="(tk, i) in order.tracking" :key="i" class="tl-item" :class="{ first: i === 0 }">
            <span class="tl-dot"></span>
            <div class="tl-body">
              <div class="tl-text">{{ tk.text }}</div>
              <div class="tl-time">{{ tk.time }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品 -->
      <div class="card">
        <div class="card__title">{{ t('order.items') }}</div>
        <div v-for="(it, i) in order.items" :key="i" class="o-item">
          <IconSvg :name="it.cover || 'gear'" :size="40" style="width:56px;height:56px;border-radius:8px;background:var(--brand-soft);color:var(--brand);padding:11px;box-sizing:border-box;flex:none" />
          <div class="o-mid">
            <div class="o-name">{{ it.name }}</div>
            <div class="o-spec">{{ sym(order.currency) }}{{ it.price }} × {{ it.qty }}</div>
          </div>
        </div>
      </div>

      <!-- 金额 / 信息 -->
      <div class="card">
        <div class="row"><span>{{ t('order.orderNo') }}</span><span class="mono">{{ order.id }}</span></div>
        <div class="row"><span>{{ t('order.time') }}</span><span>{{ order.time }}</span></div>
        <div class="row" v-if="order.address"><span>{{ t('order.address') }}</span><span>{{ order.address }}</span></div>
        <div class="row total"><span>{{ t('order.total') }}</span><b>{{ sym(order.currency) }}{{ order.total }}</b></div>
      </div>

      <div class="actions">
        <button v-if="order.status === '待付款'" class="btn dark" @click="pay">{{ t('order.pay') }}</button>
        <button v-if="order.rawOrderId" class="btn ghost" @click="applyReturn">{{ t('order.aftersale') }}</button>
        <button class="btn ghost" @click="buyAgain">{{ t('order.buyAgain') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { API_BASE, sym } from '../api/shop'
import { bridge } from '../bridge'
import { orders as mockOrders } from '../data/mock'
import { addToCart } from '../store/cart'
import { t } from '../i18n'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const router = useRouter()
const order = ref(null)
const loading = ref(true)

// 列表传入的 id：真实订单是 #123，mock 是 PX2026...；统一去掉 # 后查找
const rawId = route.params.id
const lookId = String(rawId || '').replace(/^#/, '')

function findMock(id) {
  return (mockOrders || []).find((o) => String(o.id).replace(/^#/, '') === id)
}

function statusHint(s) {
  return (
    {
      待付款: t('order.hint.pay'),
      待发货: t('order.hint.ship'),
      已发货: t('order.hint.sent'),
      已完成: t('order.hint.done'),
    }[s] || ''
  )
}

async function load() {
  loading.value = true
  try {
    // 真实订单：mall-api/order/:id（带 token）
    const token = await bridge.getToken().catch(() => '')
    if (token) {
      try {
        const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
        const r = await fetch(`${API_BASE}/mall-api/order/${encodeURIComponent(lookId)}`, { headers })
        if (r.ok) {
          const j = await r.json()
          const d = (j && j.data) || null
          if (d) {
            order.value = {
              id: '#' + d.order_id,
              rawOrderId: d.order_id,
              status: ({ pending: '待发货', unfulfilled: '待发货', fulfilled: '已发货', paid: '待发货' }[d.fulfillment] || d.fulfillment || '已下单'),
              time: d.created_at ? new Date(d.created_at).toLocaleString('zh-CN') : '',
              currency: d.currency || 'USD',
              total: d.total || 0,
              items: (JSON.parse(d.items_json || '[]') || []).map((it) => ({ name: it.title || '商品', price: it.price || 0, qty: it.qty || 1, cover: '' })),
              tracking: Array.isArray(d.tracking) ? d.tracking : [],
              address: d.address || '',
            }
            return
          }
        }
      } catch (e) {
        console.warn('[order-detail] remote failed, fallback mock:', e.message || e)
      }
    }
    // 兜底：本地 mock
    order.value = findMock(lookId) || null
  } finally {
    loading.value = false
  }
}

onMounted(load)

function pay() {
  if (order.value) bridge.requestPurchase({ orderId: order.value.id, total: order.value.total })
}
function buyAgain() {
  ;(order.value.items || []).forEach((i) => addToCart({ id: i.name, name: i.name, cover: i.cover, price: i.price }, i.qty))
  router.push('/cart')
}
async function applyReturn() {
  if (!order.value || !order.value.rawOrderId) return
  try {
    const token = await bridge.getToken().catch(() => '')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = 'Bearer ' + token
    const r = await fetch(`${API_BASE}/mall-api/order/return-request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId: order.value.rawOrderId, type: 'return', reason: '' }),
    })
    const j = await r.json()
    showToast(j && (j.code === 0 || j.ok) ? t('order.returnOk') : (j && j.msg) || t('order.returnFail'))
  } catch (e) {
    showToast(t('order.returnFail'))
  }
}
function showToast(msg) {
  let el = document.getElementById('__toast')
  if (!el) {
    el = document.createElement('div')
    el.id = '__toast'
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;z-index:9999;pointer-events:none;max-width:80%;text-align:center'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.style.display = 'block'
  clearTimeout(el.__t)
  el.__t = setTimeout(() => (el.style.display = 'none'), 1500)
}
</script>

<style scoped>
.od { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.tip { text-align: center; color: #999; padding: 60px 20px; font-size: 14px; }
.tip.empty { color: #bbb; }
.status {
  margin: 12px 12px 0;
  padding: 18px 16px;
  border-radius: var(--radius-lg);
  background: var(--brand);
  color: #fff;
}
.status__txt { font-size: 18px; font-weight: 700; }
.status__sub { margin-top: 4px; font-size: 13px; opacity: 0.9; }
.card {
  margin: 12px 12px 0;
  padding: 14px;
  background: var(--card);
  border-radius: var(--radius-lg);
}
.card__title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
.timeline { position: relative; padding-left: 14px; }
.tl-item { position: relative; padding-bottom: 14px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-dot {
  position: absolute;
  left: -14px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d0d0d0;
}
.tl-item.first .tl-dot { background: var(--brand); }
.tl-text { font-size: 13px; color: var(--text); }
.tl-time { margin-top: 2px; font-size: 12px; color: #bbb; }
.o-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.o-item:last-child { border-bottom: none; }
.o-mid { flex: 1; min-width: 0; }
.o-name { font-size: 14px; color: #333; }
.o-spec { margin-top: 4px; font-size: 12px; color: #999; }
.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #666;
  padding: 7px 0;
}
.row .mono { font-family: monospace; }
.row.total { border-top: 1px solid #f0f0f0; margin-top: 4px; padding-top: 10px; }
.row.total b { color: #e53935; font-size: 15px; }
.actions { display: flex; gap: 8px; margin: 14px 12px 0; }
.btn { border-radius: var(--radius-lg); padding: 10px 16px; font-size: 14px; flex: 1; }
.btn.dark { background: #1a1a1a; color: #fff; border: none; }
.btn.ghost { background: #fff; border: 1px solid #e0e0e0; color: #333; }
</style>
