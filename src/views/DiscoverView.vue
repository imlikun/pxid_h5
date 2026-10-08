<template>
  <div
    class="discover"
    :class="{ 'locale-zh': locale === 'zh', 'locale-en': locale === 'en', 'locale-pt': locale === 'pt', split: isSplit }"
    @touchstart.passive="onPtrStart"
    @touchmove.passive="onPtrMove"
    @touchend.passive="onPtrEnd"
  >
    <!-- 两栏容器：≥600px 分栏态 .leftcol(左：Tab/搜索/banner/瀑布流错落，独立滚动) + .panel(右：详情)；
         <600px 手机态 .cols 塌成单栏、.panel 不渲染，与现状一致。 -->
    <div class="cols"><div class="leftcol" ref="leftcolRef" @scroll="onLeftcolScroll">
    <!-- 下拉刷新指示器：从详情返回不再自动重拉列表（避免返回时闪一下），
         这里保留一个手动刷新入口 -->
    <div class="ptr" :style="{ height: (ptrBusy ? 44 : ptrDist) + 'px' }">
      <span v-if="ptrDist > 0 || ptrBusy" class="ptr__dot" :class="{ 'ptr__dot--spin': ptrBusy }"></span>
    </div>

    <!-- 顶部：三 tab + 操作 -->
    <TopBar sticky :show-back="false">
      <template #left>
        <div class="tabs" role="tablist" :aria-label="t('discover.sections')">
          <button type="button" role="tab"
            v-for="t in tabs"
            :key="t"
            class="tab" :aria-selected="activeTab === t"
            :class="{ active: activeTab === t }"
            @click="setTab(t)"
            >{{ tabLabel(t) }}</button
          >
        </div>
      </template>
      <template #right>
        <div class="topacts">
          <button type="button" :aria-label="t('discover.search')" :aria-expanded="searchOpen" class="act act--search press" :class="{ 'act--on': searchOpen }" @click="toggleSearch">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7.5"/><path d="m20.35 20.35-4.35-4.35"/></svg>
          </button>
          <button type="button" :aria-label="t('discover.publish')" class="act act--add press" @click="onAdd">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
        </div>
      </template>
    </TopBar>

    <!-- 搜索：右上角按钮触发，滑出内联搜索条（三 tab 通用） -->
    <transition name="searchslide">
      <div v-if="searchOpen" class="search" @click="onSearch">
        <span class="sicon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
        <input ref="searchInputRef" class="sinput" v-model="keyword" :placeholder="t('discover.searchPlaceholder')" @keyup.enter="onSearchEnter" @compositionstart="isComposing = true" @compositionend="onCompositionEnd" @click.stop />
        <button v-if="keyword" type="button" class="sclose press" :aria-label="t('search.clear')" @click.stop="clearSearch">✕</button>
      </div>
    </transition>

    <!-- 搜索结果（内联过滤，不跳页） -->
    <div v-if="showSearchResults" class="search-results">
      <div class="search-results__head">「{{ keyword }}」{{ searchResults.length }} 个结果</div>
      <div v-if="searchResults.length === 0" class="search-results__empty">{{ t('search.empty', { q: keyword }) }}</div>
      <FeedCard
        v-for="it in searchResults"
        :key="'sr-' + it.id"
        :item="it" appearance="discover"
        :class="fadeUp()"
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
            <img v-else class="banner__media" :src="b.src" :alt="b.title || 'Banner'"  :loading="i === 0 ? 'eager' : 'lazy'" />
            <div v-if="i < LOCAL_BANNERS.length" class="banner__copy">
              <h2>{{ t('discover.heroTitle') }}</h2>
              <p>{{ t('discover.heroSubtitle') }}</p>
            </div>
          </div>
        </div>
        <div v-if="bannerSlides.length > 1" class="banner__dots">
          <button type="button" :aria-label="t('discover.slide', { n: i + 1 })" :aria-current="bannerIdx === i ? 'true' : undefined"
            v-for="(b, i) in bannerSlides"
            :key="i"
            class="banner__dot"
            :class="{ on: bannerIdx === i }"
            @click.stop="bannerIdx = i"
          ></button>
        </div>
      </div>
      <div class="quick">
        <button type="button"
        v-for="(q, i) in discoverQuick"
        :key="q.key"
        class="quick__item press"

        @click="onQuick(q)"
      >
          <div class="quick__thumb" :class="'quick__thumb--' + q.key">
            <span v-if="q.key === 'notice' && noticeUnread > 0" class="q-badge"></span>
            <img v-if="QUICK_IMAGES[q.key]" class="quick__icon" :src="QUICK_IMAGES[q.key].small" :srcset="`${QUICK_IMAGES[q.key].small} 2x, ${QUICK_IMAGES[q.key].large} 3x`" alt="" width="54" height="54" decoding="async" />
            <IconSvg v-else class="quick__icon" :name="q.icon" :size="22" />
          </div>
          <div class="quick__label">
            <span class="quick__label__text">{{ t('discover.quick.' + q.key) }}</span>
          </div>
        </button>
      </div>
    </template>

    <!-- 动态沿用原发布入口，用骑行与用车场景说明参与价值。 -->
    <div v-if="activeTab === '动态' && !showSearchResults" class="dynamic-intro">
      <div class="dynamic-intro__copy">
        <p class="dynamic-intro__title">{{ t('discover.dynamic.title') }}</p>
        <p class="dynamic-intro__hint">{{ t('discover.dynamic.hint') }}</p>
      </div>
      <button type="button" class="dynamic-intro__publish press" @click="onAdd">{{ t('discover.dynamic.share') }}</button>
    </div>

    <!-- 车型筛选：动态页右侧固定范围菜单，车型仍在左侧横向滚动 -->
    <div v-if="activeTab !== '广场' && !showSearchResults" class="filter">
      <div class="chips">
        <button type="button" :aria-pressed="activeFilter === f.value"
          v-for="f in currentFilters"
          :key="f.value"
          class="chip"
          :class="{ active: activeFilter === f.value, mine: f.mine }"
          @click="pickFilter(f.value)"
          >{{ f.label }}</button
        >
      </div>
      <div v-if="activeTab === '动态'" ref="scopeMenuRef" class="scope">
        <button type="button" class="scope__trigger" aria-haspopup="listbox" :aria-expanded="scopeMenuOpen" aria-controls="dynamic-scope-menu" @click="scopeMenuOpen = !scopeMenuOpen">
          {{ scopeTriggerLabel }}<svg viewBox="0 0 12 12" aria-hidden="true" :class="{ 'scope__chevron--open': scopeMenuOpen }"><path d="m2.5 4.5 3.5 3 3.5-3" /></svg>
        </button>
        <div v-if="scopeMenuOpen" id="dynamic-scope-menu" class="scope__menu" role="listbox" :aria-label="t('discover.scope.label')">
          <button v-for="option in scopeOptions" :key="option.value" type="button" class="scope__option" role="option" :aria-selected="dynamicScope === option.value" @click="setDynamicScope(option.value)">
            <span>{{ option.label }}</span><span v-if="dynamicScope === option.value" class="scope__check" aria-hidden="true">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 推荐：瀑布流（两列错落，热门话题卡穿插在流内） -->
    <div v-if="activeTab === '推荐' && !showSearchResults" class="content">
      <div class="wf2">
        <div class="wf-col">
          <template v-for="(x, i) in wfColA" :key="x.__key || x.id">
            <DiscoverTopicCard v-if="x.__topic" :name="x.__topic.name" :count="x.__topic.n" :active="!!x.__active"
              :emoji="topicEmoji(x.__topic.name)" :category="topicCat(x.__topic.name)" :style="topicCardStyle(x.__topic)"
              @click="pickTopic(x.__topic.name)" />
            <FeedCard v-else appearance="discover" :featured="featuredIds.has(x.id)" :item="x" :class="[fadeUp(), staggerFor(i)]" :on-select="isSplit ? selectDetail : null" />
          </template>
        </div>
        <div class="wf-col">
          <template v-for="(x, i) in wfColB" :key="x.__key || x.id">
            <DiscoverTopicCard v-if="x.__topic" :name="x.__topic.name" :count="x.__topic.n" :active="!!x.__active"
              :emoji="topicEmoji(x.__topic.name)" :category="topicCat(x.__topic.name)" :style="topicCardStyle(x.__topic)"
              @click="pickTopic(x.__topic.name)" />
            <FeedCard v-else appearance="discover" :featured="featuredIds.has(x.id)" :item="x" :class="[fadeUp(), staggerFor(i)]" :on-select="isSplit ? selectDetail : null" />
          </template>
        </div>
      </div>
      <!-- 空态：此前筛选无结果/无数据时整片空白，容易被误认为「帖子不显示」 -->
      <div v-if="!recommendList.length && !loading" class="empty-tab">
        {{ recommendEmptyText }}
        <span
          v-if="activeFilter !== '全部'"
          class="empty-tab__reset press"
          @click="pickFilter('全部')"
        >{{ t('discover.clearFilter') }}</span>
      </div>
      <FeedLoadState v-if="currentFeedKey && recommendList.length" :loading="loadingMore[currentFeedKey]" :finished="!feedPage[currentFeedKey].hasMore" />
    </div>

    <!-- 动态：独立 UGC 流（单列卡片） -->
    <template v-if="activeTab === '动态' && !showSearchResults">
      <div class="content">
        <MomentCard
          v-for="(it, i) in dynamicList"
          :key="it.id"
          :item="it"
          :class="[fadeUp(), staggerFor(i)]"
        />
        <div v-if="(nearLoading || dynamicLoading) && dynamicList.length === 0" class="empty-tab">{{ nearLoading ? t('discover.nearLoading') : t('discover.loadingMore') }}</div>
        <div v-else-if="dynamicList.length === 0" class="empty-tab dynamic-empty" role="status">
          <p class="dynamic-empty__title">{{ dynamicEmptyText }}</p>
          <p class="dynamic-empty__hint">{{ dynamicError ? t('discover.dynamic.errorHint') : dynamicEmptyHint }}</p>
          <div class="dynamic-empty__actions">
            <button v-if="dynamicError" type="button" class="dynamic-empty__action press" @click="reloadDynamicFeed">{{ t('discover.dynamic.retry') }}</button>
            <button v-if="hasDynamicFilter" type="button" class="dynamic-empty__action press" @click="clearDynamicFilters">{{ t('discover.dynamic.viewAll') }}</button>
            <button v-if="!dynamicError" type="button" class="dynamic-empty__action press" @click="onAdd">{{ t('discover.dynamic.share') }}</button>
          </div>
        </div>
        <FeedLoadState v-if="currentFeedKey && dynamicList.length" :loading="loadingMore[currentFeedKey]" :finished="!feedPage[currentFeedKey].hasMore" />
      </div>
    </template>

    <!-- 广场：车型展示 + 热门活动 + 非搜索态 -->
    <div v-else-if="activeTab === '广场' && !showSearchResults" class="content plaza-content">
      <div class="grid3">
        <button type="button"
          v-for="(p, i) in plazaShowcase"
          :key="p.id"
          class="showcase press"
          :class="[fadeUp(), 'stagger-' + (i + 1)]"
          @click="onShowcase(p)"
        >
          <img class="showcase__img" :src="p.cover" :alt="p.name" loading="lazy" />
          <div class="showcase__bar">{{ p.name }}</div>
        </button>
      </div>
      <div class="section-head">
        <span class="section-title">{{ t('discover.hotActivities') }}</span>
        <button type="button" class="section-more" @click="onMoreActivity">{{ t('discover.more') }} <span aria-hidden="true">›</span></button>
      </div>
      <div class="acts">
        <div
          v-for="(a, i) in actList"
          :key="a.id"
          class="activity press"
          :class="[fadeUp(), 'stagger-' + (i + 1)]"
          @click="onActivity(a)"
        >
          <img class="act__img" :src="a.cover" :alt="a.title" loading="lazy" />
          <div class="act__info">
            <div class="act__title">{{ a.title }}</div>
            <div v-if="fmtDate(a)" class="act__date"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16"/></svg>{{ fmtDate(a) }}</div>
          </div>
          <button type="button" class="act__btn" @click.stop="onActivity(a)"><span>{{ t('discover.viewNow') }}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>
        </div>
      </div>
    </div>
    </div><!-- /leftcol -->

    <!-- 折叠屏右栏详情面板：分栏态（≥600px）下作为 .cols 直接子节点与 .leftcol 左右并排。
         仅推荐 tab + 分栏态渲染；点左栏卡片切换、▲▼连翻、默认置顶条。手机态不渲染。 -->
    <div v-if="activeTab === '推荐' && !showSearchResults && isSplit" class="panel">
      <div class="panel__nav">
        <span class="panel__tag" v-if="selectedFeed && selectedFeed.pinned">置顶推荐</span>
        <button class="panel__navbtn" @click="stepDetail(-1)" :disabled="!recommendList.length">▲ 上一条</button>
        <button class="panel__navbtn" @click="stepDetail(1)" :disabled="!recommendList.length">▼ 下一条</button>
      </div>
      <div v-if="detailLoading || !detailItem" class="panel__loading">
        <span v-if="!selectedFeed">选一条动态看看</span>
        <span v-else>加载详情中…</span>
      </div>
      <template v-else>
        <!-- 视频：置顶全宽 -->
        <div v-if="detailItem.videoUrl" class="panel__hero">
          <video class="panel__hero-video" :src="detailItem.videoUrl" controls playsinline preload="metadata"></video>
        </div>
        <!-- 单图：置顶全宽大图 -->
        <div v-else-if="detailItem.images && detailItem.images.length === 1" class="panel__hero">
          <img class="panel__img" :src="detailItem.images[0]" :alt="detailItem.title || ''" />
        </div>
        <!-- 5+ 图：置顶全宽横向轮播 + 1/N 分页 + 圆点 -->
        <div v-else-if="detailItem.images && detailItem.images.length >= 5" class="panel__hero panel__carousel">
          <div class="panel__car-track" ref="panelCarTrack" @scroll.passive="onPanelCarScroll">
            <img
              v-for="(img, i) in detailItem.images"
              :key="i"
              class="panel__car-slide"
              :src="img"
              :alt="detailItem.title || ''"
            />
          </div>
          <div class="panel__car-count">{{ panelCarIndex + 1 }}/{{ detailItem.images.length }}</div>
          <div class="panel__car-dots">
            <span
              v-for="(img, i) in detailItem.images"
              :key="'d' + i"
              class="panel__car-dot"
              :class="{ on: i === panelCarIndex }"
            ></span>
          </div>
        </div>

        <div class="panel__body">
          <div class="panel__title">{{ detailItem.title || (detailItem.content || '').slice(0, 30) }}</div>
          <div class="panel__author">
            <img v-if="detailItem.avatar" :src="detailItem.avatar" :alt="detailItem.author" />
            <div class="panel__authinfo">
              <span>{{ detailItem.author }}</span>
              <em>{{ detailItem.kind === 'official' ? '官方' : '车主' }}</em>
            </div>
          </div>
          <div class="panel__text">{{ detailItem.content }}</div>
          <!-- 2-4 张：不置顶，随正文流双列网格 -->
          <div v-if="detailItem.images && detailItem.images.length >= 2 && detailItem.images.length <= 4" class="panel__grid">
            <img
              v-for="(img, i) in detailItem.images"
              :key="i"
              class="panel__grid-img"
              :src="img"
              :alt="detailItem.title || ''"
            />
          </div>
          <div class="panel__stat">
            <span><b>{{ detailItem.likes }}</b> 赞</span>
            <span>{{ detailItem.comments || 0 }} 评论</span>
          </div>
        </div>
        <div v-if="detailComments.length" class="panel__cmt">
          <h4>评论</h4>
          <div v-for="cm in detailComments" :key="cm.id" class="panel__cmtitem">
            <img v-if="cm.avatar" :src="cm.avatar" :alt="cm.author" />
            <div>
              <div class="panel__cmname">{{ cm.author }}</div>
              <div class="panel__cmttext">{{ cm.content }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
    </div><!-- /cols -->

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import FeedCard from '../components/FeedCard.vue'
import FeedLoadState from '../components/FeedLoadState.vue'
import DiscoverTopicCard from '../components/DiscoverTopicCard.vue'
import MomentCard from '../components/MomentCard.vue'
import IconSvg from '../components/IconSvg.vue'
import TopBar from '../components/TopBar.vue'
const quickImage = (key) => ({
  small: import.meta.env.BASE_URL + `discover/quick-${key}-2x.webp`,
  large: import.meta.env.BASE_URL + `discover/quick-${key}-3x.webp`,
})
const QUICK_IMAGES = {
  custom: quickImage('custom'),
  notice: quickImage('notice'),
  ai: quickImage('ai'),
  points: quickImage('points'),
}
import {
  discoverTabs,
  discoverQuick,
  plazaFilters,
  plazaShowcase,
  recommendFilters,
  dynamicFilters,
} from '../data/mock'
import { CAR_MODEL_LABELS, normalizeCarModel } from '../data/carModels'
import { clearNewMoment } from '../store/ui'
import { publishState } from '../store/publish'
import bridge from '../bridge'
import { t, locale, initLocale, regionFromLocale } from '../i18n'
// 官方公告未读数（驱动发现页快捷区红点）：必须走响应式 store
// 直接读 mock.notices 的 isRead 不会触发更新 —— mock 是普通数组，属性变化不会被 computed 追踪
import { noticeUnread } from '../store/noticeStore'
import { fetchFeeds, fetchActivities, fetchFeedDetail, fetchComments } from '../api/feed'

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
// 页面可见性（切 Tab / 手机后台）：只用于 banner 轮播的起停，
// 此前还用它暂停 4 宫格文字滚动（marquee，2026-09-05 已去掉，改省略号显示）
const heroVideoRef = ref(null)
let videoPlayTimer = null

function nextBanner() {
  if (bannerSlides.value.length < 2) return
  bannerIdx.value = (bannerIdx.value + 1) % bannerSlides.value.length
}
// 视频懒加载：preload=none 不占首屏带宽，图片先出；延迟 1.2s 再播视频
function lazyPlayHeroVideo() {
  // ⚠️ 这里的 ref 在 v-for 内部，Vue 3 会把它收集成**数组**（每个 video 型 slide 一个），
  // 直接 v.play() 会抛 "v.play is not a function"（线上 pageerror 可复现），
  // 结果是 banner 视频永远停在 poster 不自动播。取数组首项并做能力判断。
  const raw = heroVideoRef.value
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v || typeof v.play !== 'function') return
  videoPlayTimer = setTimeout(() => {
    const p = v.play()
    if (p && p.catch) p.catch(() => { /* iOS 等自动播被拦：停留在 poster，用户滑动后仍可播 */ })
  }, 1200)
}
  // 视频加载/播放失败：直接切下一张，不卡住轮播
