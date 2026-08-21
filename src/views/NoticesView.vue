<template>
  <div class="notices">
    <TopBar :title="t('notice.title')" :back="goBack" />

    <!-- 召回强提醒横幅：存在未确认召回公告时置顶 -->
    <div v-if="recallOpen" class="recall-bar" @click="toDetail(recallOpen.id)">
      <span class="rb-tag">{{ t('notice.recallTag') }}</span>
      <span class="rb-text">{{ t('notice.recallText') }}</span>
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
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'

const router = useRouter()

// 每次进入重新读取（含详情页确认后的最新 isRead）
const list = reactive(notices.map((n) => ({ ...n })))

const recallOpen = computed(() => list.find((n) => n.type === 'recall' && !n.isRead) || null)

function typeLabel(type) {
  return {
    recall: t('notice.type.recall'),
    version: t('notice.type.version'),
    activity: t('notice.type.activity'),
    safety: t('notice.type.safety'),
    maintain: t('notice.type.maintain'),
  }[type] || t('notice.type.default')
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
  padding-bottom: env(safe-area-inset-bottom);
}

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
