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
      <input class="sinput" v-model="keyword" :placeholder="t('discover.searchPlaceholder')" @keyup.enter="onSearchEnter" @compositionstart="isComposing = true" @compositionend="onCompositionEnd" @click.stop />
    </div>

    <!-- 搜索结果（内联过滤，不跳页） -->
    <div v-if="showSearchResults" class="search-results">
      <div class="search-results__head">「{{ keyword }}」{{ searchResults.length }} 个结果</div>
      <div v-if="searchResults.length === 0" class="search-results__empty">{{ t('search.empty', { q: keyword }) }}</div>
      <FeedCard
        v-for="it in searchResults"
        :key="'sr-' + it.id"
        :item="it"
        class="fade-up"
      />
      <button class="search-results__clear press" @click="showSearchResults = false; keyword = ''">{{ t('search.clear') || '清除' }}</button>
    </div>

    <!-- Banner 轮播 + 快捷入口：仅推荐页 + 非搜索态 -->
    <template v-if="activeTab === '推荐' && !showSearchResults">
      <div
        class="banner"
        @touchstart="onBannerTouchStart"
        @touchend="onBannerTouchEnd"
        @click="onBanner"
      >
        <div class="banner__track" :style="{ transform: `translateX(-${bannerIdx * 100}%)` }">
          <div v-for="(b, i) in bannerSlides" :key="i" class="banner__slide">
            <video
              v-if="b.type === 'video'"
              ref="heroVideoRef"
              class="banner__media"
              :src="b.src"
              :poster="b.poster"
              muted
              loop
              playsinline
              preload="none"
              @error="onVideoError"
              @ended="nextBanner"
            ></video>
            <img v-else class="banner__media" :src="b.src" :alt="b.title || 'Banner'" loading="lazy" />
          </div>
        </div>
        <div v-if="bannerSlides.length > 1" class="banner__dots">
          <span
            v-for="(b, i) in bannerSlides"
            :key="i"
            class="banner__dot"
            :class="{ on: bannerIdx === i }"
            @click.stop="bannerIdx = i"
          ></span>
        </div>
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

    <!-- 车型筛选：仅推荐/动态显示（推荐=全部、动态=最新；广场无筛选条，与设计稿一致）+ 非搜索态 -->
    <div v-if="activeTab !== '广场' && !showSearchResults" class="filter">
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
      <span class="sort" :class="{ on: sortMode === 'hot' }" @click="onSort">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m11 12 4 4 4-4"/><path d="M15 20V4"/></svg>
      </span>
    </div>

    <!-- 推荐：双列网格 -->
    <div v-if="activeTab === '推荐' && !showSearchResults" class="content">
      <div class="grid2">
        <FeedCard
          v-for="(it, i) in recommendList"
          :key="it.id"
          :item="it"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
      <div v-if="currentFeedKey && recommendList.length" class="load-more">
        <span v-if="loadingMore">{{ t('discover.loadingMore') }}</span>
        <span v-else-if="!feedPage[currentFeedKey].hasMore">{{ t('discover.noMore') }}</span>
      </div>
    </div>

    <!-- 动态：独立 UGC 流（单列卡片）+ 关注/附近 子栏 + 非搜索态 -->
    <template v-else-if="activeTab === '动态' && !showSearchResults">
      <div class="subtabs">
        <span class="subtab" :class="{ active: dynamicSubtab === 'follow' }" @click="setDynamicSub('follow')">{{ t('discover.subFollow') }}</span>
        <span class="subtab" :class="{ active: dynamicSubtab === 'near' }" @click="setDynamicSub('near')">{{ t('discover.subNear') }}</span>
      </div>
      <div class="content">
        <MomentCard
          v-for="(it, i) in dynamicList"
          :key="it.id"
          :item="it"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
        <div v-if="nearLoading" class="empty-tab">{{ t('discover.nearLoading') }}</div>
        <div v-else-if="dynamicList.length === 0" class="empty-tab">{{ t('discover.emptyDynamic') }}</div>
        <div v-if="currentFeedKey && dynamicList.length" class="load-more">
          <span v-if="loadingMore">{{ t('discover.loadingMore') }}</span>
          <span v-else-if="!feedPage[currentFeedKey].hasMore">{{ t('discover.noMore') }}</span>
        </div>
      </div>
    </template>

    <!-- 广场：车型展示 + 热门活动 + 非搜索态 -->
    <div v-else-if="activeTab === '广场' && !showSearchResults" class="content">
      <div class="grid3">
        <div
          v-for="(p, i) in plazaShowcase"
          :key="p.id"
          class="showcase fade-up press"
          :class="'stagger-' + ((i % 10) + 1)"
          @click="onShowcase(p)"
        >
          <img class="showcase__img" :src="p.cover" :alt="p.name" loading="lazy" />
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
          <img class="act__img" :src="a.cover" :alt="a.title" loading="lazy" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { fetchFeeds, fetchActivities } from '../api/feed'

