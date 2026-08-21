<template>
  <div class="discover">
    <!-- 顶部：三 tab + 操作 -->
    <TopBar sticky :show-back="false">
      <template #left>
        <div class="tabs">
          <span
            v-for="t in tabs"
            :key="t"
            class="tab tab-bounce"
            :class="{ active: activeTab === t }"
            @click="setTab(t)"
            >{{ tabLabel(t) }}</span
          >
        </div>
      </template>
      <template #right>
        <div class="topacts">
          <span class="act act--add float-in press" @click="onAdd">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </span>
          <span class="act act--bell press" @click="onNotice">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span v-if="interactionUnread > 0" class="bell-badge badge-pulse"></span>
          </span>
        </div>
      </template>
    </TopBar>

    <!-- 地区切换：CN/BR/US，切换后推荐/动态/广场活动全部按地区重拉；US 为全球公共池，三区均可见 -->
    <div class="regionbar">
      <span
        v-for="r in regionOptions"
        :key="r.code"
        class="region-pill"
        :class="{ on: currentRegion === r.code }"
        @click="switchRegion(r.code)"
        >{{ r.label }}</span
      >
      <span class="region-hint">{{ regionHint }}</span>
    </div>

    <!-- 搜索：推荐/广场显示 -->
    <div v-if="activeTab !== '动态'" class="search" @click="onSearch">
      <span class="sicon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input class="sinput" v-model="keyword" :placeholder="t('discover.searchPlaceholder')" @keyup.enter="onSearch" @click.stop />
    </div>

    <!-- Banner + 快捷入口：仅推荐页 -->
    <template v-if="activeTab === '推荐'">
      <div class="banner" @click="onBanner">
        <img
          class="banner__img"
          :src="bannerImg"
          alt="Banner"
        />
      </div>
      <div class="quick">
        <div
        v-for="(q, i) in discoverQuick"
        :key="q.key"
        class="quick__item fade-up press"
        :class="'stagger-' + ((i % 10) + 1)"
        @click="onQuick(q)"
      >
          <span v-if="q.key === 'notice' && noticeUnread > 0" class="q-badge"></span>
          <IconSvg class="quick__icon" :name="q.icon" :size="22" />
          <div class="quick__label">{{ t('discover.quick.' + q.key) }}</div>
        </div>
      </div>
    </template>

    <!-- 车型筛选：仅推荐/动态显示（推荐=全部、动态=最新；广场无筛选条，与设计稿一致） -->
    <div v-if="activeTab !== '广场'" class="filter">
      <div class="chips">
        <span
          v-for="f in currentFilters"
          :key="f"
          class="chip chip-bounce"
          :class="{ active: activeFilter === f }"
          @click="activeFilter = f"
          >{{ filterLabel(f) }}</span
        >
      </div>
      <span class="sort" @click="onSort">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m11 12 4 4 4-4"/><path d="M15 20V4"/></svg>
      </span>
    </div>

    <!-- 推荐：双列网格 -->
    <div v-if="activeTab === '推荐'" class="content">
      <div class="grid2">
        <FeedCard
          v-for="(it, i) in recommendList"
          :key="it.id"
          :item="it"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </div>

    <!-- 动态：独立 UGC 流（单列卡片） -->
    <div v-else-if="activeTab === '动态'" class="content">
      <MomentCard
        v-for="(it, i) in dynamicList"
        :key="it.id"
        :item="it"
        :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
      />
      <div v-if="dynamicList.length === 0" class="empty-tab">{{ t('discover.emptyDynamic') }}</div>
    </div>

    <!-- 广场：车型展示 + 热门活动 -->
    <div v-else-if="activeTab === '广场'" class="content">
      <div class="grid3">
        <div
          v-for="(p, i) in plazaShowcase"
          :key="p.id"
          class="showcase fade-up press"
          :class="'stagger-' + ((i % 10) + 1)"
          @click="onShowcase(p)"
        >
          <img class="showcase__img" :src="p.cover" :alt="p.name" />
          <div class="showcase__bar">{{ p.name }}</div>
        </div>
      </div>
      <div class="section-head">
        <span class="section-title">{{ t('discover.hotActivities') }}</span>
        <span class="section-more" @click="onMoreActivity">{{ t('discover.more') }} &gt;</span>
      </div>
      <div class="acts">
        <div
          v-for="(a, i) in actList"
          :key="a.id"
          class="activity fade-up press"
          :class="'stagger-' + ((i % 10) + 1)"
          @click="onActivity(a)"
        >
          <img class="act__img" :src="a.cover" :alt="a.title" />
          <div class="act__info">
            <div class="act__title">{{ a.title }}</div>
            <div class="act__date">{{ fmtDate(a) }}</div>
          </div>
          <button class="act__btn">{{ t('discover.viewNow') }}</button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FeedCard from '../components/FeedCard.vue'
