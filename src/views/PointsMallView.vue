<template>
  <div class="pm">
    <TopBar :title="t('points.mallTitle')" />
    <div class="pm__tip">{{ t('points.mallTip') }}</div>
    <div class="pm__list">
      <div v-for="p in goods" :key="p.id" class="pm__item" @click="onProduct(p)">
        <img class="pm__img" :src="p.cover" :alt="p.name" />
        <div class="pm__info">
          <div class="pm__name">{{ p.name }}</div>
          <div class="pm__tags">
            <span v-for="(tag, i) in p.tags" :key="i" class="pm__tag">{{ tag }}</span>
          </div>
          <div class="pm__price">
            <span class="pm__amount">¥{{ p.price }}</span>
            <span class="pm__pts">{{ t('points.orPoints', { n: p.points }) }}</span>
          </div>
        </div>
        <button class="pm__btn" @click.stop="onExchange(p)">{{ t('points.exchange') }}</button>
      </div>
    </div>
    <div class="pm__empty" v-if="!goods.length">{{ t('points.mallEmpty') }}</div>
  </div>
</template>

<script setup>
import TopBar from '../components/TopBar.vue'
import { t } from '../i18n'
import { bridge } from '../bridge'
import { pointsProducts } from '../data/mock'

const goods = pointsProducts

function onProduct(p) {
  // 购买：真机走原生打开 Shopify 商品页；预览环境由 bridge 兜底
  bridge.openShopify(p.shopUrl)
}

function onExchange(p) {
  // 兑换：真机走原生积分兑换页（Flutter 契约 points/exchange?id=）；
  // 预览环境 bridge 兜底映射到商城页，避免点击无反应
  bridge.openNative('points/exchange?id=' + p.id)
}
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
.pm__empty {
  padding: 40px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
}
</style>
