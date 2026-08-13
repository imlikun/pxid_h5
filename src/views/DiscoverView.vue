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
        <span class="act" @click="onAdd">＋</span>
        <span class="act" @click="onNotice">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </span>
      </div>
    </div>

    <!-- 搜索：推荐/广场显示 -->
    <div v-if="activeTab !== '动态'" class="search">
      <span class="sicon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input class="sinput" placeholder="搜索内容/活动/车型" />
    </div>

    <!-- Banner + 快捷入口：仅推荐页 -->
    <template v-if="activeTab === '推荐'">
      <div class="banner">
        <img
          class="banner__img"
          src="/discover-banner.jpg"
          alt="Banner"
        />
      </div>
      <div class="quick">
        <div v-for="q in discoverQuick" :key="q.key" class="quick__item" @click="onQuick(q)">
          <div class="quick__icon">{{ q.icon }}</div>
          <div class="quick__label">{{ q.label }}</div>
        </div>
      </div>
    </template>

    <!-- 车型筛选：三个 tab 各自标签（推荐=全部/动态=最新/广场=P1-P6，与设计稿一致） -->
    <div class="filter">
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
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m11 12 4 4 4-4"/><path d="M15 20V4"/></svg>
      </span>
    </div>

    <!-- 推荐：双列网格 -->
    <div v-if="activeTab === '推荐'" class="content">
      <div class="grid2">
        <FeedCard v-for="it in filteredFeed" :key="it.id" :item="it" />
      </div>
    </div>

    <!-- 动态：双列网格 -->
    <div v-else-if="activeTab === '动态'" class="content">
      <div class="grid2">
        <FeedCard v-for="it in filteredFeed" :key="it.id" :item="it" />
      </div>
    </div>

    <!-- 广场：车型展示 + 热门活动 -->
    <div v-else-if="activeTab === '广场'" class="content">
      <div class="grid3">
        <div
          v-for="p in filteredShowcase"
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import FeedCard from '../components/FeedCard.vue'
import {
  discoverTabs,
  discoverQuick,
  recommendFilters,
  dynamicFilters,
  plazaFilters,
  feedItems,
  plazaShowcase,
  activities,
} from '../data/mock'
import bridge from '../bridge'

const router = useRouter()
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
const filteredFeed = computed(() => {
  const f = activeFilter.value
  if (f === '全部' || f === '最新') return feedItems
  return feedItems.filter((i) => i.filter === f)
})
const filteredShowcase = computed(() =>
  plazaShowcase.filter((p) => p.id === activeFilter.value)
)

function setTab(t) {
  activeTab.value = t
  activeFilter.value = defaultsByTab[t]
}

function onAdd() { bridge.call('openNative', { target: 'discover.publish' }) }
function onNotice() { router.push('/message') }
function onQuick(q) { console.log('quick tap:', q.key) }
function onSort() { console.log('sort tap') }
function onShowcase(p) { console.log('showcase tap:', p.id) }
function onMoreActivity() { console.log('more activity') }
function onActivity(a) { console.log('activity tap:', a.id) }
</script>

<style scoped>
.discover {
  min-height: 100vh;
  background: #ffffff;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  background: #ffffff;
}
.tabs {
  display: flex;
  gap: 18px;
}
.tab {
  font-size: 18px;
  color: #666666;
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
  gap: 16px;
  color: #000000;
}
.act {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 22px;
  line-height: 1;
}
.search {
  margin: 6px 12px 0;
  height: 44px;
  background: #f5f5f5;
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
}
.sicon {
  color: #999999;
  display: flex;
  align-items: center;
}
.sinput {
  flex: 1;
  font-size: 14px;
  color: #333333;
  background: transparent;
}
.sinput::placeholder {
  color: #999999;
}
.banner {
  margin: 12px 12px 0;
  border-radius: 12px;
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
  margin: 14px 12px 0;
}
.quick__item {
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  gap: 8px;
}
.quick__icon {
  width: 28px;
  height: 28px;
  font-size: 22px;
  line-height: 28px;
  text-align: center;
}
.quick__label {
  font-size: 13px;
  color: #333333;
}
.filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 12px 0;
}
.chips {
  display: flex;
  gap: 20px;
}
.chip {
  font-size: 15px;
  color: #666666;
  line-height: 1.2;
}
.chip.active {
  color: var(--brand);
  font-weight: 700;
}
.sort {
  color: #999999;
  display: flex;
  align-items: center;
}
.content {
  margin-top: 16px;
  padding-bottom: 16px;
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
  border-radius: 12px;
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
  margin: 28px 12px 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
}
.section-more {
  font-size: 13px;
  color: #999999;
}
.acts {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.activity {
  background: #f7f7f7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.act__img {
  width: 104px;
  height: 132px;
  border-radius: 10px;
  object-fit: cover;
  flex: none;
}
.act__info {
  flex: 1;
  min-width: 0;
}
.act__title {
  font-size: 14px;
  color: #333333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.act__date {
  font-size: 12px;
  color: #999999;
  margin-top: 6px;
}
.act__btn {
  flex: none;
  background: #333333;
  color: #ffffff;
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 12px;
}
</style>