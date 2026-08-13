<template>
  <div class="featured">
    <!-- 顶部标题 + 搜索 -->
    <div class="topbar">
      <div class="title">推荐 踏春装备 <span class="bikes">Bikes</span></div>
      <span class="search-ico">🔍</span>
    </div>

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

    <!-- 子集合筛选 -->
    <div class="filter">
      <div class="chips">
        <span
          v-for="c in chips"
          :key="c.key"
          class="chip"
          :class="{ active: activeKey === c.key }"
          @click="activeKey = c.key"
          >{{ c.label }}</span
        >
      </div>
    </div>

    <!-- 商品网格 -->
    <SectionHeader title="踏春装备" sub="限时直降" more="更多" />
    <div class="grid2">
      <ProductCard
        v-for="p in filteredProducts"
        :key="p.id"
        :product="p"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import QuickActions from '../components/QuickActions.vue'
import SectionHeader from '../components/SectionHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import { featuredBanner, featuredQuick, collections, products } from '../data/mock'

const banner = featuredBanner

const chips = [
  { key: 'all', label: '全部' },
  ...collections.map((c) => ({ key: c.id, label: c.title })),
]
const activeKey = ref('all')

const filteredProducts = computed(() =>
  activeKey.value === 'all'
    ? products
    : products.filter((p) => p.collection === activeKey.value)
)

function onQuick(q) {
  console.log('featured quick:', q.key)
}
</script>

<style scoped>
.featured {
  padding-top: env(safe-area-inset-top);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
}
.title {
  font-size: 17px;
  font-weight: 700;
}
.bikes {
  color: var(--text-sub);
  font-weight: 400;
  font-size: 14px;
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
.filter {
  display: flex;
  padding: 4px 12px 8px;
}
.chips {
  display: flex;
  gap: 8px;
}
.chip {
  font-size: 12px;
  color: var(--text-sub);
  background: #fff;
  border-radius: 14px;
  padding: 5px 12px;
}
.chip.active {
  color: var(--brand);
  background: var(--brand-soft);
  font-weight: 600;
}
</style>