function onVideoError() {
  nextBanner()
}
// Banner 自动轮播：只在页面「真正可见」时跑。
// 2026-09-01 复核：App.vue 用 <keep-alive> 缓存本页，Flutter 侧又是 IndexedStack，
// 切到别的 Tab 后本页组件依然挂载、onUnmounted 不触发，此前的 setInterval 会一直跑。
// 每 4s 改一次 .banner__track 的 inline transform 并触发 0.45s transition = 每 4 秒一次
// 合成层动画；停留 30 分钟就是 450 次，且隐藏期间同样在跑（纯浪费 + 持续制造合成层）。
// 改为随 activated/deactivated/visibilitychange 起停。
function startBannerLoop() {
  stopBannerLoop()
  if (document.hidden) return
  if (bannerSlides.value.length < 2) return
  bannerTimer = setInterval(() => {
    if (bannerSlides.value.length > 1 && !document.hidden) nextBanner()
  }, 4000)
}
function stopBannerLoop() {
  if (bannerTimer) {
    clearInterval(bannerTimer)
    bannerTimer = null
  }
}
function onDocVisibility() {
  if (document.hidden) stopBannerLoop()
  else startBannerLoop()
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
// 当前登录用户绑定的车型（来自 getUserInfo().carModel）；仅当其属于在售 12 车型时才在筛选条前置「我的车」
const myCarModel = ref('')
// 用户是否手动点过筛选 chip：getUserInfo 是异步桥接（真机 300~800ms），
// 期间用户完全可能已点了某个 chip，回包后不可再覆盖他的选择（2026-09-11）
let filterTouched = false
let recommendationFilterTouched = false

// 推荐保留绑定车型默认值；动态默认看所有车型，绑定车型仅作为辅助筛选。
function defaultFilter(tab) {
  if (tab === '动态') return '最新'
  const mine = myCarModel.value
  if (mine && CAR_MODEL_LABELS.includes(mine)) return mine
  return tab === '推荐' ? '全部' : '最新'
}
// 筛选 chip 点击统一入口：置「用户已操作」标记，避免被迟到的 getUserInfo 回包覆盖
function pickFilter(v) {
  if (activeFilter.value === v) return
  filterTouched = true
  if (activeTab.value === '推荐') recommendationFilterTouched = true
  activeFilter.value = v
  if (activeTab.value === '动态') reloadDynamicFeed()
}
// 默认选中「我的车」后的兜底：该车型在库里一条内容都没有时，静默退回「全部/最新」，
// 否则用户一进发现页就是一片空白（chip 仍在第一位，想筛随时点）。
// ⚠️ 只在「当前选中项就是我的车」且「该 tab 数据已回来」时才动，绝不干扰用户手动选择。
function ensureFilterHasContent() {
  // 动态车型已由服务端筛选；手动选中的车型无结果应显示空态，不静默改选。
  if (activeTab.value !== '推荐' || recommendationFilterTouched) return
  const f = activeFilter.value
  if (!f || f === '全部' || f === '最新' || f !== myCarModel.value) return
  const src = activeTab.value === '推荐' ? recommendData.value : dynamicData.value
  if (!src.length) return
  if (src.some((i) => i.carModel === f)) return
  activeFilter.value = activeTab.value === '推荐' ? '全部' : '最新'
}

// 4 宫格标签：2026-09-05 起改为两行截断（省略号），不再测量宽度、不再滚动。
// 原因：无限滚动的 marquee 是常驻合成层，和入场动画叠在一起让首屏显得杂乱。

// ---- 地区由语言映射（2026-08-31 定）：语言同时决定界面和内容 ----
// zh → CN 中国内容，pt → BR 巴西内容，en → US 全球内容
const currentRegion = computed(() => regionFromLocale(locale.value))

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
// 动态范围与车型是两个独立筛选维度；默认展示全部动态。
const dynamicScope = ref('all')
const scopeMenuOpen = ref(false)
const scopeMenuRef = ref(null)
const scopeOptions = computed(() => [
  { value: 'all', label: t('discover.scope.all') },
  { value: 'follow', label: t('discover.scope.follow') },
  { value: 'near', label: t('discover.scope.near') },
])
const scopeTriggerLabel = computed(() =>
  t(`discover.scope.${dynamicScope.value === 'follow' ? 'followShort' : dynamicScope.value}`)
)
function onScopeOutside(e) {
  if (scopeMenuOpen.value && !scopeMenuRef.value?.contains(e.target)) scopeMenuOpen.value = false
}
function onScopeEscape(e) {
  if (e.key === 'Escape') scopeMenuOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onScopeOutside)
  document.addEventListener('keydown', onScopeEscape)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onScopeOutside)
  document.removeEventListener('keydown', onScopeEscape)
})
const nearCoords = ref(null)
const nearList = ref([])
const nearLoading = ref(false)
const dynamicLoading = ref(false)
const dynamicError = ref('')
// 广场热门活动（从 /activities 接口拉取，随地区切换）
const actList = ref([])
const loading = ref(false)
const loadErr = ref('')

