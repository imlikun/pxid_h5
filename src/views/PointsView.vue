<template>
  <div class="points">
    <!-- 顶部导航 -->
    <TopBar :title="t('points.title')">
      <template #right>
        <span class="nav__rule" @click="onRules">{{ t('points.rules') }}</span>
      </template>
    </TopBar>

    <!-- 用户等级卡 -->
    <div class="levelcard">
      <div class="levelcard__badge">{{ levelIcon }}</div>
      <div class="levelcard__info">
        <div class="levelcard__name">{{ groupName }}</div>
        <div class="levelcard__sub">{{ t('points.signin.continuous', { n: profile.continuousDays }) }}</div>
      </div>
      <div class="levelcard__demo" v-if="profile.isDemo">{{ t('points.demoTip') }}</div>
    </div>

    <!-- 签到模块 -->
    <div class="signin">
      <div class="signin__head">
        <span class="signin__month">{{ t('points.signin.month') }}</span>
        <span class="signin__streak">🔥 {{ t('points.signin.continuous', { n: profile.continuousDays }) }}</span>
      </div>
      <div class="calendar">
        <span
          v-for="d in monthDays"
          :key="d"
          class="calendar__cell"
          :class="{ 'is-on': monthSigned(d) }"
        >{{ d }}</span>
      </div>
      <button
        class="signin__btn"
        :class="{ 'is-done': profile.signedToday }"
        :disabled="profile.signedToday"
        @click="onSignin"
      >
        {{ profile.signedToday ? (t('points.signin.todayDone') + (lastGain ? ' +' + lastGain : '')) : t('points.signin.tapToSign') }}
      </button>
    </div>

    <!-- 积分余额 -->
    <div class="balance">
      <div class="balance__num">{{ profile.balance }}</div>
      <div class="balance__label">{{ t('points.balanceLabel') }}</div>
    </div>

    <!-- 玩转积分 Banner -->
    <div class="banner" @click="onBanner">
      <div class="banner__text">
        <div class="banner__title">{{ t('points.bannerTitle') }}</div>
        <div class="banner__sub">{{ t('points.bannerSub') }}</div>
        <button class="banner__btn">{{ t('points.bannerBtn') }}</button>
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

    <!-- 勋章墙 -->
    <div class="section">
      <div class="section__hd">
        <span class="section__title">{{ t('points.medals.title') }} · {{ t('points.medals.earned', { n: earnedCount }) }}</span>
      </div>
      <div class="medals">
        <div v-for="m in medals" :key="m.code" class="medal" :class="{ 'is-off': !m.owned }">
          <div class="medal__icon">{{ m.icon }}</div>
          <div class="medal__name">{{ m.name[locale] }}</div>
        </div>
      </div>
      <div v-if="earnedCount === 0" class="medals__empty">{{ t('points.medals.empty') }}</div>
    </div>

    <!-- 积分精选好物 -->
    <div class="section">
      <div class="section__hd">
        <span class="section__title">{{ t('points.featuredTitle') }}</span>
        <span class="section__more" @click="onMore">
          {{ t('points.more') }}
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
              <span class="goods__pts">{{ t('points.orPoints', { n: p.points }) }}</span>
            </div>
          </div>
          <button class="goods__btn" @click.stop="onExchange(p)">{{ t('points.exchange') }}</button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { bridge } from '../bridge'
import { t, locale } from '../i18n'
import { fetchGrowthProfile, doSignin, fetchMedals } from '../api/growth'
import { pointsProducts } from '../data/mock'
import TopBar from '../components/TopBar.vue'

const router = useRouter()

const profile = ref({ balance: 0, continuousDays: 0, signedToday: false, isDemo: false, level: {}, levelIndex: 0, groups: [], medals: [], monthSigns: [] })
const medals = ref([])
const lastGain = ref(0)
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