import MomentCard from '../components/MomentCard.vue'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'
import {
  discoverTabs,
  discoverQuick,
  plazaFilters,
  plazaShowcase,
  notices,
} from '../data/mock'
import { clearNewMoment } from '../store/ui'
import { publishState } from '../store/publish'
import bridge from '../bridge'
import { t, initLocale, setLocale } from '../i18n'
import { fetchUnreadCount } from '../api/notifications'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const router = useRouter()
const bannerList = ref([])
const bannerImg = computed(
  () => (bannerList.value[0] && bannerList.value[0].image) || import.meta.env.BASE_URL + 'discover-banner.jpg'
)
const bannerUrl = computed(() => (bannerList.value[0] && bannerList.value[0].url) || '')
const tabs = discoverTabs
const activeTab = ref('推荐')
const activeFilter = ref('全部')

// ---- 地区（PRD 硬限定：CN / BR / US，3 国互不交叉）----
const regionOptions = [
  { code: 'US', label: t('discover.region.global') },
  { code: 'CN', label: t('discover.region.cn') },
  { code: 'BR', label: t('discover.region.br') },
]
const currentRegion = ref('CN')
const regionHint = ref('')

// tab 中文逻辑值 → i18n 展示
const TAB_KEY = { 推荐: 'recommend', 动态: 'dynamic', 广场: 'plaza' }
function tabLabel(tab) {
  return t('discover.tabs.' + (TAB_KEY[tab] || tab))
}
// 筛选 chip 中文逻辑值 → i18n 展示（'全部'/'最新' 翻译，车型名原样）
function filterLabel(f) {
  if (f === '全部') return t('discover.filter.all')
  if (f === '最新') return t('discover.filter.newest')
  return f
}

// 真实数据源（从 /feed 接口拉取）
const recommendData = ref([])
const dynamicData = ref([])
// 广场热门活动（从 /activities 接口拉取，随地区切换）
const actList = ref([])
const loading = ref(false)
const loadErr = ref('')

// 车型筛选 chip：从接口数据动态提取（推荐=全部+有车型的帖子去重；动态=最新+同）
const currentFilters = computed(() => {
  const list = activeTab.value === '推荐' ? recommendData.value : dynamicData.value
  const cars = [...new Set(list.map((i) => i.carModel).filter(Boolean))]
  if (activeTab.value === '推荐') return ['全部', ...cars]
  return ['最新', ...cars]
})

// 置顶优先：pinned 的帖子排到列表最前，其余保持原顺序
function sortPinned(list) {
  return [...list].sort((a, b) => Number(b.pinned ? 1 : 0) - Number(a.pinned ? 1 : 0))
}
// 推荐：按车型筛选 + 置顶优先
const recommendList = computed(() => {
  const f = activeFilter.value
  const list = f === '全部' ? recommendData.value : recommendData.value.filter((i) => i.carModel === f)
  return sortPinned(list)
})
// 动态：按车型筛选，最新=全部 + 置顶优先
const dynamicList = computed(() => {
  const f = activeFilter.value
  const list = f === '最新' ? dynamicData.value : dynamicData.value.filter((i) => i.carModel === f)
  return sortPinned(list)
})

// 官方公告未读数（驱动发现页快捷区红点）
const noticeUnread = computed(() => notices.filter((n) => !n.isRead).length)

// 互动消息未读（真实后端计数，驱动铃铛红点）
const interactionUnread = ref(0)