const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'

const router = useRouter()
// Banner 轮播：视频 + 实拍 + 不同车型渲染图混排，后端运营 banner 追加
const LOCAL_BANNERS = [
  { type: 'video', src: import.meta.env.BASE_URL + 'banner/banner-hero.mp4', poster: import.meta.env.BASE_URL + 'banner/banner-hero-poster.jpg', title: 'PXID 实拍', url: '/featured' },
  { type: 'image', src: import.meta.env.BASE_URL + 'banner/banner-shot1.jpg', title: 'PXID 户外实拍', url: '/featured' },
  { type: 'image', src: import.meta.env.BASE_URL + 'banner/banner-trike.jpg', title: 'PXID 电动三轮车', url: '/featured' },
]
const bannerList = ref([])
const bannerSlides = computed(() => {
  const ops = bannerList.value.map((b) => ({ type: 'image', src: b.image, title: b.title || '', url: b.url || '' }))
  return [...LOCAL_BANNERS, ...ops]
})
const bannerIdx = ref(0)
let bannerTimer = null
let bannerTouchX = 0
const heroVideoRef = ref(null)
let videoPlayTimer = null

function nextBanner() {
  if (bannerSlides.value.length < 2) return
  bannerIdx.value = (bannerIdx.value + 1) % bannerSlides.value.length
}
// 视频懒加载：preload=none 不占首屏带宽，图片先出；延迟 1.2s 再播视频
function lazyPlayHeroVideo() {
  const v = heroVideoRef.value
  if (!v) return
  videoPlayTimer = setTimeout(() => {
    const p = v.play()
    if (p && p.catch) p.catch(() => { /* iOS 等自动播被拦：停留在 poster，用户滑动后仍可播 */ })
  }, 1200)
}
// 视频加载/播放失败：直接切下一张，不卡住轮播
function onVideoError() {
  nextBanner()
}
function onBannerTouchStart(e) {
  bannerTouchX = e.changedTouches[0].clientX
}
function onBannerTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - bannerTouchX
  if (Math.abs(dx) > 40) (dx < 0 ? nextBanner() : (bannerIdx.value = (bannerIdx.value - 1 + bannerSlides.value.length) % bannerSlides.value.length))
}
const tabs = discoverTabs
const activeTab = ref('推荐')
const activeFilter = ref('全部')
const sortMode = ref('latest')

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
// 动态「附近」子栏：LBS 坐标流 + 加载态
const dynamicSubtab = ref('follow')
const nearList = ref([])
const nearLoading = ref(false)
// 广场热门活动（从 /activities 接口拉取，随地区切换）
const actList = ref([])
const loading = ref(false)
const loadErr = ref('')

// 车型筛选 chip：从接口数据动态提取（推荐=全部+有车型的帖子去重；动态=最新+同），过滤掉含汉字的标签
const currentFilters = computed(() => {
  const list = activeTab.value === '推荐' ? recommendData.value : dynamicData.value
  const cars = [...new Set(list.map((i) => i.carModel).filter(Boolean).filter((c) => !/[\u4e00-\u9fff]/.test(c)))]
  if (activeTab.value === '推荐') return ['全部', ...cars]
  return ['最新', ...cars]
})

