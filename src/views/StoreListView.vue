<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">附近门店</span>
      <span class="search-icon" @click="showSearch = !showSearch">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
    </div>

    <!-- 搜索 + 排序 -->
    <div v-if="showSearch" class="bar">
      <div class="search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input v-model="kw" placeholder="搜索门店名称 / 地址" />
      </div>
      <div class="sort">
        <span :class="{ on: sort === 'dist' }" @click="sort = 'dist'">距离最近</span>
        <span :class="{ on: sort === 'rate' }" @click="sort = 'rate'">评分最高</span>
      </div>
    </div>

    <!-- 门店列表 -->
    <div class="list">
      <StoreCard v-for="(s, i) in list" :key="s.name" :store="s" :tag="i === 0 ? '购车门店' : ''" />
      <div v-if="list.length === 0" class="empty">未找到匹配的门店</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import StoreCard from '../components/StoreCard.vue'
import { stores } from '../data/mock'

const router = useRouter()
const kw = ref('')
const sort = ref('dist')
const showSearch = ref(false)

const list = computed(() => {
  let arr = stores
  const k = kw.value.trim()
  if (k) arr = arr.filter((s) => (s.name + s.address).includes(k))
  arr = [...arr]
  if (sort.value === 'dist') {
    arr.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
  } else {
    arr.sort((a, b) => b.rating - a.rating)
  }
  return arr
})
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--card);
  border-bottom: 1px solid var(--line);
}
.back { position: absolute; left: 12px; display: flex; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.search-icon { position: absolute; right: 14px; display: flex; color: var(--text); }

.bar {
  background: var(--card);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--line);
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border-radius: var(--radius-xxl);
  padding: 9px 14px;
}
.search svg { color: var(--text-hint); }
.search input { flex: 1; font-size: 14px; color: var(--text); background: transparent; }
.search input::placeholder { color: var(--text-hint); }
.sort { display: flex; gap: 8px; }
.sort span {
  font-size: 12px;
  color: var(--text-sub);
  padding: 5px 12px;
  border-radius: 14px;
  background: var(--bg);
}
.sort span.on {
  color: #fff;
  background: var(--brand-gradient);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0 16px;
}
.empty {
  text-align: center;
  color: var(--text-hint);
  font-size: 13px;
  padding: 40px 0;
}
</style>