function setTab(t) {
  activeTab.value = t
  activeFilter.value = t === '推荐' ? '全部' : '最新'
  if (t === '动态') clearNewMoment() // 进入动态 tab，清除动态红点
}

// 从 /feed 接口拉取真实数据（带地区过滤）
async function loadFeed(tab) {
  try {
    const url = `${API_BASE}/feed?tab=${tab}&pageSize=30&region=${currentRegion.value}`
    const r = await fetch(url)
    const j = await r.json()
    if (j.code === 0 && j.data) {
      if (tab === 'recommend') recommendData.value = j.data.list || []
      else dynamicData.value = j.data.list || []
    }
  } catch (e) {
    loadErr.value = t('discover.loadFail')
  }
}

// 广场热门活动（随地区切换）
async function loadActivities() {
  try {
    const url = `${API_BASE}/activities?region=${currentRegion.value}`
    const r = await fetch(url)
    const j = await r.json()
    if (j.code === 0 && j.data) actList.value = j.data.list || []
  } catch (e) {
    actList.value = []
  }
}

// 活动日期展示：优先 startDate，取 MM-DD；无则空
function fmtDate(a) {
  const s = a.startDate || a.start_date || ''
  const m = String(s).match(/^\d{4}-(\d{2})-(\d{2})/)
  return m ? m[1] + '-' + m[2] : (a.date || '')
}

// 切地区：重拉推荐/动态/活动（广场车型 showcase 待 ToC 车型 API 按 region 返回）
// 地区 → 语言联动：CN=中文、BR=葡语、US=英文（US 为全球公共池，三区均可见；CN/BR 仅本区内容）
// 真机 Flutter getLocale 注入后，onMounted 的 initLocale 优先，手动切地区时联动覆盖
const REGION_LOCALE = { US: 'en', CN: 'zh', BR: 'pt' }
async function switchRegion(code) {
  // 始终先按地区对齐语言（纠正“直接点已选项不切语言”的错位）
  setLocale(REGION_LOCALE[code] || 'en')
  if (currentRegion.value === code) return // 已选中则不重拉数据
  currentRegion.value = code
  regionHint.value = ''
  await Promise.all([loadFeed('recommend'), loadFeed('dynamic'), loadActivities()])
}

// 发现页 banner：拉运营后台配置的 banner（status=on），点击跳 banner.url
async function fetchBanners() {
  try {
    const r = await fetch(`${API_BASE}/banners`)
    const j = await r.json()
    if (j.code === 0) {
      const list = (j.data && j.data.list) || j.data || []
      bannerList.value = Array.isArray(list) ? list : []
    }
  } catch (e) { /* 拉取失败保持静态兜底图 */ }
}
function onBanner() {
  const u = bannerUrl.value
  if (!u) return
  if (/^https?:\/\//i.test(u)) bridge.openShopify(u)
  else if (u.startsWith('/')) router.push(u)
  else bridge.openNative(u)
}

// 发布后自动切到「动态」tab 展示新内容
onMounted(async () => {
  await initLocale() // 先按系统语言初始化
  try {
    const reg = await bridge.getRegion()
    if (reg && ['CN', 'BR', 'US'].includes(String(reg).toUpperCase())) {
      currentRegion.value = String(reg).toUpperCase()
    }
  } catch (e) { /* getRegion 失败则用兜底默认地区 */ }
  // 强制按当前地区对齐语言：无论 getRegion 是否成功，语言都与当前 region 一致（兜底默认 CN=中文）
  setLocale(REGION_LOCALE[currentRegion.value] || 'en')
  loading.value = true
  await Promise.all([loadFeed('recommend'), loadFeed('dynamic'), loadActivities(), fetchBanners()])
  loading.value = false
  if (publishState.pendingTab) {
    setTab(publishState.pendingTab)
    publishState.pendingTab = null
  }
  // 拉取互动消息未读数（铃铛红点）
  interactionUnread.value = await fetchUnreadCount()
})

function onAdd() {
  // 原生环境：拉起原生发布器（契约 openNative('discover/publish')）
  if (bridge.isNative()) {
    bridge.openNative('discover/publish')
    return
  }
  // H5 预览：跳转 H5 发布页，保证可真实发布
  router.push('/publish')
}
function onNotice() { router.push('/interactions') }
function onQuick(q) {
  if (q.key === 'notice') { router.push('/notices'); return }
  // 决策 2：立即定制归口购车定制页（原生承载）
  if (q.key === 'custom') { bridge.openNative('purchase/customize'); return }
  if (q.key === 'points') { router.push('/points'); return }
  console.log('quick tap:', q.key)
}
function onSort() { console.log('sort tap') }
function onShowcase(p) {
  // 决策 8：车型卡跳购车车型页（原生承载）
  bridge.openNative('vehicle/' + p.id)
}
function onMoreActivity() { router.push('/activity-center') }
function onActivity(a) { router.push('/activity/' + a.id) }

const keyword = ref('')
function onSearch() {
  // 搜索（决策相关）：原生承载；H5 兜底跳 /search 并带 q
  bridge.openNative('search?q=' + encodeURIComponent(keyword.value.trim()))
}

const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}
</script>

