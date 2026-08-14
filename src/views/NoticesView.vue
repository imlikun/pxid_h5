<template>
  <div class="notices">
    <div class="nav">
      <span class="back" @click="goBack">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="title">官方公告</span>
      <span class="right"></span>
    </div>

    <!-- 召回强提醒横幅：存在未确认召回公告时置顶 -->
    <div v-if="recallOpen" class="recall-bar" @click="toDetail(recallOpen.id)">
      <span class="rb-tag">召回</span>
      <span class="rb-text">您有一条车辆召回通知待确认，点击查看</span>
      <span class="rb-arrow">&gt;</span>
    </div>

    <div class="list">
      <div
        v-for="n in list"
        :key="n.id"
        class="row"
        :class="{ unread: !n.isRead }"
        @click="toDetail(n.id)"
      >
        <span v-if="!n.isRead" class="dot"></span>
        <span v-else class="dot dot--empty"></span>
        <div class="main">
          <div class="line1">
            <span class="tag" :class="'tag--' + n.type">{{ typeLabel(n.type) }}</span>
            <span class="tt">{{ n.title }}</span>
          </div>
          <div class="line2">{{ n.publisher }} · {{ n.publishTime }}</div>
        </div>
        <span class="arrow">&gt;</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { notices } from '../data/mock'

const router = useRouter()

// 每次进入重新读取（含详情页确认后的最新 isRead）
const list = reactive(notices.map((n) => ({ ...n })))

const recallOpen = computed(() => list.find((n) => n.type === 'recall' && !n.isRead) || null)

function typeLabel(t) {
  return { recall: '召回', version: '版本', activity: '活动', safety: '安全', maintain: '维护' }[t] || '公告'
}
function toDetail(id) {
  router.push('/notice/' + id)
}
function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}
</script>

<style scoped>
.notices {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #ffffff;
  position: relative;
}
.back { display: flex; align-items: center; color: var(--text); }
.title { font-size: 17px; font-weight: 600; color: var(--text); }
.right { width: 24px; }

.recall-bar {
  margin: 12px;
  background: #FFF1F0;
  border: 1px solid #FFCCC7;
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.rb-tag {
  flex: none;
  background: var(--price);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}
.rb-text { flex: 1; font-size: 13px; color: #CF1322; }
.rb-arrow { color: #CF1322; font-size: 14px; }

.list { padding: 0 12px; }
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card);
  border-radius: var(--radius);
  padding: 14px 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--brand);
  flex: none;
}
.dot--empty { background: transparent; }
.main { flex: 1; min-width: 0; }
.line1 { display: flex; align-items: center; gap: 8px; }
.tag {
  flex: none;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
}
.tag--recall { background: var(--price); }
.tag--version { background: var(--brand); }
.tag--activity { background: #FA8C16; }
.tag--safety { background: #52C41A; }
.tag--maintain { background: #722ED1; }
.tt {
  font-size: 14px;
  color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row.unread .tt { font-weight: 700; }
.line2 { font-size: 12px; color: var(--text-hint); margin-top: 6px; }
.arrow { color: var(--text-hint); font-size: 14px; }
</style>