// 车型筛选 chip：与广场一致，使用固定的 12 个在售车型列表（不再从动态接口动态提取）
// 防御性过滤：车型代号均为纯字母数字，若异常数据混入中文标签则剔除
// 「我的车」：若当前用户绑定车型且在售列表中，则在首位（全部/最新之后）插入一个带车图标的专属 chip
const currentFilters = computed(() => {
  const isRec = activeTab.value === '推荐'
  const lead = isRec ? '全部' : '最新'
  const mine = myCarModel.value
  const mineValid = !!mine && CAR_MODEL_LABELS.includes(mine)
  const rest = (isRec ? recommendFilters : dynamicFilters)
    .slice(1)
    .filter((c) => c === '全部' || c === '最新' || !/[\u4e00-\u9fff]/.test(c))
  const chips = [{ value: lead, label: filterLabel(lead) }]
  if (mineValid) chips.push({ value: mine, label: '🚗 ' + mine, mine: true })
  rest.forEach((c) => {
    if (mineValid && c === mine) return // 已作为「我的车」前置，避免重复
    chips.push({ value: c, label: filterLabel(c) })
  })
  return chips
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
    return tsOf(b) - tsOf(a)
  })
}
// 热门话题：从已加载推荐数据的 tags 聚合（跳过 P5 / ant5 这类车型代号标签）
// A 方案轻量产品化：给话题卡加封面 emoji、分类、热度/讨论/参与，仍在瀑布流内穿插。
const TOPIC_PALETTE = [
  { bg: '#FFE8F0', color: '#E9407A' }, // 粉
  { bg: '#FFF0E6', color: '#FF7A2F' }, // 橙
  { bg: '#FFF8E0', color: '#E6A700' }, // 黄
  { bg: '#E8F9F1', color: '#18B566' }, // 绿
  { bg: '#EEF3FF', color: '#4D7CFF' }, // 蓝
  { bg: '#F2EDFF', color: '#7C5CFF' }, // 紫
]
const TOPIC_EMOJIS = ['🛵', '🔧', '🏕️', '🔋', '🛡️', '🎁', '🚲', '⚡', '🌄', '🧰', '📸', '🏆']
function topicEmoji(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0
  return TOPIC_EMOJIS[h % TOPIC_EMOJIS.length]
}
function topicCat(name) {
  const up = name.toUpperCase()
  if (/官方|活动|品牌|公告|PXID/.test(name)) return t('discover.topicOfficial')
  if (/^(P|G)?\d/.test(up)) return t('discover.topicModel')
  return t('discover.topic')
}


