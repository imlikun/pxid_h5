<template>
  <div class="page">
    <!-- 顶部：× + 标题"问题筛选" -->
    <div class="nav">
      <span class="close" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </span>
      <span class="title">问题筛选</span>
      <span class="placeholder"></span>
    </div>

    <!-- 分组 + 标签 -->
    <div class="content">
      <div v-for="g in faqCategories" :key="g.group" class="group">
        <div class="group-title">{{ g.group }}</div>
        <div class="tags">
          <span
            v-for="t in g.items"
            :key="t.key"
            class="tag"
            :class="{ active: selected.has(t.key) }"
            @click="toggle(t.key)"
          >{{ t.label }}</span>
        </div>
      </div>
    </div>

    <!-- 底部：重置 + 完成 -->
    <div class="footer">
      <button class="btn-reset" @click="reset">重置</button>
      <button class="btn-confirm" @click="confirm">完成</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { faqCategories } from '../data/mock'

const router = useRouter()
const route = useRoute()
const selected = reactive(new Set())

onMounted(() => {
  const t = route.query.selected
  if (t) String(t).split(',').filter(Boolean).forEach((k) => selected.add(k))
})

function toggle(k) {
  if (selected.has(k)) selected.delete(k)
  else selected.add(k)
}
function reset() {
  selected.clear()
}
function confirm() {
  const qs = Array.from(selected).join(',')
  router.replace({ path: '/service/faq', query: qs ? { tags: qs } : {} })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  position: relative;
  background: #ffffff;
}
.close { display: flex; }
.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: #333;
}
.placeholder { width: 22px; }

.content {
  flex: 1;
  padding: 8px 16px 16px;
  overflow-y: auto;
}
.group { margin-top: 16px; }
.group-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 14px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #ffffff;
  font-size: 14px;
  color: #555;
}
.tag.active {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #ffffff;
  font-weight: 600;
}

.footer {
  display: flex;
  gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #f2f2f2;
}
.btn-reset, .btn-confirm {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
}
.btn-reset {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  color: #333;
}
.btn-confirm {
  background: #1a1a1a;
  color: #ffffff;
  border: none;
}
</style>