// 置顶优先 + 排序（最新/最热）：pinned 始终在前，组内按模式排序
function tsOf(i) {
  const v = i.createdAt || i.created_at || 0
  if (!v) return 0
  const t = new Date(v).getTime()
  return isNaN(t) ? 0 : t
}
function rankList(list) {
  return [...list].sort((a, b) => {
    const pa = Number(a.pinned ? 1 : 0)
    const pb = Number(b.pinned ? 1 : 0)
    if (pa !== pb) return pb - pa
    if (sortMode.value === 'hot') return (Number(b.likes) || 0) - (Number(a.likes) || 0)
    return tsOf(b) - tsOf(a)
  })
}
// 推荐：按车型筛选 + 置顶优先 + 排序
const recommendList = computed(() => {
  const f = activeFilter.value
  const list = f === '全部' ? recommendData.value : recommendData.value.filter((i) => i.carModel === f)
  return rankList(list)
})
// 动态：按车型筛选，最新=全部 + 置顶优先 + 排序；附近子栏用 nearList
const dynamicList = computed(() => {
  const src = dynamicSubtab.value === 'near' ? nearList.value : dynamicData.value
  const f = activeFilter.value
  const list = f === '最新' || f === '全部' ? src : src.filter((i) => i.carModel === f)
  return rankList(list)
})

// 官方公告未读数（驱动发现页快捷区红点）
const noticeUnread = computed(() => notices.filter((n) => !n.isRead).length)

// 当前 tab 的 feed 分页 key（触底加载提示用）
const currentFeedKey = computed(() =>
  activeTab.value === '推荐' ? 'recommend' : activeTab.value === '动态' ? 'dynamic' : ''
)

// 互动消息未读（真实后端计数，驱动铃铛红点）
const interactionUnread = ref(0)

function setTab(t) {
  activeTab.value = t
  activeFilter.value = t === '推荐' ? '全部' : '最新'
  if (t === '动态') clearNewMoment() // 进入动态 tab，清除动态红点
}

// 触底分页状态（推荐/动态各自维护 page + hasMore；广场活动量小不分页）
const PAGE_SIZE = 15
const feedPage = {
  recommend: { page: 1, hasMore: true },
  dynamic: { page: 1, hasMore: true },
}
const loadingMore = ref(false)

// 从 /feed 接口拉取真实数据（带地区过滤 + 分页）。改用统一数据层 api/feed.js：
// 动态 tab 自动带 followerDevice → 后端返回「官方+已关注」关注流（修 H1 关注流非全局流）；
// 归一化/错误回落统一，消除 api/feed.js 死代码（修 H2）
// ⚠️ 调用方（onMounted / switchRegion）统一传英文 key（'recommend'/'dynamic'），
//    内部必须按 key 比对，勿用中文——曾因 'recommend' !== '推荐' 导致
//    推荐数据被塞进 dynamicData、recommendData 永远为空、For You 页永久空白（2026-08-22 修复）
// append=false 拉第一页（重置 page/hasMore）；append=true 触底追加下一页
async function loadFeed(tabKey, { append = false } = {}) {
  const st = feedPage[tabKey]
  if (!st || st.hasMore === false || (append && loadingMore.value)) return
  if (append) loadingMore.value = true
  try {
    const page = append ? st.page + 1 : 1
    const res = await fetchFeeds(tabKey, {
      region: currentRegion.value,
      page,
      pageSize: PAGE_SIZE,
    })
    const list = res.list || []
    st.page = page
    st.hasMore = list.length >= PAGE_SIZE && (page * PAGE_SIZE) < (res.total || Infinity)
    if (append) {
      if (tabKey === 'recommend') recommendData.value = recommendData.value.concat(list)
      else dynamicData.value = dynamicData.value.concat(list)
    } else {
      if (tabKey === 'recommend') recommendData.value = list
      else dynamicData.value = list
    }
  } catch (e) {
    loadErr.value = t('discover.loadFail')
  } finally {
    if (append) loadingMore.value = false
  }
}