function topicCardStyle(topic) {
  const p = TOPIC_PALETTE[(topic.colorIndex || 0) % TOPIC_PALETTE.length]
  return {
    '--tc-cover-from': p.bg,
    '--tc-cover-to': p.color,
    '--tc-color': p.color,
  }
}
const activeTopic = ref('')
const hotTopics = computed(() => {
  const cnt = {}
  // 后续页只追加内容，不让新标签重排已显示的话题卡。
  recommendData.value.slice(0, PAGE_SIZE).forEach((x) =>
    (x.tags || []).forEach((t) => {
      if (!t) return
      if (/^(P|G)?\d+$/i.test(t)) return
      cnt[t] = (cnt[t] || 0) + 1
    })
  )
  return Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([name, n], i) => ({ name, n, colorIndex: i % TOPIC_PALETTE.length }))
})
const pickTopic = (t) => {
  activeTopic.value = activeTopic.value === t ? '' : t
}
// 推荐：按车型筛选 + 话题筛选 + 置顶优先 + 排序
const recommendList = computed(() => {
  const f = activeFilter.value
  let list = f === '全部' ? recommendData.value : recommendData.value.filter((i) => i.carModel === f)
  if (activeTopic.value) list = list.filter((i) => (i.tags || []).includes(activeTopic.value))
  // 每页入库时已排序；这里保持分页前缀顺序，避免续载时旧卡片换列。
  return list
})
// 瀑布流混合流：动态卡片 + 热门话题卡（插在第 3、8、13 位，与动态错落排布）
const wfFeed = computed(() => {
  const arr = recommendList.value
  // 话题筛选态：流首放一张“当前话题卡”，点它退出筛选
  if (activeTopic.value) {
    return [
      { __active: true, __topic: { name: activeTopic.value, n: arr.length }, __key: 'tp-active' },
      ...arr
    ]
  }
  const tops = hotTopics.value.slice(0, 3)
  if (!tops.length) return arr
  // 插入位取偶数索引，使话题卡落点变成 左(p=2) / 右(p=9) / 左(p=16) 交替，不挤在同一列
  const slots = [2, 8, 14]
  const out = []
  let ti = 0
  arr.forEach((it, i) => {
    if (slots.includes(i) && tops[ti]) {
      out.push({ __topic: tops[ti], __key: 'tp-' + tops[ti].name })
      ti++
    }
    out.push(it)
  })
  return out
})
// 竖图为主，视频保留横图；按当前列宽估算图片与文字高度，分页时稳定分列。
const featuredIds = computed(() => new Set(recommendList.value.slice(0, 2).map(x => x.id)))
const feedViewportWidth = ref(window.innerWidth)
function updateFeedWidth() { feedViewportWidth.value = window.innerWidth }
window.addEventListener('resize', updateFeedWidth, { passive: true })
onUnmounted(() => window.removeEventListener('resize', updateFeedWidth))
function estItemHeight(x) {
  if (x.__topic) return 194
  const columnWidth = ((feedViewportWidth.value >= 600 ? feedViewportWidth.value / 2 : feedViewportWidth.value) - 44) / 2
  const imageHeight = columnWidth * (x.videoUrl ? 3 / 4 : 4 / 3)
  const overlay = featuredIds.value.has(x.id) && !x.videoUrl && x.kind !== 'activity'
  if (overlay) return imageHeight + 38
  return imageHeight + 68 + ((x.title || '').length > 14 ? 21 : 0)
}
const wfColumns = computed(() => {
  const columns = [[], []], heights = [0, 0]
  for (const x of wfFeed.value) {
    const i = heights[0] <= heights[1] ? 0 : 1
    columns[i].push(x)
    heights[i] += estItemHeight(x) + 12
  }
  return columns
})
const wfColA = computed(() => wfColumns.value[0])
const wfColB = computed(() => wfColumns.value[1])

// ---- 折叠屏两栏（≥600px）：右栏详情面板 ----
// 手机（<600px）isSplit=false，右栏不渲染、不拉详情，零影响。
// 854 / 1017 / 1337 都 ≥600 → 两栏；1337 的左侧 320 导航 rail 由 Flutter 提供，
// H5 只做「左瀑布流 + 右详情」两栏，自动等分吃满 H5 拿到的宽度。
const SPLIT_MQ = window.matchMedia('(min-width: 600px)')
const isSplit = ref(SPLIT_MQ.matches)
function onSplitChange(e) { isSplit.value = e.matches }
if (SPLIT_MQ.addEventListener) SPLIT_MQ.addEventListener('change', onSplitChange)
else SPLIT_MQ.addListener(onSplitChange)
onUnmounted(() => {
  if (SPLIT_MQ.removeEventListener) SPLIT_MQ.removeEventListener('change', onSplitChange)
  else SPLIT_MQ.removeListener(onSplitChange)
})

// 右栏选中项 + 全量详情 + 评论（分栏态点左栏卡片只切右栏，不跳页）
const selectedFeed = ref(null)
const detailLoading = ref(false)
const detailItem = ref(null)      // fetchFeedDetail 全量（含正文长文 / 图片）
const detailComments = ref([])    // fetchComments 前 6 条
// 5+ 图横向轮播：当前页索引（驱动 1/N 分页与圆点）
const panelCarIndex = ref(0)
const panelCarTrack = ref(null)
function onPanelCarScroll() {
  const el = panelCarTrack.value
  if (!el) return
  const idx = Math.round(el.scrollLeft / el.clientWidth)
  if (idx !== panelCarIndex.value) panelCarIndex.value = idx
}
watch(detailItem, () => { panelCarIndex.value = 0 })
async function loadPanel(id) {
  selectedFeed.value = recommendList.value.find((x) => String(x.id) === String(id)) || null
  if (!selectedFeed.value) return
  detailLoading.value = true
  const [d, c] = await Promise.all([
    fetchFeedDetail(id),
    fetchComments(id).catch(() => []),
  ])
  // 快速连点/翻页时，旧请求返回不得覆盖当前选中
  if (String(selectedFeed.value && selectedFeed.value.id) !== String(id)) return
  detailItem.value = d
  detailComments.value = (c || []).slice(0, 6)
  detailLoading.value = false
}
function selectDetail(item) {
  if (item && item.id != null) loadPanel(item.id)
}
// ▲ 上一条 / ▼ 下一条：在推荐流（置顶优先排序）里循环翻
function stepDetail(delta) {
  const list = recommendList.value
  if (!list.length) return
  const i = list.findIndex((x) => String(x.id) === String(selectedFeed.value && selectedFeed.value.id))
  const n = i < 0 ? 0 : (i + delta + list.length) % list.length
  selectDetail(list[n])
}
// 分栏首屏：列表数据回来后默认选中置顶那条（list[0]），右栏不留白
watch(recommendList, (l) => {
  if (isSplit.value && l.length && !selectedFeed.value) selectDetail(l[0])
})
watch(isSplit, (v) => {
  if (v && !selectedFeed.value && recommendList.value.length) selectDetail(recommendList.value[0])
})
// 推荐区空态文案：车型筛选无结果 vs 全部无数据，语义分开给，避免白屏无解释
const recommendEmptyText = computed(() =>
  activeFilter.value === '全部' ? t('discover.emptyAll') : t('discover.emptyDynamic')
)
const hasDynamicModel = computed(() => activeFilter.value !== '最新' && activeFilter.value !== '全部')
const hasDynamicFilter = computed(() => hasDynamicModel.value || dynamicScope.value !== 'all')
const dynamicEmptyText = computed(() => {
  if (dynamicError.value) return dynamicError.value
  if (hasDynamicModel.value) return t('discover.dynamic.emptyModel', { model: activeFilter.value })
  return t(`discover.dynamic.empty.${dynamicScope.value}`)
})
const dynamicEmptyHint = computed(() =>
  hasDynamicModel.value
    ? t('discover.dynamic.emptyModelHint', { scope: scopeTriggerLabel.value })
    : t(`discover.dynamic.emptyHint.${dynamicScope.value}`)
)
function clearDynamicFilters() {
  scopeSelectionVersion++ // 取消尚未完成的附近定位，避免回包重新切走。
  scopeMenuOpen.value = false
  dynamicScope.value = 'all'
  nearCoords.value = null
  nearLoading.value = false
  filterTouched = true
  activeFilter.value = '最新'
  return reloadDynamicFeed()
}

// 动态：按车型筛选，最新=全部 + 置顶优先 + 排序；附近子栏用 nearList
const dynamicList = computed(() => {
  const src = dynamicScope.value === 'near' ? nearList.value : dynamicData.value
  const f = activeFilter.value
  const list = f === '最新' || f === '全部' ? src : src.filter((i) => i.carModel === f)
  return dynamicScope.value === 'near' ? rankList(list) : list
})

// 官方公告未读数 noticeUnread 见顶部 import（noticeStore）：进入详情即写已读，返回后红点自动消失

// 当前 tab 的 feed 分页 key（触底加载提示用）
const currentFeedKey = computed(() =>
  activeTab.value === '推荐' ? 'recommend' : activeTab.value === '动态' ? 'dynamic' : ''
)

function setTab(t, forceDefault = false) {
  scopeMenuOpen.value = false
  activeTab.value = t
  if (t === '推荐') recommendationFilterTouched = false
  // 切 tab 后使用该栏默认值；发布返回同时清除范围与车型，保证自己的新帖可见。
  // 保留用户已手动筛选标记，防止迟到的 getUserInfo 回包再次覆盖选择。
  if (forceDefault) filterTouched = true
  if (forceDefault && t === '动态') {
    scopeSelectionVersion++
    dynamicScope.value = 'all'
    nearCoords.value = null
    nearLoading.value = false
  }
  activeFilter.value = forceDefault ? (t === '推荐' ? '全部' : '最新') : defaultFilter(t)
  // 切 tab 必须退出搜索态：搜索态会整块隐藏列表（Banner/快捷入口/筛选/帖子），
  // 不重置会让新 tab 同样一片空白，表现为「帖子不显示」
  showSearchResults.value = false
  keyword.value = ''
  searchOpen.value = false // 切 tab 同步收起右上角搜索条
  if (t === '动态') clearNewMoment() // 进入动态 tab，清除动态红点
  ensureFilterHasContent() // 该 tab 缓存的列表若无「我的车」内容，同步退回默认筛选
  // 发布返回由调用方刷新，避免重复请求第一页。
  if (t === '动态' && !forceDefault && dynamicLoadedModel !== selectedDynamicModel()) reloadDynamicFeed()
}

