<template>
  <div class="page">
    <!-- 顶部：常见问题 + 筛选 -->
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="title">常见问题</span>
      <span class="filter-btn" @click="goFilter">
        <span class="filter-label">筛选</span>
        <span v-if="activeTagCount > 0" class="filter-badge">{{ activeTagCount }}</span>
      </span>
    </div>

    <!-- 搜索框 -->
    <div class="search">
      <span class="sicon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </span>
      <input v-model="keyword" class="sinput" placeholder="搜索内容/活动/车型" />
    </div>

    <!-- 列表：每条 Q+A 独立卡片 -->
    <div class="list">
      <div v-for="f in filteredFaqs" :key="f.id" class="card" @click="go(f)">
        <div class="q-row">
          <span class="q">Q</span>
          <span class="q-txt">{{ f.q }}</span>
        </div>
        <div class="a-row">{{ f.a }}</div>
      </div>
      <div v-if="filteredFaqs.length === 0" class="empty">暂无匹配问题</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { faqs } from '../data/mock'

const router = useRouter()
const route = useRoute()
const keyword = ref('')

const activeTags = computed(() => {
  const t = route.query.tags
  if (!t) return []
  return String(t).split(',').filter(Boolean)
})
const activeTagCount = computed(() => activeTags.value.length)

const filteredFaqs = computed(() => {
  let arr = faqs
  if (activeTags.value.length > 0) {
    arr = arr.filter((f) => f.tags && f.tags.some((t) => activeTags.value.includes(t)))
  }
  const kw = keyword.value.trim()
  if (kw) {
    arr = arr.filter((f) => f.q.includes(kw) || f.a.includes(kw))
  }
  return arr
})

function go(f) {
  router.push('/service/faq/' + f.id)
}
function goFilter() {
  const q = activeTags.value.length ? `?selected=${activeTags.value.join(',')}` : ''
  router.push('/service/faq/filter' + q)
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #ffffff;
}
.back { position: absolute; left: 12px; display: flex; color: #333; }
.title { font-size: 17px; font-weight: 600; color: #333; }
.filter-btn {
  position: absolute;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #333;
}
.filter-badge {
  background: #333;
  color: #ffffff;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

.search {
  margin: 8px 12px 12px;
  height: 40px;
  background: #ffffff;
  border-radius: var(--radius-xxl);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
}
.sicon { color: #999; display: flex; }
.sinput { flex: 1; font-size: 14px; color: #333; background: transparent; }
.sinput::placeholder { color: #999; }

.list {
  padding: 0 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card {
  background: #ffffff;
  border-radius: var(--radius);
  padding: 14px;
}
.q-row { display: flex; align-items: center; gap: 10px; }
.q {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #eaf2ff;
  color: var(--brand-light);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.q-txt { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.a-row {
  margin-top: 8px;
  margin-left: 28px;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card:active { background: #fafafa; }
.empty { text-align: center; color: #999; padding: 32px 0; font-size: 13px; }
</style>