// 滚动触底加载：距底部 300px 时拉当前 tab 的下一页（推荐/动态；广场活动量小不触发）
function onScroll() {
  const doc = document.documentElement
  if (doc.scrollHeight - window.scrollY - window.innerHeight < 300) {
    const key = activeTab.value === '推荐' ? 'recommend' : activeTab.value === '动态' ? 'dynamic' : ''
    if (key) loadFeed(key, { append: true })
  }
}

// 广场热门活动（随地区切换，走统一数据层）
async function loadActivities() {
  try {
    actList.value = await fetchActivities({ region: currentRegion.value })
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
  // 切地区后「附近」子栏数据失效，重置回关注流避免显示旧区坐标流
  if (dynamicSubtab.value === 'near') {
    dynamicSubtab.value = 'follow'
    nearList.value = []
  }
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
  const b = bannerSlides.value[bannerIdx.value]
  if (!b || !b.url) return
  const u = b.url
  if (/^https?:\/\//i.test(u)) { bridge.openShopify(u); return }
  // 内部路由：原生环境走 openNative 让 Flutter 切 tab（解决"点了精选但 tab 还在发现"）
  if (u.startsWith('/')) {
    if (bridge.isNative()) {
      // 截取路径名作为原生路由指令（如 /featured → featured）
      bridge.openNative(u.slice(1))
    } else {
      router.push(u)
    }
    return
  }
  bridge.openNative(u)
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
  // Banner 轮播自动播放：统一 4s/张，视频 slide 也定时切走（不再等 @ended，避免视频 loop 卡在第一张）
  bannerTimer = setInterval(() => {
    if (bannerSlides.value.length > 1) nextBanner()
  }, 4000)
  // 视频懒加载：首屏图片先渲染，视频延迟播放
  lazyPlayHeroVideo()
  // 触底分页：滚动加载更多（推荐/动态）
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null }
  window.removeEventListener('scroll', onScroll)
  if (videoPlayTimer) { clearTimeout(videoPlayTimer); videoPlayTimer = null }
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
  // 决策 2：立即定制 → 跳转 H5 车型定制页（鸿蒙智行风格，VehicleDetailView）
  if (q.key === 'custom') { router.push('/vehicle/scooter-F2'); return }
  if (q.key === 'points') { router.push('/points'); return }
}
// 取本机坐标：优先原生桥（Flutter 注入），降级浏览器 geolocation
async function getLocation() {
  try {
    const loc = await bridge.getLocation()
    if (loc && loc.lat != null && loc.lng != null) return loc
  } catch (e) {}
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000 }
    )
  })
}

// 动态子栏切换：关注（默认关注流）/ 附近（LBS 距离流）
async function setDynamicSub(sub) {
  if (dynamicSubtab.value === sub) return
  dynamicSubtab.value = sub
  if (sub === 'near') {
    nearLoading.value = true
    const loc = await getLocation()
    if (!loc) {
      nearLoading.value = false
      showToast(t('discover.nearFail'))
      dynamicSubtab.value = 'follow'
      return
    }
    try {
      const res = await fetchFeeds('dynamic', {
        near: loc.lat + ',' + loc.lng,
        radius: 50,
        followerDevice: '',
        region: currentRegion.value,
        pageSize: 30,
      })
      nearList.value = res.list || []
    } catch (e) {
      nearList.value = []
    }
    nearLoading.value = false
  }
}

function onSort() {
  sortMode.value = sortMode.value === 'latest' ? 'hot' : 'latest'
  showToast(sortMode.value === 'hot' ? t('discover.sort.hot') : t('discover.sort.latest'))
}
function onShowcase(p) {
  // 车型卡跳 H5 车型详情页（Flutter 端未实现 vehicle 原生路由，走 H5 兜底）
  router.push('/vehicle/' + p.id)
}
function onMoreActivity() { router.push('/activity-center') }
function onActivity(a) { router.push('/activity/' + a.id) }

