<template>
  <div class="points">
    <!-- 顶部导航 -->
    <div class="nav">
      <span class="nav__back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="nav__title">我的积分</span>
      <span class="nav__rule" @click="onRules">积分规则</span>
    </div>

    <!-- 积分余额 -->
    <div class="balance">
      <div class="balance__num">{{ balance }}</div>
      <div class="balance__label">当前积分</div>
    </div>

    <!-- 玩转积分 Banner -->
    <div class="banner" @click="onBanner">
      <div class="banner__text">
        <div class="banner__title">玩转积分</div>
        <div class="banner__sub">积分获取及使用攻略</div>
        <button class="banner__btn">立即查看</button>
      </div>
      <div class="banner__img">
        <svg viewBox="0 0 120 120" width="90" height="90">
          <defs>
          <linearGradient id="coin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7DA2FF"/>
            <stop offset="100%" stop-color="#4D7CFF"/>
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="44" fill="url(#coin)" opacity="0.95"/>
        <text x="60" y="72" text-anchor="middle" font-size="38" font-weight="700" fill="#fff">P</text>
        </svg>
      </div>
    </div>

    <!-- 积分精选好物 -->
    <div class="section">
      <div class="section__hd">
        <span class="section__title">积分精选好物</span>
        <span class="section__more" @click="onMore">
          更多
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      </div>
      <div class="goods">
        <div
          v-for="p in pointsProducts"
          :key="p.id"
          class="goods__item"
          @click="onProduct(p)"
        >
          <img class="goods__img" :src="p.cover" :alt="p.name" />
          <div class="goods__info">
            <div class="goods__name">{{ p.name }}</div>
            <div class="goods__tags">
              <span v-for="(tag, i) in p.tags" :key="i" class="goods__tag">{{ tag }}</span>
            </div>
            <div class="goods__price">
              <span class="goods__amount">¥{{ p.price }}</span>
              <span class="goods__pts">或 {{ p.points }} 积分</span>
            </div>
          </div>
          <button class="goods__btn" @click.stop="onExchange(p)">兑换</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { pointsBalance, pointsProducts } from '../data/mock'
import { bridge } from '../bridge'

const router = useRouter()

function onRules() {
  bridge.openNative('points/rules')
}
function onBanner() {
  bridge.openNative('points/guide')
}
function onMore() {
  bridge.openNative('points/mall')
}
function onProduct(p) {
  bridge.openNative('product/' + p.id)
}
function onExchange(p) {
  bridge.openNative('points/exchange?id=' + p.id)
}
</script>

<style scoped>
.points {
  min-height: 100vh;
  background: var(--bg);
  padding-top: calc(44px + env(safe-area-inset-top));
  padding-bottom: 16px;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  max-width: 480px;
  margin: 0 auto;
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  padding-left: 12px;
  padding-right: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}
.nav__back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.nav__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.nav__rule {
  font-size: 13px;
  color: var(--text-sub);
  padding: 4px 6px;
}

.balance {
  padding: 32px 16px 24px;
  text-align: center;
  background: var(--card);
}
.balance__num {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--text);
}
.balance__label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-hint);
}

.banner {
  margin: 16px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  box-shadow: 0 8px 20px rgba(77, 124, 255, 0.18);
}
.banner__title {
  font-size: 20px;
  font-weight: 700;
}
.banner__sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
}
.banner__btn {
  margin-top: 14px;
  padding: 7px 16px;
  border-radius: var(--radius-pill);
  background: #fff;
  color: var(--brand);
  font-size: 13px;
  font-weight: 600;
}
.banner__img {
  width: 90px;
  height: 90px;
  flex: none;
}

.section {
  margin-top: 12px;
  padding: 0 16px;
}
.section__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.section__more {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: var(--text-hint);
}

.goods__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}
.goods__img {
  width: 72px;
  height: 72px;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
  background: var(--bg);
}
.goods__info {
  flex: 1;
  min-width: 0;
}
.goods__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods__tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.goods__tag {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
}
.goods__price {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.goods__amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--price);
}
.goods__pts {
  font-size: 12px;
  color: var(--text-hint);
}
.goods__btn {
  flex: none;
  padding: 7px 14px;
  border-radius: var(--radius);
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}
</style>
