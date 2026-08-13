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
          >{{ t.label }}<i v-if="t.en" class="en">{{ t.en }}</i></span
        >
      </div>
      <span class="search-ico">🔍</span>
    </div>

    <!-- 推荐 -->
    <template v-if="activeTab === 'rec'">
      <!-- Banner -->
      <div class="banner">
        <div class="banner__txt">
          <div class="b-title">{{ banner.title }}</div>
          <div class="b-sub">{{ banner.sub }}</div>
        </div>
        <div class="banner__emoji">{{ banner.cover }}</div>
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

const router = useRouter()

const topTabs = [
  { key: 'rec', label: '推荐' },
  { key: 'spring', label: '踏春装备' },
  { key: 'bikes', label: 'Bikes', en: 'Bikes' },
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
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}
.tabs {
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.tab {
  font-size: 17px;
  font-weight: 700;
  color: #999999;
  line-height: 1.2;
}
.tab.active {
  color: #111111;
}
.tab .en {
  font-size: 12px;
  font-weight: 400;
  font-style: normal;
  color: var(--text-sub);
  margin-left: 2px;
}
.search-ico {
  font-size: 18px;
}
.banner {
  margin: 0 12px 12px;
  border-radius: var(--radius-lg);
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
.banner__emoji {
  font-size: 46px;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px 12px;
}
</style>
