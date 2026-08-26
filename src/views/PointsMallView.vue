<template>
  <div class="pm">
    <TopBar :title="t('points.mallTitle')" />
    <div class="pm__tip">{{ t('points.mallTip') }}</div>

    <!-- 积分余额 -->
    <div class="pm__balance" v-if="balance !== null">
      <span class="pm__balance-num">{{ balance }}</span>
      <span class="pm__balance-label">{{ t('points.balanceLabel') }}</span>
    </div>

    <div class="pm__list">
      <div v-for="p in goods" :key="p.id" class="pm__item">
        <img class="pm__img" :src="p.cover" :alt="p.name" />
        <div class="pm__info">
          <div class="pm__name">{{ p.name }}</div>
          <div class="pm__tags">
            <span v-for="(tag, i) in p.tags" :key="i" class="pm__tag">{{ tag }}</span>
          </div>
          <div class="pm__price">
            <span class="pm__amount">¥{{ p.price }}</span>
            <span class="pm__pts">{{ t('points.orPoints', { n: p.points }) }}</span>
            <span class="pm__stock" v-if="p.stock !== undefined && p.stock <= 0">{{ t('points.soldOut') }}</span>
          </div>
        </div>
        <button
          class="pm__btn"
          :class="{ 'is-disabled': p.stock !== undefined && p.stock <= 0 }"
          @click.stop="openExchange(p)"
          :disabled="p.stock !== undefined && p.stock <= 0"
        >{{ p.stock !== undefined && p.stock <= 0 ? t('points.soldOut') : t('points.exchange') }}</button>
      </div>
    </div>
    <div class="pm__empty" v-if="!goods.length">{{ t('points.mallEmpty') }}</div>

    <!-- 收货信息表单 -->
    <div v-if="exchangeTarget" class="pm__overlay" @click.self="closeExchange">
      <div class="pm__sheet">
        <div class="pm__sheet-title">兑换 · {{ exchangeTarget.name }}</div>
        <input v-model="shipName" class="pm__input" placeholder="收货人姓名" />
        <input v-model="shipPhone" class="pm__input" placeholder="联系电话" type="tel" />
        <input v-model="shipAddress" class="pm__input" placeholder="收货地址（省市区+详细门牌）" />
        <input v-model="shipNote" class="pm__input" placeholder="备注（选填）" />
        <div class="pm__sheet-cost">将扣除 {{ exchangeTarget.points }} 积分</div>
        <div class="pm__sheet-actions">
          <button class="pm__sheet-cancel" @click="closeExchange">取消</button>
          <button class="pm__sheet-confirm" @click="confirmExchange" :disabled="submitting">{{ submitting ? '兑换中…' : '确认兑换' }}</button>
        </div>
      </div>
    </div>

    <!-- toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { t } from '../i18n'
import { pointsProducts as mockProducts } from '../data/mock'
import { fetchPointsProducts, doPointsExchange } from '../api/growth'

// 自家后端闭环（2026-08-26）：商品/余额/兑换走 /growth/* 真实接口；
// 后端不可用（未登录/网络）时降级 mock 展示（只读，兑换会提示失败）
const goods = ref([])
const balance = ref(null)
const exchangeTarget = ref(null)
const shipName = ref('')
const shipPhone = ref('')
const shipAddress = ref('')
const shipNote = ref('')
const submitting = ref(false)
const toast = ref('')
let toastTimer = null

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

async function load() {
  try {
    const data = await fetchPointsProducts()
    goods.value = data.list || []
    balance.value = data.balance ?? null
  } catch (e) {
    // 降级：mock 展示（标注无真实库存/余额）
    goods.value = mockProducts.map((m) => ({ ...m, tags: m.tags || [], stock: 999 }))
    balance.value = null
  }
}

function openExchange(p) {
  exchangeTarget.value = p
  shipName.value = ''
  shipPhone.value = ''
  shipAddress.value = ''
  shipNote.value = ''
}
function closeExchange() {
  exchangeTarget.value = null
}

async function confirmExchange() {
  const p = exchangeTarget.value
  if (!p) return
  if (!shipName.value.trim() || !shipPhone.value.trim() || !shipAddress.value.trim()) {
    showToast('请填写完整收货信息')
    return
  }
  submitting.value = true
  try {
    const r = await doPointsExchange({
      productId: p.id,
      shippingName: shipName.value.trim(),
      shippingPhone: shipPhone.value.trim(),
      shippingAddress: shipAddress.value.trim(),
      note: shipNote.value.trim() || undefined,
    })
    balance.value = r.balance
    showToast(t('points.exchangeOk'))
    closeExchange()
    load() // 刷新库存
  } catch (e) {
    showToast((e && e.message) || t('points.exchangeFail'))
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.pm {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 24px;
}
.pm__tip {
  margin: 12px 16px 4px;
  font-size: 12px;
  color: var(--text-hint);
  line-height: 1.5;
}
.pm__balance {
  margin: 12px 16px 0;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--card);
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.pm__balance-num {
  font-size: 32px;
  font-weight: 700;
  color: var(--brand);
}
.pm__balance-label {
  font-size: 13px;
  color: var(--text-hint);
}
.pm__list {
  padding: 12px 16px;
}
.pm__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}
.pm__img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
  background: var(--bg);
}
.pm__info {
  flex: 1;
  min-width: 0;
}
.pm__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pm__tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pm__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
}
.pm__price {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.pm__amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--price);
}
.pm__pts {
  font-size: 12px;
  color: var(--text-hint);
}
.pm__stock {
  font-size: 11px;
  color: var(--price);
}
.pm__btn {
  flex: none;
  padding: 7px 14px;
  border-radius: var(--radius);
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border: none;
}
.pm__btn.is-disabled {
  background: var(--brand-soft);
  color: var(--brand);
  opacity: 0.7;
}
.pm__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
}

/* 收货表单 */
.pm__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pm__sheet {
  width: 100%;
  max-width: 480px;
  background: var(--card);
  border-radius: 16px 16px 0 0;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pm__sheet-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}
.pm__input {
  height: 42px;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 0 12px;
  font-size: 14px;
  color: var(--text);
  border: 1px solid var(--line);
}
.pm__sheet-cost {
  font-size: 12px;
  color: var(--text-hint);
  text-align: center;
}
.pm__sheet-actions {
  display: flex;
  gap: 10px;
}
.pm__sheet-cancel,
.pm__sheet-confirm {
  flex: 1;
  height: 42px;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
  border: none;
}
.pm__sheet-cancel {
  background: var(--bg);
  color: var(--text-sub);
}
.pm__sheet-confirm {
  background: var(--brand);
  color: #fff;
}
.pm__sheet-confirm:disabled {
  opacity: 0.6;
}

/* toast */
.toast {
  position: fixed;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  padding: 9px 18px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 99;
  max-width: 80%;
  text-align: center;
  pointer-events: none;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