const keyword = ref('')
const isComposing = ref(false)
function onSearchEnter() {
  if (isComposing.value) return // IME 组合中不触发搜索
  onSearch()
}
function onCompositionEnd(e) {
  isComposing.value = false
}
// 搜索：内联过滤当前 tab 已加载数据（不走二级页，不调原生）
const showSearchResults = ref(false)
const searchResults = computed(() => {
  const k = (keyword.value || '').trim().toLowerCase()
  if (!k || !showSearchResults.value) return []
  const src = activeTab.value === '推荐' ? recommendData.value : dynamicList.value
  return src.filter((it) => {
    const t = (it.title || '').toLowerCase()
    const c = (it.content || '').toLowerCase()
    const a = (it.author || '').toLowerCase()
    return t.includes(k) || c.includes(k) || a.includes(k)
  })
})
function onSearch() {
  const k = keyword.value.trim()
  if (!k) { showSearchResults.value = false; return }
  showSearchResults.value = true
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
  background: #F5F5F7;
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  line-height: 1.4;
  transition: all 0.15s ease;
}
.region-pill.on {
  color: #fff;
  background: var(--brand);
  font-weight: 600;
  font-size: 13px;
  padding: 6px 14px;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(77,124,255,.25);
}
.region-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-hint);
}
.search {
  margin: 10px 16px 0;
  height: 40px;
  background: #F5F5F7;
  border: none;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.04);
}
/* 搜索结果（内联） */
.search-results {
  padding: 8px 12px 16px;
}
.search-results__head {
  font-size: 13px;
  color: var(--text-hint);
  padding: 4px 4px 12px;
}
.search-results__empty {
  text-align: center;
  color: var(--text-hint);
  font-size: 14px;
  padding: 40px 0;
}
.search-results__clear {
  display: block;
  margin: 16px auto 0;
  background: none;
  border: 1px solid var(--line);
  color: var(--text-sub);
  font-size: 13px;
  padding: 8px 24px;
  border-radius: var(--radius-pill);
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
  position: relative;
  margin: 16px 14px 0;
  border-radius: var(--radius-xl);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  touch-action: pan-y;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .08);
}
.banner__track {
  display: flex;
  height: 100%;
  transition: transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.banner__slide {
  flex: 0 0 100%;
  min-width: 100%;
  height: 100%;
}
.banner__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.banner__dots {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  z-index: 2;
}
.banner__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  transition: all 0.3s;
}
.banner__dot.on {
  width: 16px;
  border-radius: 3px;
  background: #ffffff;
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
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 4px;
  transition: transform .15s ease, box-shadow .15s ease;
}
.quick__item:active { transform: scale(.96); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
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
  margin: 12px 12px 0;
  gap: 8px;
}
.chips {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px 2px;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.3;
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: #F5F5F7;
  transition: all 0.15s ease;
  font-weight: 500;
  flex-shrink: 0;
}
.chip.active {
  color: #fff;
  background: var(--brand, #4A6CF7);
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(77,124,255,.25);
}
.sort {
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: var(--radius-pill);
  background: #F5F5F7;
  transition: all 0.15s ease;
  box-shadow: inset 0 1px 2px rgba(0,0,0,.04);
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
.load-more {
  text-align: center;
  font-size: 12px;
  color: var(--text-hint);
  padding: 20px 0 8px;
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
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
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
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
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
  background: var(--brand-gradient, linear-gradient(135deg, #4D7CFF, #6C4DFF));
  color: #ffffff;
  border-radius: var(--radius-pill);
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(77,124,255,.25);
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
.subtabs {
  display: flex;
  gap: 8px;
  padding: 10px 12px 0;
}
.subtab {
  font-size: 13px;
  color: var(--text-sub);
  background: #F5F5F7;
  border-radius: 16px;
  padding: 6px 14px;
  font-weight: 500;
  transition: all 0.15s ease;
}
.subtab.active {
  color: #fff;
  background: var(--brand);
  box-shadow: 0 2px 8px rgba(77,124,255,.25);
  font-weight: 600;
  line-height: 1;
}
.subtab:active { transform: scale(0.96); }
</style>