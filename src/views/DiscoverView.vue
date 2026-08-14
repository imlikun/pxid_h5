<template>
  <div class="discover">
    <!-- 顶部：三 tab + 操作 -->
    <div class="topbar">
      <div class="tabs">
        <span
          v-for="t in tabs"
          :key="t"
          class="tab"
          :class="{ active: activeTab === t }"
          @click="setTab(t)"
          >{{ t }}</span
        >
      </div>
      <div class="topacts">
        <span class="act act--add" @click="onAdd">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        </span>
        <span class="act act--bell" @click="onNotice">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </span>
      </div>
    </div>

    <!-- 搜索：推荐/广场显示 -->
    <div v-if="activeTab !== '动态'" class="search" @click="onSearch">
      <span class="sicon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input class="sinput" v-model="keyword" placeholder="搜索内容/活动/车型" @keyup.enter="onSearch" @click.stop />
    </div>

    <!-- Banner + 快捷入口：仅推荐页 -->
    <template v-if="activeTab === '推荐'">
      <div class="banner">
        <img
          class="banner__img"
          :src="bannerImg"
          alt="Banner"
        />
      </div>
      <div class="quick">
        <div v-for="q in discoverQuick" :key="q.key" class="quick__item" @click="onQuick(q)">
          <span v-if="q.key === 'notice' && noticeUnread > 0" class="q-badge"></span>
          <IconSvg class="quick__icon" :name="q.icon" :size="22" />
          <div class="quick__label">{{ q.label }}</div>
        </div>
      </div>
    </template>

    <!-- 车型筛选：仅推荐/动态显示（推荐=全部、动态=最新；广场无筛选条，与设计稿一致） -->
    <div v-if="activeTab !== '广场'" class="filter">
      <div class="chips">
        <span
          v-for="f in currentFilters"
          :key="f"
          class="chip"
          :class="{ active: activeFilter === f }"
          @click="activeFilter = f"
          >{{ f }}</span
        >
      </div>
      <span class="sort" @click="onSort">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m11 12 4 4 4-4"/><path d="M15 20V4"/></svg>
      </span>
    </div>

    <!-- 推荐：双列网格 -->
    <div v-if="activeTab === '推荐'" class="content">
      <div class="grid2">
        <FeedCard v-for="it in recommendList" :key="it.id" :item="it" />
      </div>
    </div>

    <!-- 动态：独立 UGC 流（单列卡片） -->
    <div v-else-if="activeTab === '动态'" class="content">
      <MomentCard v-for="it in dynamicList" :key="it.id" :item="it" />
      <div v-if="dynamicList.length === 0" class="empty-tab">暂无该车型动态</div>
    </div>

    <!-- 广场：车型展示 + 热门活动 -->
    <div v-else-if="activeTab === '广场'" class="content">
      <div class="grid3">
        <div
          v-for="p in plazaShowcase"
          :key="p.id"
          class="showcase"
          @click="onShowcase(p)"
        >
          <img class="showcase__img" :src="p.cover" :alt="p.name" />
          <div class="showcase__bar">{{ p.name }}</div>
        </div>
      </div>
      <div class="section-head">
        <span class="section-title">热门活动</span>
        <span class="section-more" @click="onMoreActivity">更多 &gt;</span>
      </div>
      <div class="acts">
        <div
          v-for="a in activities"
          :key="a.id"
          class="activity"
          @click="onActivity(a)"
        >
          <img class="act__img" :src="a.cover" :alt="a.title" />
          <div class="act__info">
            <div class="act__title">{{ a.title }}</div>
            <div class="act__date">{{ a.date }}</div>
          </div>
          <button class="act__btn">立即查看</button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import FeedCard from '../components/FeedCard.vue'
import MomentCard from '../components/MomentCard.vue'
import IconSvg from '../components/IconSvg.vue'
import {
  discoverTabs,
  discoverQuick,
  recommendFilters,
  dynamicFilters,
  plazaFilters,
  feedItems,
  moments,
  plazaShowcase,
  activities,
  notices,
} from '../data/mock'
import { clearNewMoment } from '../store/ui'
import bridge from '../bridge'

const router = useRouter()
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'
const tabs = discoverTabs
const filtersByTab = {
  推荐: recommendFilters,
  动态: dynamicFilters,
  广场: plazaFilters,
}
const defaultsByTab = { 推荐: '全部', 动态: '最新', 广场: 'P1' }
const activeTab = ref('推荐')
const activeFilter = ref('全部')

const currentFilters = computed(() => filtersByTab[activeTab.value])
// 推荐：聚合 feedItems（按车型筛选）
const recommendList = computed(() => {
  const f = activeFilter.value
  if (f === '全部' || f === '最新') return feedItems
  return feedItems.filter((i) => i.filter === f)
})
// 动态：独立 moments 流（按车型筛选，最新=全部）
const dynamicList = computed(() => {
  const f = activeFilter.value
  if (f === '最新') return moments
  return moments.filter((i) => i.carModel === f)
})

// 官方公告未读数（驱动发现页快捷区红点）
const noticeUnread = computed(() => notices.filter((n) => !n.isRead).length)

function setTab(t) {
  activeTab.value = t
  activeFilter.value = defaultsByTab[t]
  if (t === '动态') clearNewMoment() // 进入动态 tab，清除动态红点
}

function onAdd() {
  // 决策 1：优先原生发布器；H5 降级提示
  if (!bridge.isEmbed) { showToast('请在 App 内发布动态'); return }
  bridge.openNative('discover/publish')
}
function onNotice() { router.push('/message') }
function onQuick(q) {
  if (q.key === 'notice') { router.push('/notices'); return }
  // 决策 2：立即定制归口购车定制页（原生承载）
  if (q.key === 'custom') { bridge.openNative('purchase/customize'); return }
  console.log('quick tap:', q.key)
}
function onSort() { console.log('sort tap') }
function onShowcase(p) {
  // 决策 8：车型卡跳购车车型页（原生承载）
  bridge.openNative('vehicle/' + p.id)
}
function onMoreActivity() { console.log('more activity') }
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
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
  background: #ffffff;
}
.tabs {
  display: flex;
  gap: 13px;
}
.tab {
  font-size: 16px;
  color: var(--text-sub);
  font-weight: 400;
  line-height: 1.2;
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
}
.search {
  margin: 10px 16px 0;
  height: 40px;
  background: #ffffff;
  border: 1px solid #E0E0E0;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
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
  margin: 24px 0 0;
  height: 44px;
  padding: 0 16px;
}
.chips {
  display: flex;
  gap: 16px;
  padding: 14px 0;
}
.chip {
  font-size: 16px;
  color: var(--text-sub);
  line-height: 1;
}
.chip.active {
  color: var(--brand);
  font-weight: 700;
}
.sort {
  color: var(--text-hint);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex: none;
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