<template>
  <div class="rmask" @click.self="$emit('close')">
    <div class="rm">
      <!-- 表单态 -->
      <div v-if="step === 'form'" class="rm__body">
        <div class="rm__hd">
          <span class="rm__title">{{ t('points.redeem.title') }}</span>
          <span class="rm__close" @click="$emit('close')">✕</span>
        </div>

        <div class="rm__prod">
          <img class="rm__img" :src="product.cover" :alt="product.name" @error="onImgErr" />
          <div class="rm__info">
            <div class="rm__name">{{ product.name }}</div>
            <div class="rm__tags">
              <span v-for="(tag, i) in product.tags" :key="i" class="rm__tag">{{ tag }}</span>
            </div>
            <div class="rm__cost">{{ t('points.redeem.cost') }}：<b>{{ product.points }}</b> {{ t('points.balanceLabel') }}</div>
          </div>
        </div>

        <div class="rm__balance" :class="{ 'is-low': myPoints < product.points }">
          {{ t('points.redeem.myPoints') }}：<b>{{ myPoints }}</b>
          <span v-if="myPoints < product.points" class="rm__low">{{ t('points.redeem.insufficient') }}</span>
        </div>

        <!-- 收货信息（实物兑换需填写） -->
        <div class="rm__ship">
          <div class="rm__ship-hd">{{ t('points.redeem.shipping') }}</div>
          <input class="rm__input" v-model.trim="form.name" :placeholder="t('points.redeem.namePh')" />
          <input class="rm__input" v-model.trim="form.phone" :placeholder="t('points.redeem.phonePh')" />
          <textarea class="rm__input rm__area" v-model.trim="form.address" :placeholder="t('points.redeem.addressPh')" rows="2"></textarea>
        </div>

        <div class="rm__actions">
          <button class="rm__btn rm__btn--ghost" @click="$emit('close')">{{ t('points.redeem.cancel') }}</button>
          <button class="rm__btn rm__btn--primary" :disabled="myPoints < product.points || submitting" @click="confirm">
            {{ submitting ? '…' : t('points.redeem.confirm') }}
          </button>
        </div>
        <div v-if="errMsg" class="rm__err">{{ errMsg }}</div>
      </div>

      <!-- 成功态 -->
      <div v-else class="rm__body rm__success">
        <div class="rm__ok">✓</div>
        <div class="rm__ok-title">{{ t('points.redeem.success') }}</div>
        <div class="rm__ok-tip">{{ t('points.redeem.successTip') }}</div>
        <div class="rm__actions rm__actions--center">
          <button class="rm__btn rm__btn--ghost" @click="$emit('close')">{{ t('points.redeem.done') }}</button>
          <button class="rm__btn rm__btn--primary" @click="$emit('viewRecords')">{{ t('points.redeem.viewRecords') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { t } from '../i18n'
import { doRedeem, fetchGrowthProfile } from '../api/growth'

const props = defineProps({
  product: { type: Object, required: true },
})
const emit = defineEmits(['close', 'done', 'viewRecords'])

const step = ref('form')
const submitting = ref(false)
const errMsg = ref('')
const myPoints = ref(0)
const form = reactive({ name: '', phone: '', address: '' })
const FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23eef1f6"/%3E%3C/svg%3E'

onMounted(async () => {
  try {
    const p = await fetchGrowthProfile()
    myPoints.value = p.balance || 0
  } catch (e) {
    myPoints.value = 0
  }
})

function onImgErr(e) {
  if (e && e.target && e.target.src !== FALLBACK) e.target.src = FALLBACK
}

async function confirm() {
  if (submitting.value) return
  submitting.value = true
  errMsg.value = ''
  try {
    const r = await doRedeem({
      productId: props.product.id,
      shippingName: form.name,
      shippingPhone: form.phone,
      shippingAddress: form.address,
    })
    myPoints.value = r.balance
    step.value = 'success'
    emit('done', r)
  } catch (e) {
    errMsg.value = e.message || t('points.redeem.fail')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.rmask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.rm {
  width: 100%;
  max-width: 360px;
  background: var(--card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}
.rm__body {
  padding: 18px;
}
.rm__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.rm__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}
.rm__close {
  font-size: 16px;
  color: var(--text-hint);
  padding: 2px 6px;
}
.rm__prod {
  display: flex;
  gap: 12px;
}
.rm__img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
  background: var(--bg);
}
.rm__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}
.rm__tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rm__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
}
.rm__cost {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-sub);
}
.rm__cost b {
  color: var(--price);
  font-size: 15px;
}
.rm__balance {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--radius);
  background: var(--bg);
  font-size: 14px;
  color: var(--text-sub);
}
.rm__balance b {
  color: var(--text);
  font-size: 16px;
}
.rm__balance.is-low b {
  color: #e5484d;
}
.rm__low {
  margin-left: 8px;
  color: #e5484d;
  font-size: 12px;
}
.rm__ship {
  margin-top: 14px;
}
.rm__ship-hd {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 8px;
}
.rm__input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--border, #e5e8ef);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
}
.rm__area {
  resize: none;
}
.rm__actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.rm__actions--center {
  justify-content: center;
}
.rm__btn {
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}
.rm__btn--ghost {
  background: var(--bg);
  color: var(--text-sub);
}
.rm__btn--primary {
  background: var(--brand);
  color: #fff;
}
.rm__btn--primary:disabled {
  background: var(--brand-soft);
  color: var(--brand);
  opacity: 0.8;
}
.rm__err {
  margin-top: 10px;
  font-size: 13px;
  color: #e5484d;
  text-align: center;
}
.rm__success {
  text-align: center;
  padding: 30px 18px 22px;
}
.rm__ok {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 30px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rm__ok-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.rm__ok-tip {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-hint);
}
</style>