const groupName = computed(() => {
  const lv = profile.value.level || {}
  return lv[locale.value] || lv.zh || ''
})
const earnedCount = computed(() => medals.value.filter((m) => m.owned).length)
const levelIcon = computed(() => {
  const idx = profile.value.levelIndex ?? 0
  return ['🥉', '🥈', '🥇', '💎', '👑'][idx] || '🥉'
})
const monthDays = computed(() => {
  const d = new Date()
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => i + 1)
})
function monthSigned(day) {
  const dd = String(day).padStart(2, '0')
  return (profile.value.monthSigns || []).includes(dd)
}

async function load() {
  try {
    const [p, m] = await Promise.all([fetchGrowthProfile(), fetchMedals()])
    profile.value = p
    medals.value = m.list
  } catch (e) {
    // 兜底：接口不可用（如浏览器裸跑无 token）时给 0 分空态，不报错
    profile.value = { balance: 0, continuousDays: 0, signedToday: false, isDemo: false, level: { zh: '新晋骑手', en: 'Rookie Rider', pt: 'Iniciante' }, levelIndex: 0, groups: [], medals: [], monthSigns: [] }
    medals.value = []
  }
}
async function onSignin() {
  if (profile.value.signedToday) return
  // 签到不强制前置登录（同点赞/收藏策略，2026-08-26）：匿名/未登录也能按 deviceId 维度签到攒积分，
  // 后端 /growth/signin requireAuth 已兼容匿名 token；真机登录用户走登录 token 正常签。
  try {
    const r = await doSignin()
    lastGain.value = r.todayPoints || 0
    const today = String(new Date().getDate()).padStart(2, '0')
    profile.value = {
      ...profile.value,
      signedToday: true,
      continuousDays: r.continuousDays,
      balance: r.balance,
      isDemo: false,
      monthSigns: [...(profile.value.monthSigns || []), today],
    }
    showToast(t('points.signin.getToday', { n: r.todayPoints || 0 }))
  } catch (e) {
    // 透传后端真实错误（如"未授权：需要登录后操作"→ 明确是登录态/token 问题，而非网络/接口故障）
    showToast((e && e.message) || t('points.signin.fail'))
  }
}

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
  bridge.openShopify(p.shopUrl)
}
function onExchange(p) {
  bridge.openNative('points/exchange?id=' + p.id)
}

onMounted(load)
</script>

<style scoped>
.points {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 16px;
}

.nav__rule {
  font-size: 13px;
  color: var(--text-sub);
  padding: 4px 6px;
}

/* 用户等级卡 */
.levelcard {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 16px 0;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--brand-gradient);
  color: #fff;
  box-shadow: 0 8px 20px rgba(77, 124, 255, 0.18);
}
.levelcard__badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex: none;
}
.levelcard__info {
  flex: 1;
  min-width: 0;
}
.levelcard__name {
  font-size: 18px;
  font-weight: 700;
}
.levelcard__sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.9;
}
.levelcard__demo {
  font-size: 10px;
  opacity: 0.85;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 8px;
  border-radius: 10px;
  max-width: 96px;
  line-height: 1.3;
}

/* 签到模块 */
.signin {
  margin: 12px 16px 0;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--card);
}
.signin__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.signin__month {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.signin__streak {
  font-size: 13px;
  color: var(--text-sub);
}
.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}
.calendar__cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-hint);
  border-radius: 8px;
  background: var(--bg);
}
.calendar__cell.is-on {
  background: var(--brand);
  color: #fff;
  font-weight: 700;
}
.signin__btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius);
  background: var(--brand);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.signin__btn.is-done {
  background: var(--brand-soft);
  color: var(--brand);
}

/* 积分余额 */
.balance {
  padding: 32px 16px 24px;
  text-align: center;
  background: var(--card);
  margin-top: 12px;
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

/* 玩转积分 Banner */
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

/* 勋章墙 */
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
.medals {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.medal {
  padding: 14px 8px;
  border-radius: var(--radius-lg);
  background: var(--card);
  text-align: center;
}
.medal.is-off {
  opacity: 0.45;
  filter: grayscale(1);
}
.medal__icon {
  font-size: 30px;
}
.medal__name {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-sub);
}
.medals__empty {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-hint);
  text-align: center;
}

/* 积分精选好物 */
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
