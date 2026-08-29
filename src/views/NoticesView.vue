<template>
  <div class="notices">
    <TopBar :title="t('notice.title')" :back="goBack" />

    <!-- 召回强提醒横幅：存在未确认召回公告时置顶 -->
    <div v-if="recallOpen" class="recall-bar press" @click="toDetail(recallOpen.id)">
      <span class="rb-tag">{{ t('notice.recallTag') }}</span>
      <span class="rb-text">{{ t('notice.recallText') }}</span>
      <span class="rb-arrow">&gt;</span>
    </div>

    <!-- 大图卡片列表 -->
    <div class="list">
      <div
        v-for="n in list"
        :key="n.id"
        class="card press"
        :class="{ unread: !n.isRead }"
        @click="toDetail(n.id)"
      >
        <!-- 渐变封面（按公告类型着色，无需外链图，不破图） -->
        <div class="cover" :style="{ background: coverBg(n.type) }">
          <span class="cover__type">{{ typeLabel(n.type) }}</span>
          <span class="cover__date">{{ (n.publishTime || '').slice(0, 10) }}</span>
          <span class="cover__icon" v-html="coverIcon(n.type)"></span>
        </div>
        <!-- 白色内容区 -->
        <div class="main">
          <div class="tt">{{ n.title }}</div>
          <div class="summary">{{ n.summary }}</div>
          <div class="meta">
            <span class="publisher">{{ n.publisher }}</span>
            <span class="views">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              {{ n.views || 0 }}
            </span>
          </div>
        </div>
        <span v-if="!n.isRead" class="dot"></span>
      </div>
    </div>

    <div v-if="!list.length" class="empty">{{ t('notice.empty') }}</div>
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

const TYPE_META = {
  recall: { label: '召回升级', c1: '#FF4D4F', c2: '#FF7A45', icon: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' },
  version: { label: '版本更新', c1: '#4A6CF7', c2: '#6E8BFF', icon: 'M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m10.14 0-2.83-2.83M9.76 9.76 6.93 6.93' },
  activity: { label: '活动优惠', c1: '#FA8C16', c2: '#FFA940', icon: 'M20 12V8H4v12h16v-4M2 8l10-6 10 6M12 12v.01' },
  safety: { label: '安全提醒', c1: '#52C41A', c2: '#73D13D', icon: 'M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z' },
  maintain: { label: '保养维护', c1: '#722ED1', c2: '#9254DE', icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.2-2.2 2.6-2.6Z' },
}

function typeLabel(type) {
  return (TYPE_META[type] && TYPE_META[type].label) || t('notice.type.default')
}
function coverBg(type) {
  const m = TYPE_META[type] || TYPE_META.version
  return `linear-gradient(135deg, ${m.c1} 0%, ${m.c2} 100%)`
}
function coverIcon(type) {
  const m = TYPE_META[type] || TYPE_META.version
  return `<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${m.icon}"/></svg>`
}

function toDetail(id) {
  router.push('/notice/' + id)
}

// 返回对接：原生「我的」消息入口用 WebView 打开，需主动关闭回「我的」；浏览器预览退回 router.back()
function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') app.postMessage('closeWebView')
  else router.back()
}
</script>

<style scoped>
.notices {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.recall-bar {
  margin: 12px 12px 0;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: var(--radius, 12px);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.rb-tag {
  flex: none;
  background: var(--price, #e53e3e);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}
.rb-text { flex: 1; font-size: 13px; color: #cf1322; }
.rb-arrow { color: #cf1322; font-size: 14px; }

.list { padding: 12px; }
.card {
  position: relative;
  background: var(--card, #fff);
  border-radius: var(--radius-xl, 18px);
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
.cover {
  position: relative;
  height: 132px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cover__type {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
  padding: 4px 10px;
  border-radius: 20px;
  backdrop-filter: blur(2px);
}
.cover__date {
  align-self: flex-start;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
  font-variant-numeric: tabular-nums;
}
.cover__icon {
  position: absolute;
  right: 14px;
  bottom: 10px;
  opacity: 0.85;
}
.main { padding: 14px 16px 16px; }
.tt {
  font-size: 16px;
  font-weight: 700;
  color: var(--text, #1a1a1a);
  line-height: 1.4;
}
.card.unread .tt { color: var(--brand, #4a6cf7); }
.summary {
  font-size: 13px;
  color: var(--text-sub, #666);
  margin-top: 8px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-hint, #999);
}
.publisher {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
.views { display: inline-flex; align-items: center; gap: 3px; }
.dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--brand, #4a6cf7);
}

.empty {
  text-align: center;
  padding: 80px 20px;
  font-size: 14px;
  color: var(--text-hint, #999);
}
</style>
