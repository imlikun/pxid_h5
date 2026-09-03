<template>
  <div class="cart">
    <TopBar sticky title="购物车" :back="goBack" />

    <div v-if="cart.items.length" class="list">
      <div v-for="it in cart.items" :key="it.key" class="row">
        <!-- 勾选 -->
        <span class="check" :class="{ on: it.checked }" @click="toggleChecked(it.key)">
          <svg v-if="it.checked" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <img v-if="it.cover && (it.cover.startsWith('http') || it.cover.startsWith('/'))" class="cover" :src="it.cover" :alt="it.name" />
        <IconSvg v-else :name="it.cover" :size="44" style="width:56px;height:56px;border-radius:10px;background:var(--brand-soft);color:var(--brand);padding:11px;box-sizing:border-box;flex:none" />
        <div class="mid">
          <div class="name">{{ it.name }}</div>
          <div class="spec" v-if="it.variantTitle">{{ it.variantTitle }}</div>
          <div class="price">{{ sym(it.currency) }}{{ it.price }}</div>
        </div>
        <div class="qty">
          <button @click="changeQty(it.key, -1)">－</button>
          <span>{{ it.qty }}</span>
          <button @click="changeQty(it.key, 1)">＋</button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <IconSvg class="e-emoji" name="shopping-cart" :size="56" />
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
        合计 <span class="price">{{ sym(checkedCurrency) }}{{ checkedTotal }}</span>
      </div>
      <button class="pay" :disabled="checkedCount === 0" @click="goCheckout">
        去结算({{ checkedCount }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'
import {
  cart,
  changeQty,
  toggleChecked,
  toggleAllChecked,
  clearChecked,
  allChecked,
  checkedItems,
  checkedTotal,
  checkedCount,
} from '../store/cart'
import { getStore, sym, API_BASE, getRegion } from '../api/shop'
import { bridge } from '../bridge'

const router = useRouter()

const checkedCurrency = computed(() => {
  const first = checkedItems.value[0]
  return first ? first.currency : 'USD'
})

function goBack() {
  router.back()
}
function goDiscover() {
  router.push('/featured')
}
async function goCheckout() {
  if (checkedCount.value === 0) return
  const store = getStore()
  if (!store) {
    alert('店铺信息加载中，请稍后重试')
    return
  }
  // 多品组装 items[]，走后端 checkout-v2 建 Shopify 车并预填邮箱/地址
  const items = checkedItems.value.map((it) => ({ variantId: it.variantId, qty: it.qty }))
  const fallback = () => {
    const parts = checkedItems.value.map((it) => `${it.variantId}:${it.qty}`).join(',')
    bridge.openShopify(`https://${store}/cart/${parts}`)
    clearChecked()
  }
  try {
    let profile = {}
    try { profile = (await bridge.getUserInfo()) || {} } catch (e) { profile = {} }
    const r = await fetch(`${API_BASE}/mall-api/checkout-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        region: getRegion(),
        email: profile.email || '',
        memberUserId: profile.memberUserId || '',
        shippingAddress: profile.shippingAddress || null,
      }),
    })
    const j = await r.json()
    const url = (j.data && j.data.url) || j.url
    if (!url) throw new Error('empty checkout url')
    bridge.openShopify(url)
    showToast('正在前往 Shopify…')
    clearChecked()
  } catch (e) {
    fallback()
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
.cart {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
/* ⚠️ 顶栏安全区：本页不得吸收 env(safe-area-inset-top)（2026-09-01 二修）
   HANDOFF.md 第 1 条：Flutter 已用 SafeArea 包住 WebView，H5 顶栏固定 48px 即可。
   历史两次事故：① 根容器 padding-top:env() → 48+env≈92px；② 挪进 :deep(.tb-bar) 用
   padding+height → 总高仍是 48+env，等于没改。正确做法是把这层 env 整段删掉，
   与同在精选 tab 的 FeaturedView 保持一致（该页从未加过，显示正常）。 */
.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  background: #ffffff;
  border-radius: var(--radius);
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
  object-fit: cover;
  flex: none;
}
.mid { flex: 1; min-width: 0; }
.name { font-size: 14px; color: #333; line-height: 1.4; }
.spec { font-size: 12px; color: #999; margin-top: 2px; }
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
.e-emoji {
  width: 56px;
  height: 56px;
  color: #cccccc;
  margin: 0 auto 8px;
}
.empty button {
  margin-top: 14px;
  background: var(--brand-light);
  color: #fff;
  border-radius: var(--radius-xxl);
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