// 触底分页状态（推荐/动态各自维护 page + hasMore；广场活动量小不分页）
const PAGE_SIZE = 15
const feedPage = {
  recommend: { page: 1, hasMore: true },
  dynamic: { page: 1, hasMore: true },
}
const loadingMore = ref({ recommend: false, dynamic: false })
let lastListLoadTs = 0 // 列表最近一次加载时间（keep-alive 返回时防频繁重拉）
let dynamicGeneration = 0
let dynamicLoadedModel = ''
function selectedDynamicModel() {
  // 推荐的默认车型不应污染提前加载的动态列表。
  return activeTab.value === '动态' && hasDynamicModel.value ? activeFilter.value : ''
}
function reloadDynamicFeed() {
  // 换范围或车型时让旧请求失效，并从新条件的第一页重新开始。
  dynamicGeneration++
  feedPage.dynamic.page = 1
  feedPage.dynamic.hasMore = true
  loadingMore.value.dynamic = false
  dynamicData.value = []
  nearList.value = []
  dynamicError.value = ''
  return loadFeed('dynamic')
}

// 入场动画只播一次（2026-09-06）：
// .fade-up 是 CSS animation，keep-alive 返回时组件 DOM 被重新插入 → 动画整体重播一遍，
// 表现就是「从详情返回，发现页又像重新加载一样卡片一张张浮上来」（实测返回瞬间 22 个动画在跑、
// 卡片 opacity 依次 0 → 0.30 → 0.54 → 1）。
// 做法：首屏播完后把 class 摘掉，之后（返回/切 tab）DOM 再插入也没有动画可播。
const enterAnim = ref(true)
let enterAnimTimer = null
// 只给首屏前 6 张做错开，且错开上限 6 档：
//   原来用 i % 10 → 第 11 张又从头错开，双列网格里看着就是随机的；
//   且触底追加的卡片也会带上 stagger，每翻一页都要重播一次。
const staggerFor = (i) => (enterAnim.value && i < 6 ? 'stagger-' + (i + 1) : '')
const fadeUp = () => (enterAnim.value ? 'fade-up' : '')

// 从 /feed 接口拉取真实数据（带地区过滤 + 分页）。改用统一数据层 api/feed.js：
// 动态默认取全部；选中关注范围时才带 followerDevice，由后端返回「官方+已关注」。
// 归一化/错误回落统一，消除 api/feed.js 死代码（修 H2）
// ⚠️ 调用方（onMounted / switchRegion）统一传英文 key（'recommend'/'dynamic'），
//    内部必须按 key 比对，勿用中文——曾因 'recommend' !== '推荐' 导致
//    推荐数据被塞进 dynamicData、recommendData 永远为空、For You 页永久空白（2026-08-22 修复）
// append=false 拉第一页（重置 page/hasMore）；append=true 触底追加下一页
async function loadFeed(tabKey, { append = false } = {}) {
  const st = feedPage[tabKey]
  if (!st || (append && (st.hasMore === false || loadingMore.value[tabKey] || (tabKey === 'dynamic' && dynamicLoading.value)))) return
  if (tabKey === 'dynamic' && !append) dynamicGeneration++
  const generation = dynamicGeneration
  if (append) loadingMore.value[tabKey] = true
  if (tabKey === 'dynamic' && !append) {
    dynamicLoading.value = true
    dynamicError.value = ''
  }
  try {
    const page = append ? st.page + 1 : 1
    const params = {
      region: currentRegion.value,
      page,
      pageSize: PAGE_SIZE,
    }
    if (tabKey === 'dynamic') {
      dynamicLoadedModel = selectedDynamicModel()
      params.carModel = dynamicLoadedModel
      params.allowMockFallback = false // 范围筛选失败不能拿 mock 冒充真实结果
      if (dynamicScope.value === 'follow') {
        // fetchFeeds 沿用现有设备号逻辑，由后端返回官方＋已关注。
      } else {
        params.followerDevice = ''
      }
      if (dynamicScope.value === 'near') {
        if (!nearCoords.value) throw new Error('Location unavailable')
        params.near = `${nearCoords.value.lat},${nearCoords.value.lng}`
        params.radius = 50
      }
    }
    const res = await fetchFeeds(tabKey, params)
    if (tabKey === 'dynamic' && generation !== dynamicGeneration) return
    const list = rankList(res.list || [])
    st.page = page
    st.hasMore = list.length >= PAGE_SIZE && (page * PAGE_SIZE) < (res.total || Infinity)
    if (append) {
      if (tabKey === 'recommend') recommendData.value = recommendData.value.concat(list)
      else if (dynamicScope.value === 'near') nearList.value = nearList.value.concat(list)
      else dynamicData.value = dynamicData.value.concat(list)
    } else {
      if (tabKey === 'recommend') recommendData.value = list
      else if (dynamicScope.value === 'near') nearList.value = list
      else dynamicData.value = list
      // 首屏数据到位后校正一次筛选：避免默认选中的「我的车」在库里没内容时留一片空白
      ensureFilterHasContent()
    }
  } catch (e) {
    if (tabKey === 'dynamic') {
      if (generation === dynamicGeneration) dynamicError.value = t('discover.loadFail')
    } else loadErr.value = t('discover.loadFail')
  } finally {
    if (tabKey !== 'dynamic' || generation === dynamicGeneration) {
      if (append) loadingMore.value[tabKey] = false
      if (tabKey === 'dynamic' && !append) {
        dynamicLoading.value = false
        nearLoading.value = false
      }
    }
  }
}

// 提前约一屏预取下一页，让新增卡片在用户看到列表底部前就绪。
let discoverActive = true
function onScroll() {
  if (!discoverActive || isSplit.value) return
  const doc = document.documentElement
  if (doc.scrollHeight - window.scrollY - window.innerHeight < Math.max(640, window.innerHeight * 0.8)) {
    const key = activeTab.value === '推荐' ? 'recommend' : activeTab.value === '动态' ? 'dynamic' : ''
    if (key) loadFeed(key, { append: true })
  }
}