<style scoped>
.discover {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: env(safe-area-inset-bottom);
}
.tabs {
  display: flex;
  align-items: center;
  gap: 16px;
}
.tab {
  font-size: 16px;
  color: var(--text-sub);
  font-weight: 400;
  line-height: 1.2;
  transform-origin: bottom center;
  transform: scale(0.96);
}
.tab.active {
  color: #000000;
  font-weight: 700;
}
.topacts {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #000000;
}
.act {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
}
.act--add {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.act--bell {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.bell-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--price);
  z-index: 2;
}
.act--add { transform-origin: center; }
.regionbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  margin-top: 4px;
}
.region-pill {
  font-size: 12px;
  color: var(--text-sub);
  background: #F0F1F3;
  border-radius: 12px;
  padding: 4px 12px;
  line-height: 1.4;
  transition: all 0.15s ease;
}
.region-pill.on {
  color: #fff;
  background: var(--brand);
  font-weight: 600;
}
.region-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-hint);
}
.search {
  margin: 10px 16px 0;
  height: 40px;
  background: #F0F1F3;
  border: none;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
}
.sicon {
  color: var(--text-hint);
  display: flex;
  align-items: center;
}
.sinput {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  background: transparent;
}
.sinput::placeholder {
  color: var(--text-hint);
}
.banner {
  margin: 16px 14px 0;
  border-radius: var(--radius);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.banner__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 14px 14px 24px;
}
.quick__item {
  position: relative;
  height: 72px;
  background: #ffffff;
  border: 1px solid #E0E0E0;
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 4px;
}
.quick__icon {
  width: 20px;
  height: 20px;
  color: var(--text);
}
.quick__label {
  font-size: 14px;
  line-height: 1;
  color: var(--text);
}
.q-badge {
  position: absolute;
  top: 8px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--price);
}
.filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 12px 0;
  gap: 8px;
}
.chips {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 2px 0;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.3;
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: 20px;
  background: #F5F5F7;
  transition: all 0.2s ease;
  font-weight: 500;
}
.chip.active {
  color: #fff;
  background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  font-weight: 600;
}
.sort {
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: #F5F5F7;
  transition: all 0.2s ease;
}
.content {
  margin-top: 16px;
  padding-bottom: 16px;
}
.empty-tab {
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
  padding: 40px 0;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px;
}
.grid3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 12px;
}
.showcase {
  background: #ffffff;
  border-radius: var(--radius);
  overflow: hidden;
}
.showcase__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.showcase__bar {
  background: #1a1a1a;
  color: #ffffff;
  font-size: 12px;
  text-align: center;
  padding: 7px 0;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 12px 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.section-more {
  font-size: 13px;
  color: var(--text-hint);
}
.acts {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.activity {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.act__img {
  width: 120px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  object-fit: cover;
  flex: none;
}
.act__info {
  flex: 1;
  min-width: 0;
}
.act__title {
  font-size: 14px;
  color: var(--text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.act__date {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 6px;
}
.act__btn {
  flex: none;
  background: #2F2F2F;
  color: #ffffff;
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 12px;
}
.toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: var(--radius);
  z-index: 100;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>