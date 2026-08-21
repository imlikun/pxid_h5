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
import { getStore, sym } from '../api/shop'
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
function goCheckout() {
  if (checkedCount.value === 0) return
  const store = getStore()
  if (!store) {
    alert('店铺信息加载中，请稍后重试')
    return
  }
  // 拼 Shopify cart permalink（多品逗号分隔），用户到 Shopify 看到已加好的车直接 checkout
  const parts = checkedItems.value
    .map((it) => `${it.variantId}:${it.qty}`)
    .join(',')
  const url = `https://${store}/cart/${parts}`
  bridge.openShopify(url)
  // permalink 是"添加"语义，跳转即代表已带入 Shopify 车，清空本地车
  clearChecked()
}
</script>

<style scoped>
.cart {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: env(safe-area-inset-top) 12px 12px;
  height: calc(48px + env(safe-area-inset-top));
  background: #ffffff;
  position: sticky;
  top: 0;
  z-index: 10;
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