// 分栏态（≥600px）左栏是独立滚动容器（.leftcol height:100vh overflow-y:auto），
// 文档 window 不再滚 → 单独监听 .leftcol 的 scroll 做触底分页。非分栏态 .leftcol 非滚动容器、监听永不触发，无害。
const leftcolRef = ref(null)
function onLeftcolScroll() {
  if (!discoverActive || !isSplit.value) return
  const el = leftcolRef.value
  if (!el) return
  const key = activeTab.value === '推荐' ? 'recommend' : activeTab.value === '动态' ? 'dynamic' : ''
  if (key && el.scrollHeight - el.scrollTop - el.clientHeight < Math.max(640, el.clientHeight * 0.8)) loadFeed(key, { append: true })
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

// 当语言（从而地区）变化时，重拉当前列表并清理「附近」子栏旧数据
async function onRegionChanged() {
  await Promise.all([loadFeed('recommend'), reloadDynamicFeed(), loadActivities()])
}
watch(currentRegion, (newRegion, oldRegion) => {
  if (oldRegion && newRegion !== oldRegion) onRegionChanged()
})
// 注：此前语言切换后要重新测量宫格文案宽度（驱动 marquee），改省略号后不再需要

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
// 5 个主底部 tab（与 bridge.navigateTo 契约键名一致）
const MAIN_TABS = ['discover', 'featured', 'purchase', 'service', 'profile']
function onBanner() {
  const b = bannerSlides.value[bannerIdx.value]
  if (!b || !b.url) return
  const u = b.url
  if (/^https?:\/\//i.test(u)) { bridge.openShopify(u); return }
  if (!u.startsWith('/')) { bridge.openNative(u); return }
  // 内部路由：取路径首段
  const seg = u.slice(1).split('/')[0]
  if (bridge.isNative()) {
    if (MAIN_TABS.includes(seg)) {
      // 关键点：主 tab 路由必须走 navigateTo 让 Flutter 正确切换底部 tab 并加载该 tab 路由。
      // router.push 只改 H5 内部路由、Flutter tab 状态仍停在发现 → 点底部 tab 不响应（回不来发现）；
      // openNative 是开原生子页(车型/绑车)，不是切 tab → 同样失效。两者都错。
      bridge.navigateTo(seg)
  } else {
    // /product/*、/notice/* 等二级子页：白名单路由优先全屏右滑通道（2026-09-08 对接说明），
    // 无 Channel（旧 App）保持 openNative 旧行为
    if (bridge.openFullscreenRoute(u)) return
    bridge.openNative(u.slice(1))
  }
  } else {
    router.push(u) // 浏览器独立预览兜底
  }
}

// 发布后自动切到「动态」tab 展示新内容
function resetDiscoverScroll() {
  window.scrollTo(0, 0)
  if (leftcolRef.value) leftcolRef.value.scrollTop = 0
}

onMounted(async () => {
  // 原生 WebView/浏览器刷新后不得恢复上次停留的列表中段；详情返回仍由路由器恢复位置。
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  resetDiscoverScroll()
  // 账户信息和语言桥接互不依赖；同时请求，避免两个原生往返串行阻塞首屏列表。
  const userInfoPromise = bridge.getUserInfo().catch(() => null)
  await initLocale() // 先按系统语言初始化（URL ?lang= 优先级最高，见 i18n/initLocale）
  // 地区由当前语言自动映射：zh→CN、pt→BR、en→US，见 regionFromLocale
  // 取登录用户绑定车型（用于「我的车」快捷筛选 chip）
  // 第一方案：Flutter getUserInfo().carModel；回退方案：H5 localStorage 记忆（Flutter 未返回时使用）
  // ⚠️ 必须过 normalizeCarModel：Flutter 回传值可能是 'p2' / 'scooter-P2' / 带空格，
  //    直接 includes() 会判死 → chip 静默不出现（线上实测踩过，2026-09-11）。
  try {
    // ⚠️ 区分两种「取不到」：getUserInfo 失败（null）= 桥不通，保留本地缓存；
    //    桥通但 carModel 为空 = 用户没绑/已解绑 → 清缓存，避免默认筛一个不存在的车型。
    const u = await userInfoPromise
    let car = u ? normalizeCarModel(u.carModel) : ''
    if (u && !car) { try { localStorage.removeItem('pxid_my_car_model') } catch (e) {} }
    if (!car) car = normalizeCarModel(localStorage.getItem('pxid_my_car_model'))
    if (car) {
      myCarModel.value = car
      // 双向同步：本地存一份，保证 Flutter 接上前后表现一致
      try { localStorage.setItem('pxid_my_car_model', car) } catch (e) {}
      // 推荐默认筛自己的车，动态仍看所有车型；用户已点过 chip 则不覆盖。
      if (!filterTouched) activeFilter.value = defaultFilter(activeTab.value)
    }
  } catch (e) { /* getUserInfo 失败则无「我的车」chip */ }
  loading.value = true
  await Promise.all([loadFeed('recommend'), loadFeed('dynamic'), loadActivities(), fetchBanners()])
  loading.value = false
  await nextTick()
  resetDiscoverScroll()
  lastListLoadTs = Date.now()
  if (publishState.pendingTab) {
    setTab(publishState.pendingTab, true)
    publishState.pendingTab = null
    publishState.needsRefresh = false
    // 刚发完帖：切到目标 tab 后补拉一次，保证新帖可见
    await refreshCurrentTab()
  }
  // Banner 轮播自动播放：统一 4s/张，视频 slide 也定时切走（不再等 @ended，避免视频 loop 卡在第一张）
  startBannerLoop()
  document.addEventListener('visibilitychange', onDocVisibility)
  // 暴露给原生发布器：Flutter 发布完成关闭发布页时调用，通知发现页刷新列表。
  // 真机发布走 openNative('discover/publish')，H5 收不到 addMoment，必须靠这一回调补信号。
  window.__pxidOnPublished = async () => {
    publishState.needsRefresh = true
    publishState.pendingTab = '动态'
    // 原生发布器关闭时根 WebView 可能没有重新触发 onActivated，直接刷新可见列表。
    if (discoverActive) {
      publishState.needsRefresh = false
      publishState.pendingTab = null
      setTab('动态', true)
      await refreshCurrentTab()
      await nextTick()
      resetDiscoverScroll()
    }
  }
  // 视频懒加载：首屏图片先渲染，视频延迟播放
  lazyPlayHeroVideo()
  // 触底分页：滚动加载更多（推荐/动态）
  window.addEventListener('scroll', onScroll, { passive: true })
  // 入场动画播完就摘掉 class：keep-alive 返回时 DOM 重新插入也不会重播
  // （fade-up 0.45s + 最大 0.25s 错开，留 900ms 余量）
  clearTimeout(enterAnimTimer)
  enterAnimTimer = setTimeout(() => { enterAnim.value = false }, 900)
})
onDeactivated(() => {
  discoverActive = false
  scopeMenuOpen.value = false
  // 切到别的 Tab（Flutter IndexedStack 隐藏本 WebView）时停掉，避免隐藏期间持续制造合成层
  stopBannerLoop()
})
onUnmounted(() => {
  clearTimeout(enterAnimTimer)
  enterAnimTimer = null
  stopBannerLoop()
  document.removeEventListener('visibilitychange', onDocVisibility)
  window.removeEventListener('scroll', onScroll)
  delete window.__pxidOnPublished
  if (videoPlayTimer) { clearTimeout(videoPlayTimer); videoPlayTimer = null }
})

// App.vue 用 <keep-alive> 缓存全部页面：从详情页返回时 onMounted 不会重跑。
//
// ⚠️ 2026-09-05 改：返回**不再**自动重拉列表。原因是转场（280ms 横滑）还在跑，
//    列表一重排就「闪一下」，还和滚动位置恢复互相打架，进出看着非常乱。
//    现在只在三种情况下刷新：
//      ① 明确请求过刷新（发完帖 / 语言或地区切换）
//      ② 距上次拉取超过 5 分钟
//      ③ 用户手动下拉刷新（见下方 onPtrStart/Move/End）
onActivated(async () => {
  discoverActive = true
  startBannerLoop() // 回到本 Tab 恢复轮播
  const stale = Date.now() - lastListLoadTs > STALE_MS
  const justPublished = pendingListRefresh || publishState.needsRefresh || !!publishState.pendingTab
  if (!stale && !justPublished) return
  pendingListRefresh = false
  publishState.needsRefresh = false
  const tab = publishState.pendingTab
  publishState.pendingTab = null
  if (tab) {
    // 发完帖回到发现页：清除范围与车型，再重拉目标列表。
    setTab(tab, true)
    await refreshCurrentTab()
    await nextTick()
    resetDiscoverScroll()
  } else {
    await refreshCurrentTab()
  }
})

// 刷新当前 tab（下拉刷新 / 发完帖 / 数据过旧时调用）
async function refreshCurrentTab() {
  const key = activeTab.value === '动态' ? 'dynamic' : 'recommend'
  const jobs = [loadFeed(key)]
  if (activeTab.value === '推荐') jobs.push(loadActivities(), fetchBanners())
  await Promise.all(jobs)
  lastListLoadTs = Date.now()
}

// ---- 下拉刷新 ----
const STALE_MS = 5 * 60 * 1000
let pendingListRefresh = false
const ptrDist = ref(0)
const ptrBusy = ref(false)
let ptrStartY = 0
let ptrActive = false
const PTR_TRIGGER = 56
function onPtrStart(e) {
  if (ptrBusy.value || showSearchResults.value || window.scrollY > 0 || (isSplit.value && leftcolRef.value?.scrollTop > 0)) return
  ptrStartY = e.touches[0].clientY
  ptrActive = true
}
function onPtrMove(e) {
  if (!ptrActive) return
  const d = e.touches[0].clientY - ptrStartY
  // 阻尼：越往下越沉，最多 80px
  ptrDist.value = d > 0 ? Math.min(80, d * 0.45) : 0
}
async function onPtrEnd() {
  if (!ptrActive) return
  ptrActive = false
  const d = ptrDist.value
  ptrDist.value = 0
  if (d < PTR_TRIGGER) return
  ptrBusy.value = true
  try {
    await refreshCurrentTab()
    await nextTick()
    resetDiscoverScroll()
  } finally {
    ptrBusy.value = false
  }
}

function onAdd() {
  // 原生环境：拉起原生发布器（契约 openNative('discover/publish')）
  if (bridge.isNative()) {
    bridge.openNative('discover/publish')
    return
  }
  // H5 预览：跳转 H5 发布页，保证可真实发布
  router.push('/publish')
}
// 白名单二级路由统一走全屏右滑通道（2026-09-08 对接说明）：App 内交 Flutter 全屏打开，
// 浏览器/旧 App/全屏页内自动回退 router.push（openFullscreenRoute 内部已判根 WebView）
function openSecondary(route) {
  if (bridge.openFullscreenRoute(route)) return
  router.push(route)
}
function onNotice() { openSecondary('/interactions') }
function onQuick(q) {
  if (q.key === 'notice') { openSecondary('/notices'); return }
  // 智能助手（PXID）→ H5 助手页
  if (q.key === 'ai') { openSecondary('/message'); return }
  // 决策 2：立即定制 → H5 自研「车型详情页」/vehicle/ant5（VehicleDetailView）
  // （2026-09-11 坤哥纠正：落地页是车型详情页——选版本/配色 + 车主口碑 + 热门推荐 + 品牌卡，
  //   不是 /purchase/customize 那张自研定制表单页。）
  // ⚠️ 不可裸 router.push：本入口在发现页（根 WebView），H5 内 push 会把车型页开在
  //    根 WebView 里 → 底部露出 Flutter 原生 tab（2026-09-11 截图问题③ 同款症状）。
  //    走 openSecondary → openFullscreenRoute：真机交 Flutter 新开全屏 WebView 承载本页
  //    （右滑返回、无原生底栏）；浏览器/非根 WebView 内部自动回退 router.push。
  // ⚠️ Flutter 侧全屏白名单必须同步包含 /vehicle/ant5（或通配 /vehicle/:id），否则静默拒收 = 点击无反应。
  if (q.key === 'custom') { openSecondary('/vehicle/ant5'); return }
  if (q.key === 'points') { openSecondary('/points'); return }
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

// 沿用原来的设备关注流与定位机制；只有选中「附近」才申请位置。
let scopeSelectionVersion = 0
async function setDynamicScope(scope) {
  scopeMenuOpen.value = false
  const version = ++scopeSelectionVersion
  if (dynamicScope.value === scope) {
    nearLoading.value = false
    return
  }
  if (scope === 'near') {
    nearLoading.value = true
    const loc = await getLocation()
    if (version !== scopeSelectionVersion) return
    if (!loc) {
      nearLoading.value = false
      showToast(t('discover.nearFail'))
      return
    }
    nearCoords.value = loc
  } else {
    nearCoords.value = null
    nearLoading.value = false
  }
  dynamicScope.value = scope
  await reloadDynamicFeed()
}

function onShowcase(p) {
  // 广场车型卡是「发动态关联选车」车型库，点击直接进发布页并预选该车型
  // 不跳车型详情/精选（精选仅单店且当前与发布无关）
  const q = '?carModel=' + encodeURIComponent(p.name)
  if (bridge.isNative()) {
    bridge.openNative('discover/publish' + q)
  } else {
    router.push('/publish' + q)
  }
}
function onMoreActivity() { openSecondary('/activity-center') }
function onActivity(a) { openSecondary('/activity/' + a.id) }

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

// 右上角搜索按钮：点击滑出 / 收起搜索条（三 tab 通用，替代原常驻搜索框）
const searchOpen = ref(false)
const searchInputRef = ref(null)
function toggleSearch() {
  scopeMenuOpen.value = false
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    nextTick(() => searchInputRef.value && searchInputRef.value.focus())
  }
}
// 输入框内 ×：清空关键词并退出结果态，保持搜索条打开方便续输
function clearSearch() {
  keyword.value = ''
  showSearchResults.value = false
  nextTick(() => searchInputRef.value && searchInputRef.value.focus())
}

// 关键词被清空（用户手动删完 / 点清除）立即退出搜索态：
// 否则列表仍被搜索态整块隐藏，页面只剩「0 个结果」，看起来就像「帖子不显示」
watch(keyword, (k) => {
  if (!String(k || '').trim()) showSearchResults.value = false
})

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
  background: #f5f8fd;
  padding-bottom: env(safe-area-inset-bottom);
}
/* 下拉刷新：容器高度跟手，内容自然下推；转圈只在真正请求时出现 */
.ptr {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 0;
  overflow: hidden;
}
.ptr__dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--brand, #6c4dff);
}
.ptr__dot--spin {
  animation: ptrspin 0.7s linear infinite;
}
@keyframes ptrspin {
  to {
    transform: rotate(360deg);
  }
}
.discover :deep(.tb-left) { min-width: 0; flex: 1; overflow: hidden; }
.tabs {
  display: flex; flex: 1 1 0; align-items: center; gap: 20px; margin-left: 8px;
  min-width: 0; padding-right: 8px; overflow-x: auto; scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  position: relative; flex: 0 0 auto; font-size: clamp(16px, 4.3vw, 19px); font-weight: 500; line-height: 1.2; color: #697386; min-height: 44px; padding: 8px 0; background: none; white-space: nowrap;
}
.tab.active {
  color: #000000;
  font-weight: 700;
}
.tab.active::after {
  content: ''; position: absolute; left: 50%; bottom: 2px; transform: translateX(-50%); width: 24px; height: 4px; border-radius: 4px; background: var(--brand);
}
.topacts {
  display: flex; align-items: center; gap: 8px;
}
.act {
  position: relative;
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #14213b; background: transparent; border: 0; border-radius: 50%;
}
.act::before {
  content: '';
  position: absolute;
  width: 34px;
  height: 34px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #f3f6fc;
  border-radius: 50%;
  pointer-events: none;
}
.act > svg {
  position: relative;
}
.act--add {
  flex: none;
  transform-origin: center;
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
  background: var(--accent);
  z-index: 2;
}

