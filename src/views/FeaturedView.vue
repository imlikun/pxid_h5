<template>
  <div class="featured">
    <!-- 顶部：三 tab + 搜索 -->
    <div class="topbar">
      <div class="tabs">
        <span
          v-for="t in topTabs"
          :key="t.key"
          class="tab"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
          >{{ t.label }}</span
        >
      </div>
      <span class="search-ico">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
    </div>

    <!-- 搜索框（与发现一致） -->
    <div class="search">
      <span class="sicon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input class="sinput" placeholder="搜索内容/活动/车型" />
    </div>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec'">
      <!-- Banner -->
      <div class="banner">
        <div class="banner__txt">
          <div class="b-title">{{ banner.title }}</div>
          <div class="b-sub">{{ banner.sub }}</div>
        </div>
        <IconSvg :name="banner.cover" :size="46" class="banner__icon" />
      </div>

      <!-- 三个快捷 -->
      <QuickActions :items="featuredQuick" @tap="onQuick" />

      <!-- 热购榜单 -->
      <SectionHeader title="热购榜单" />
      <div class="grid2">
        <ProductCard v-for="p in hotProducts" :key="p.id" :product="p" />
      </div>

      <!-- 踏春装备 | 限时直降 -->
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" @more="activeTab = 'spring'" />
      <div class="grid2">
        <ProductCard v-for="p in springProducts" :key="p.id" :product="p" />
      </div>
    </template>

    <!-- 踏春装备 -->
    <template v-else-if="activeTab === 'spring'">
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" />
      <div class="grid2">
        <ProductCard v-for="p in springProducts" :key="p.id" :product="p" />
      </div>
    </template>

    <!-- Bikes -->
    <template v-else>
      <SectionHeader title="Bikes" sub="车型原厂配件" />
      <div class="grid2">
        <ProductCard v-for="p in bikeProducts" :key="p.id" :product="p" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import QuickActions from '../components/QuickActions.vue'
import SectionHeader from '../components/SectionHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import { featuredBanner, featuredQuick, products } from '../data/mock'
import IconSvg from '../components/IconSvg.vue'

const router = useRouter()

const topTabs = [
  { key: 'rec', label: '推荐' },
  { key: 'spring', label: '踏春装备' },
  { key: 'bikes', label: 'Bikes' },
]
const activeTab = ref('rec')

const banner = featuredBanner
const hotProducts = computed(() => products.slice(0, 4))
const springProducts = computed(() => products.filter((p) => p.collection === 'spring'))
const bikeProducts = computed(() => products.filter((p) => p.collection === 'p1parts'))

function onQuick(q) {
  if (q.key === 'hot') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (q.key === 'new') {
    activeTab.value = 'spring'
  } else if (q.key === 'points') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<style scoped>
.featured {
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
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
}
.tabs {
  display: flex;
  align-items: center;
  gap: 18px;
}
.tab {
  font-size: 18px;
  font-weight: 400;
  color: #666666;
  line-height: 1.2;
}
.tab.active {
  color: #000000;
  font-weight: 700;
}
.search-ico {
  color: #000000;
  display: flex;
  align-items: center;
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
  background: linear-gradient(120deg, #1f6fff, #4f9bff);
  color: #fff;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.b-title {
  font-size: 17px;
  font-weight: 700;
}
.b-sub {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
}
.banner__icon {
  color: var(--brand);
  flex: none;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px 12px;
}
</style>
