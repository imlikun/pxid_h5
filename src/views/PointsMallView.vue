<template>
  <div class="mall">
    <TopBar :title="t('points.mall.title')">
      <template #right>
        <span class="nav__records" @click="goRecords">{{ t('points.records') }}</span>
      </template>
    </TopBar>

    <div class="mall__balance">
      <span class="mall__balance-num">{{ profileBalance }}</span>
      <span class="mall__balance-label">{{ t('points.balanceLabel') }}</span>
    </div>

    <div v-if="loading" class="mall__state">{{ t('featured.loading') }}</div>
    <div v-else-if="!list.length" class="mall__state">{{ t('featured.loadFail') }}</div>

    <div v-else class="mall__grid">
      <div v-for="p in list" :key="p.id" class="card">
        <img class="card__img" :src="p.cover" :alt="p.name" loading="lazy" @error="onImgErr" />
        <div class="card__body">
          <div class="card__name">{{ p.name }}</div>
          <div class="card__tags">
            <span v-for="(tag, i) in p.tags" :key="i" class="card__tag">{{ tag }}</span>
          </div>
          <div class="card__price">
            <span class="card__amount">¥{{ p.price }}</span>
            <span class="card__pts">{{ p.points }} {{ t('points.balanceLabel') }}</span>
          </div>
          <div class="card__row">
            <button class="card__btn card__btn--ghost" @click="openShop(p)">{{ t('points.orPointsShort') }}</button>
            <button class="card__btn card__btn--primary" @click="onExchange(p)">{{ t('points.exchange') }}</button>
          </div>
        </div>
      </div>
    </div>

    <RedeemModal
      v-if="redeemProduct"
      :product="redeemProduct"
      @close="redeemProduct = null"
      @done="onRedeemed"
      @viewRecords="goRecords"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { t } from '../i18n'
import { bridge } from '../bridge'
import { fetchPointsProducts, fetchGrowthProfile } from '../api/growth'
import TopBar from '../components/TopBar.vue'
import RedeemModal from '../components/RedeemModal.vue'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const profileBalance = ref(0)
const redeemProduct = ref(null)
const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23eef1f6"/%3E%3C/svg%3E'

function onImgErr(e) {
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}
function goRecords() {
  redeemProduct.value = null
  router.push('/points/exchanges')
}
function openShop(p) {
  if (p.shopUrl) bridge.openShopify(p.shopUrl)
}
function onExchange(p) {
  redeemProduct.value = p
}
function onRedeemed() {
  load()
}

async function load() {
  loading.value = true
  try {
    const [r, p] = await Promise.all([fetchPointsProducts(), fetchGrowthProfile().catch(() => null)])
    list.value = r.list || []
    if (p) profileBalance.value = p.balance
  } catch (e) {
    list.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.mall {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 16px;
}
.nav__records {
  font-size: 13px;
  color: var(--brand);
  padding: 4px 6px;
}
.mall__balance {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 12px 16px 4px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--brand-gradient);
  color: #fff;
  box-shadow: 0 8px 20px rgba(77, 124, 255, 0.18);
}
.mall__balance-num {
  font-size: 28px;
  font-weight: 700;
}
.mall__balance-label {
  font-size: 13px;
  opacity: 0.9;
}
.mall__state {
  padding: 40px 16px;
  text-align: center;
  color: var(--text-hint);
  font-size: 14px;
}
.mall__grid {
  padding: 12px 16px 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.card {
  background: var(--card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card__img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: var(--bg);
}
.card__body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}
.card__tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.card__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
}
.card__price {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.card__amount {
  font-size: 15px;
  font-weight: 700;
  color: var(--price);
}
.card__pts {
  font-size: 12px;
  color: var(--text-hint);
}
.card__row {
  margin-top: auto;
  padding-top: 12px;
  display: flex;
  gap: 8px;
}
.card__btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: var(--radius);
  font-size: 13px;
  font-weight: 600;
}
.card__btn--ghost {
  background: var(--bg);
  color: var(--brand);
}
.card__btn--primary {
  background: var(--brand);
  color: #fff;
}
</style>
