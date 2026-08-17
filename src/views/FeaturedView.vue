<template>
  <div class="featured">
    <!-- 顶部：三 tab + 搜索图标 -->
    <div class="topbar">
      <div class="tabs">
        <span
          v-for="t in topTabs"
          :key="t.key"
          class="tab tab-bounce"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
          >{{ t.label }}</span
        >
      </div>
      <span class="search-ico">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
    </div>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec'">
      <!-- Banner -->
      <div class="banner">
        <img class="banner__img" :src="bannerImg" alt="Banner" />
      </div>

      <!-- 三个快捷 -->
      <QuickActions :items="featuredQuick" @tap="onQuick" />

      <!-- 热购榜单 -->
      <SectionHeader title="热购榜单" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in hotProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>

      <!-- 踏春装备 | 限时直降 -->
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" @more="activeTab = 'spring'" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in springProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </template>

    <!-- 踏春装备 -->
    <template v-else-if="activeTab === 'spring'">
      <SectionHeader title="踏春装备" sub="限时直降" more="更多" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in springProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
      </div>
    </template>

    <!-- Bikes -->
    <template v-else>
      <SectionHeader title="Bikes" sub="车型原厂配件" />
      <div class="grid2">
        <ProductCard
          v-for="(p, i) in bikeProducts"
          :key="p.id"
          :product="p"
          :class="['fade-up', 'stagger-' + ((i % 10) + 1)]"
        />
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
import { featuredQuick, products } from '../data/mock'

const router = useRouter()
const bannerImg = import.meta.env.BASE_URL + 'discover-banner.jpg'

const topTabs = [
  { key: 'rec', label: '推荐' },
  { key: 'spring', label: '踏春装备' },
  { key: 'bikes', label: 'Bikes' },
]
const activeTab = ref('rec')

const hotProducts = computed(() => products.slice(0, 4))
const springProducts = computed(() => products.filter((p) => p.collection === 'spring'))
const bikeProducts = computed(() => products.filter((p) => p.collection === 'p1parts'))

function onQuick(q) {
  if (q.key === 'hot') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (q.key === 'new') {
    activeTab.value = 'spring'
  } else if (q.key === 'points') {
    router.push('/points')
  }
}
</script>

<style scoped>
.featured {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
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
  gap: 16px;
}
.tab {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-sub);
  line-height: 1.2;
  transform-origin: bottom center;
  transform: scale(0.96);
}
.tab.active {
  color: var(--text);
  font-weight: 700;
}
.search-ico {
  color: #000000;
  display: flex;
  align-items: center;
}
.banner {
  margin: 12px 12px 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}
.banner__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 12px 16px;
}
</style>