.search {
  margin: 12px 16px 0;
  height: 50px;
  background: #fff;
  border: 1px solid #d4e0f3;
  border-radius: var(--radius-pill, 999px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 17px;
  box-shadow: 0 5px 16px rgba(47, 84, 148, .11);
}
.search:focus-within {
  border-color: #6694f8;
  box-shadow: 0 0 0 3px rgba(63, 108, 248, .13), 0 6px 18px rgba(47, 84, 148, .12);
}
/* 搜索结果（内联） */
.search-results {
  padding: 8px 12px 16px;
  /* 卡片改白底后必须拉开间距，否则堆叠的白卡会粘成一片（2026-09-21）。
     用 gap 统一节奏，卡片自身不加 margin，避免与 .grid2 的 gap 叠加。 */
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.search-results__head {
  font-size: 13px;
  color: var(--text-hint);
  /* 底距交给上面的 gap（原来是 12px，会与 gap 叠加） */
  padding: 4px 4px 0;
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
  color: #4d72b8;
  display: flex;
  align-items: center;
}
.sinput {
  flex: 1;
  font-size: 15px;
  color: var(--text);
  background: transparent;
  border: none;
  outline: none;
}
.sinput::placeholder {
  color: #7787a3;
}
.act--search {
  flex: none;
}
.act--search.act--on {
  color: var(--brand, #4a6cf7);
}
.sclose {
  flex: none;
  color: var(--text-hint);
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
  border: 0;
  background: transparent;
}
/* 搜索条滑出 / 收起过渡 */
.searchslide-enter-active,
.searchslide-leave-active {
  transition: max-height .3s ease, opacity .25s ease, margin-top .3s ease, margin-bottom .3s ease;
  overflow: hidden;
}
.searchslide-enter-from,
.searchslide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
}
.searchslide-enter-to,
.searchslide-leave-from {
  max-height: 62px;
  opacity: 1;
  margin-top: 12px;
  margin-bottom: 0;
}
/* 焦点图：图片保持主体，底部渐变承载标题与轮播提示。 */
.banner {
  position: relative; margin: 10px 16px 0; border: 2px solid #fff; border-radius: 14px; overflow: hidden; aspect-ratio: 2; touch-action: pan-y; background: #fff;
  box-sizing: border-box;
}
.banner__track {
  display: flex;
  height: 100%;
  transition: transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.banner__slide {
  position: relative; flex: 0 0 100%; min-width: 100%; height: 100%;
}
.banner__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.banner__dots {
  position: absolute; bottom: 5px; right: 10px; display: flex; justify-content: flex-end; z-index: 2;
}
.banner__dot {
  width: 24px; height: 24px; display: grid; place-items: center; background: transparent; padding: 0;
}
.banner__dot.on {
  background: transparent;
}
.quick {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 12px 16px 14px; padding: 10px 4px; border-radius: 12px; background: #fff;
}
.quick__item {
  position: relative; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; background: transparent; padding: 0 2px;
}
/* 统一浅蓝圆角容器，图标与文字居中。 */
.quick__thumb {
  position: relative; width: 54px; height: 54px; border-radius: 16px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; transition: transform .15s ease;
}
.quick__item:active .quick__thumb { transform: scale(.94); }
.quick__icon {
  width: 100%; height: 100%; object-fit: contain; transform: scale(1.4);
}
.quick__thumb--custom .quick__icon { transform: scale(1.36); }
.quick__thumb--points .quick__icon { transform: scale(1.22); }
.quick__label {
  width: 100%;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.3;
  color: var(--text);
  text-align: center; /* 各语言标签统一居中（修 EN/PT 通知/积分偏左不齐） */
}
/* 两行截断代替横向滚动（marquee 2026-09-05 去掉）：
   无限滚动是常驻合成层，和首屏入场动画叠在一起显得杂乱；葡语等长文案用省略号收尾，
   既不制造合成层，各语言表现也一致 */
.quick__label__text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.q-badge {
  position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: #ff4a60; border: 2px solid #fff; z-index: 2;
}
.dynamic-intro {
  display: flex; align-items: center; gap: 12px; margin: 4px 16px 12px; padding: 14px;
  background: var(--card, #fff); border-radius: 12px;
}
.dynamic-intro__copy { flex: 1; min-width: 0; }
.dynamic-intro__title { margin: 0; color: var(--text); font-size: 15px; font-weight: 600; line-height: 1.5; }
.dynamic-intro__hint { margin: 4px 0 0; color: var(--text-hint); font-size: 12px; line-height: 1.6; }
.dynamic-intro__publish {
  flex: 0 0 auto; min-height: 40px; padding: 0 12px; border: 1px solid #dbe5ff; border-radius: 999px;
  background: #f5f8ff; color: var(--brand); font-size: 13px; font-weight: 600; white-space: nowrap;
}
.dynamic-empty { padding: 40px 24px; }
.dynamic-empty__title { margin: 0; color: var(--text); font-size: 15px; font-weight: 500; }
.dynamic-empty__hint { margin: 10px 0 0; line-height: 1.7; }
.dynamic-empty__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 18px; }
.dynamic-empty__action { min-height: 40px; padding: 0 16px; border-radius: 999px; background: #f1f5ff; color: var(--brand); font-size: 13px; }
.dynamic-intro__publish:focus-visible, .dynamic-empty__action:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.filter {
  display: flex; align-items: center; margin: 0 16px; gap: 8px; position: relative; z-index: 5;
}
.chips {
  display: flex; gap: 10px; flex: 1; min-width: 0; overflow-x: auto; padding: 4px 0 8px; scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }
.scope { position: relative; flex: 0 0 auto; align-self: stretch; display: flex; align-items: center; }
.scope__trigger {
  min-height: 44px; padding: 0 2px 0 8px; display: inline-flex; align-items: center; gap: 4px;
  color: #34405a; background: transparent; font-size: 13px; font-weight: 600; white-space: nowrap;
}
.scope__trigger svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; transition: transform .15s ease; }
.scope__chevron--open { transform: rotate(180deg); }
.scope__menu {
  position: absolute; z-index: 10; right: 0; top: calc(100% - 2px); min-width: 132px;
  padding: 4px; background: #fff; border: 1px solid #e4e9f2; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(29, 43, 77, .10);
}
.scope__option {
  width: 100%; min-height: 42px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between;
  gap: 12px; background: transparent; border-radius: 7px; color: #34405a; font-size: 13px; text-align: left; white-space: nowrap;
}
.scope__option:hover, .scope__option[aria-selected="true"] { background: #f2f5ff; }
.scope__check { color: var(--brand); font-size: 16px; }
.scope__trigger:focus-visible, .scope__option:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
/* 车型筛选 chip：统一选中/未选中逻辑（2026-09-27 诊断书修正）
   未选中 = 白底 + 浅灰边 + 深灰字；选中 = 品牌蓝实心 + 白字；
   「我的车」取消常驻蓝边，仅保留 🚗 前缀，避免视觉第三态 */
.chip {
  min-width: 56px; min-height: 40px; padding: 0 18px; border-radius: 999px; background: #fafbfe; border: 1px solid #e4e9f2; color: #566076; font-size: 13px; font-weight: 500; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
}
.chip.active {
  color: #fff; background: var(--brand); border-color: var(--brand); font-weight: 700; box-shadow: 0 2px 6px rgba(37,99,235,.12);
}
.content {
  margin-top: 12px;
  padding-bottom: 16px;
}
.empty-tab {
  text-align: center;
  font-size: 13px;
  color: var(--text-hint);
  padding: 40px 0;
}
.empty-tab__reset {
  display: inline-block;
  margin-left: 8px;
  padding: 4px 12px;
  border-radius: var(--radius-pill, 999px);
  color: var(--brand, #4a6cf7);
  background: var(--brand-soft, rgba(74, 108, 247, 0.1));
  font-size: 12px;
  font-weight: 700;
}

.topics {
  padding: 2px 0 10px;
}
.topics__bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 12px;
  -webkit-overflow-scrolling: touch;
}
.topics__bar::-webkit-scrollbar {
  display: none;
}
.topic {
  flex: none;
  background: var(--card);
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  white-space: nowrap;
}
.topic em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-hint);
  margin-left: 3px;
}
.topic.on {
  background: var(--brand);
  color: #fff;
}
.topic.on em {
  color: rgba(255, 255, 255, 0.75);
}
.wf2 {
  display: flex; gap: 12px; padding: 0 16px; align-items: flex-start;
}
.wf-col {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px;
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
  padding: 0 16px;
}
.showcase {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(30,50,80,.035);
  padding: 0;
  border: 0;
  min-width: 0;
}
.showcase__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.showcase__bar {
  background: #f9fafc;
  color: #39445a;
  font-size: 12px;
  text-align: center;
  padding: 7px 0;
  font-weight: 500;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 16px 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 7px;
}
.section-more {
  font-size: 13px;
  color: var(--text-hint);
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  background: transparent;
  padding: 0;
}
.acts {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.activity {
  background: var(--card);
  border: none;
  border-radius: 12px;
  box-shadow: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.act__img {
  width: 88px;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  flex: none;
  height: 70px;
}
.act__info {
  flex: 1;
  min-width: 0;
}
.act__title {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 500;
}
.act__date {
  font-size: 11px;
  color: var(--text-hint);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.act__btn {
  flex: none;
  background: var(--brand);
  color: #ffffff;
  border-radius: var(--radius-pill);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(37,99,235,.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  white-space: nowrap;
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
/* ===== 折叠屏两栏（≥600px）：左瀑布流错落 + 右详情面板 =====
   手机 <600px：.cols 塌成单栏（.leftcol 无 width 约束、.panel 不渲染），与现状一致。
   两栏各自 100vh 独立滚动（iPad 双 pane 范式）：左栏整列滚、右栏整列滚。 */
@media (min-width: 600px) {
  .cols {
    display: flex;
    align-items: flex-start;
  }
  .leftcol {
    flex: 1 1 0;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .panel {
    flex: 1 1 0;
    min-width: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--card);
    border-left: 1px solid var(--line);
  }
}

/* 右栏详情面板内部（仅分栏态出现） */
.panel__nav {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 14px;
  box-sizing: border-box;
  background: var(--card);
  border-bottom: 1px solid #F0F0F0;
}
.panel__tag {
  background: var(--brand-soft);
  color: var(--brand);
  border-radius: 9px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 500;
}
.panel__navbtn {
  margin-left: auto;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-sub);
}
.panel__navbtn + .panel__navbtn { margin-left: 6px; }
.panel__navbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.panel__loading {
  padding: 40px 16px;
  color: var(--text-hint);
  font-size: 13px;
  text-align: center;
}
/* 右栏媒体区：视频/单图/5+轮播 置顶，与直板机详情页规则一致 */
.panel__hero {
  width: 100%;
  background: var(--bg);
  overflow: hidden;
}
.panel__hero-video {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.panel__img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
  background: #eee;
}
.panel__carousel { position: relative; background: #000; }
.panel__car-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.panel__car-track::-webkit-scrollbar { display: none; }
.panel__car-slide {
  flex: 0 0 100%;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  scroll-snap-align: center;
  display: block;
}
.panel__car-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: rgba(0, 0, 0, .5);
  color: #fff;
  font-size: 12px;
  padding: 2px 9px;
  border-radius: 11px;
  pointer-events: none;
}
.panel__car-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  display: flex;
  gap: 6px;
  justify-content: center;
  pointer-events: none;
}
.panel__car-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .5);
  transition: width .2s, background .2s;
}
.panel__car-dot.on { background: #fff; width: 16px; border-radius: 3px; }

/* 2-4 张：不置顶，随正文流双列网格 */
.panel__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 14px;
}
.panel__grid-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}
.panel__body { padding: 14px; }
.panel__title {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 12px;
}
.panel__author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.panel__author img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #eee;
  object-fit: cover;
}
.panel__authinfo span { font-size: 13px; color: var(--text); display: block; }
.panel__authinfo em { font-style: normal; font-size: 11px; color: var(--text-hint); }
.panel__text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text);
  margin-bottom: 16px;
  white-space: pre-line;
}
.panel__stat {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-hint);
  padding-bottom: 14px;
  border-bottom: 1px solid #F0F0F0;
}
.panel__stat b { color: var(--price); font-weight: 500; }
.panel__cmt { padding: 14px; }
.panel__cmt h4 { font-size: 13px; color: var(--text-sub); margin: 0 0 12px; }
.panel__cmtitem { display: flex; gap: 9px; margin-bottom: 14px; }
.panel__cmtitem img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eee;
  flex: none;
  object-fit: cover;
}
.panel__cmname { font-size: 12px; color: var(--text-hint); margin-bottom: 3px; }
.panel__cmttext { font-size: 13px; line-height: 1.5; color: var(--text); }
/* 仅发现页的根导航适配窄屏及英文/葡文，不修改全站 TopBar。 */
.banner__copy { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 18px 16px 14px; color: white; background: linear-gradient(180deg, transparent 45%, rgba(0,0,0,.6)); pointer-events: none; }
.banner__copy h2, .banner__copy p { max-width: calc(100% - 120px); }
.banner__copy h2 { font-size: 22px; line-height: 1.25; font-weight: 700; margin: 0 0 6px; text-wrap: balance; }
.banner__copy p { margin: 0; font-size: 12px; line-height: 1.5; opacity: .92; }
.banner__dot::after { content: ''; width: 5px; height: 5px; border-radius: 5px; background: rgba(255,255,255,.7); transition: width .2s ease; }
.banner__dot.on::after { width: 14px; background: var(--brand); }
.locale-en .tabs, .locale-pt .tabs { gap: 12px; }
.discover button:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
@media(max-width: 359px) { .tabs { gap: 12px; } .topacts { gap: 4px; } .banner__copy h2 { font-size: 20px; } }
@media(min-width: 600px) and (max-width: 749px) { .tabs { gap: 10px; margin-left: 2px; } .topacts { gap: 2px; } .act { width: 40px; height: 40px; } .banner__copy { padding: 12px 12px 12px; } .banner__copy h2 { font-size: 18px; } .banner__copy p { font-size: 11px; } }
@media(prefers-reduced-motion: reduce) { .banner__track, .banner__dot::after, .quick__thumb { transition: none; } }
/* 广场与动态：与推荐页保持同一圆角、边距和品牌色节奏。 */

.section-title::before { content: ''; width: 3px; height: 14px; border-radius: 3px; background: var(--brand); }

.section-more span { font-size: 20px; }

@media(max-width: 359px), (min-width: 600px) and (max-width: 749px) {
  .act__img { width: 64px; height: 64px; }
  .activity { flex-wrap: wrap; gap: 8px; }
  .act__btn { margin-left: auto; }
}
</style>
