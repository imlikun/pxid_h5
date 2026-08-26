<template>
  <div class="guide">
    <TopBar :title="t('points.guide.title')" />

    <!-- 介绍 -->
    <div class="hero">
      <div class="hero__icon">P</div>
      <div class="hero__title">{{ t('points.guide.title') }}</div>
      <div class="hero__sub">{{ t('points.guide.intro') }}</div>
    </div>

    <!-- 怎么赚积分 -->
    <section class="block">
      <h3 class="block__title">{{ t('points.guide.earn') }}</h3>
      <ul class="list">
        <li class="item" @click="goSignin">
          <span class="item__ico">📅</span>
          <div class="item__body">
            <div class="item__name">{{ t('points.guide.earnSigninTitle') }}</div>
            <div class="item__desc">{{ t('points.guide.earnSignin') }}</div>
          </div>
          <span class="item__go">›</span>
        </li>
        <li class="item">
          <span class="item__ico">🛒</span>
          <div class="item__body">
            <div class="item__name">{{ t('points.guide.earnShopTitle') }}</div>
            <div class="item__desc">{{ t('points.guide.earnShop') }}</div>
          </div>
        </li>
        <li class="item">
          <span class="item__ico">💬</span>
          <div class="item__body">
            <div class="item__name">{{ t('points.guide.earnInteractTitle') }}</div>
            <div class="item__desc">{{ t('points.guide.earnInteract') }}</div>
          </div>
        </li>
        <li class="item">
          <span class="item__ico">🏅</span>
          <div class="item__body">
            <div class="item__name">{{ t('points.guide.earnTaskTitle') }}</div>
            <div class="item__desc">{{ t('points.guide.earnTask') }}</div>
          </div>
        </li>
      </ul>
    </section>

    <!-- 怎么花积分 -->
    <section class="block">
      <h3 class="block__title">{{ t('points.guide.spend') }}</h3>
      <div class="spend" @click="goMall">
        <div class="spend__text">
          <div class="spend__name">{{ t('points.guide.spendMall') }}</div>
          <div class="spend__desc">{{ t('points.guide.spendTip') }}</div>
        </div>
        <span class="spend__btn">{{ t('points.guide.goMall') }} ›</span>
      </div>
    </section>

    <!-- 等级与权益 -->
    <section class="block">
      <h3 class="block__title">{{ t('points.guide.level') }}</h3>
      <p class="tip">{{ t('points.guide.levelTip') }}</p>
    </section>

    <!-- 勋章墙 -->
    <section class="block">
      <h3 class="block__title">{{ t('points.guide.medal') }}</h3>
      <p class="tip">{{ t('points.guide.medalTip') }}</p>
    </section>

    <!-- 底部入口 -->
    <div class="actions">
      <button class="actions__btn actions__btn--ghost" @click="goRecords">{{ t('points.guide.goRecords') }}</button>
      <button class="actions__btn actions__btn--primary" @click="goMall">{{ t('points.guide.goMall') }}</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
function goMall() {
  router.push('/points/mall')
}
function goRecords() {
  router.push('/points/exchanges')
}
function goSignin() {
  router.push('/points')
}
</script>

<style scoped>
.guide {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 24px;
}

/* 介绍卡 */
.hero {
  margin: 12px 16px 0;
  padding: 24px 20px;
  border-radius: var(--radius-lg);
  background: var(--brand-gradient);
  color: #fff;
  text-align: center;
  box-shadow: 0 8px 20px rgba(77, 124, 255, 0.18);
}
.hero__icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}
.hero__title {
  font-size: 20px;
  font-weight: 700;
}
.hero__sub {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  opacity: 0.92;
}

/* 区块 */
.block {
  margin: 16px 16px 0;
}
.block__title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

/* 怎么赚：列表 */
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: var(--card);
  border-radius: var(--radius-lg);
  margin-bottom: 10px;
}
.item__ico {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 12px;
  background: var(--brand-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.item__body {
  flex: 1;
  min-width: 0;
}
.item__name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}
.item__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-hint);
}
.item__go {
  flex: none;
  font-size: 20px;
  color: var(--text-hint);
}

/* 怎么花：卡片 */
.spend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--card);
  border: 1px solid var(--brand-soft);
}
.spend__text {
  flex: 1;
  min-width: 0;
}
.spend__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand);
}
.spend__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-hint);
}
.spend__btn {
  flex: none;
  padding: 8px 14px;
  border-radius: var(--radius);
  background: var(--brand);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

/* 说明段 */
.tip {
  margin: 0;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--card);
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-sub);
}

/* 底部入口 */
.actions {
  display: flex;
  gap: 12px;
  margin: 24px 16px 0;
}
.actions__btn {
  flex: 1;
  padding: 13px;
  border: none;
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 600;
}
.actions__btn--primary {
  background: var(--brand);
  color: #fff;
}
.actions__btn--ghost {
  background: var(--brand-soft);
  color: var(--brand);
}
</style>
