<template>
  <div class="interaction">
    <TopBar sticky :title="t('interaction.title')" :back="goBack">
      <template #right>
        <span class="markall press" @click="onMarkAll">{{ t('interaction.markAll') }}</span>
      </template>
    </TopBar>

    <!-- 分类 tabs -->
    <div class="tabs">
      <span
        v-for="c in tabs"
        :key="c.key"
        class="tab"
        :class="{ active: activeCat === c.key }"
        @click="activeCat = c.key"
        >{{ t('interaction.tab.' + c.key) }}</span
      >
    </div>

    <!-- 列表 -->
    <div class="list">
      <div
        v-for="n in filtered"
        :key="n.id"
        class="item"
        :class="{ unread: !n.read }"
        @click="onTap(n)"
      >
        <div class="avatar">
          <img v-if="n.actorAvatar" :src="n.actorAvatar" alt="" />
          <span v-else class="avatar__ph">{{ avatarText(n) }}</span>
        </div>
        <div class="body">
          <div class="row">
            <span class="actor">{{ n.actorName || t('interaction.tab.system') }}</span>
            <span class="time">{{ n.createdAt }}</span>
          </div>
          <div class="content">{{ n.content }}</div>
        </div>
        <span v-if="!n.read" class="dot"></span>
      </div>
      <div v-if="!filtered.length && !loading" class="empty">
        <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="var(--text-hint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 42H14a4 4 0 01-4-4V18l14-10 14 10v20a4 4 0 01-4 4z"/><path d="M10 18l14-10 14 10"/><path d="M20 42v-12h8v12"/></svg>
        <p>{{ t('interaction.empty') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { t } from '../i18n'
import { fetchNotifications, markNotificationRead, markAllRead } from '../api/notifications'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const activeCat = ref('all')

const tabs = [
  { key: 'all' },
  { key: 'like' },
  { key: 'comment' },
  { key: 'follow' },
  { key: 'system' },
]

const filtered = computed(() => {
  if (activeCat.value === 'all') return list.value
  return list.value.filter((n) => n.type === activeCat.value)
})

function avatarText(n) {
  if (n.actorName) return n.actorName.slice(0, 1).toUpperCase()
  return { like: '♥', comment: '💬', follow: '＋', system: '!' }[n.type] || '!'
}

function goBack() {
  router.back()
}

async function load() {
  loading.value = true
  try {
    list.value = await fetchNotifications()
  } finally {
    loading.value = false
  }
}

async function onTap(n) {
  if (!n.read) {
    n.read = true
    await markNotificationRead(n.id)
  }
  // 深度跳转：feed 类点开原文；其余走原生兜底路由（R-未定 path 时回退）
  if (n.targetType === 'feed' && n.targetId) {
    router.push('/feed/' + n.targetId)
  } else {
    // Flutter 原生路由：互动对象为用户时跳用户主页（R2 待定 path，先 console）
    console.log('[interaction] tap type=', n.type, 'target=', n.targetType, n.targetId)
  }
}

async function onMarkAll() {
  list.value.forEach((n) => (n.read = true))
  await markAllRead()
}

onMounted(load)
// App.vue 用 <keep-alive> 缓存全部页面：再次进入（如新产生通知）时重新拉列表
onActivated(load)
</script>

<style scoped>
.interaction {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}
.markall {
  font-size: 13px;
  color: var(--brand, #4A6CF7);
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: opacity 0.15s;
}
.markall:active { opacity: 0.6; }

/* ---- 分类 tabs ---- */
.tabs {
  display: flex;
  gap: 8px;
  padding: 12px 14px 8px;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--bg, #f7f8fa);
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  flex: none;
  font-size: 13px;
  color: var(--text-sub);
  padding: 7px 16px;
  border-radius: 20px;
  background: #fff;
  line-height: 1;
  border: 1px solid var(--line, #e8e8ea);
  transition: all 0.2s ease;
  font-weight: 500;
}
.tab.active {
  color: #fff;
  background: var(--brand, #4A6CF7);
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(74, 108, 247, 0.25);
}

/* ---- 列表 ---- */
.list {
  padding: 4px 14px 0;
  background: #fff;
  min-height: calc(100vh - 120px);
  border-radius: 16px 16px 0 0;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 4px;
  border-bottom: 0.5px solid var(--line, #f0f0f2);
  position: relative;
  transition: background 0.15s;
}
.item:active { background: rgba(0, 0, 0, 0.02); }
.item.unread {
  background: linear-gradient(90deg, rgba(74, 108, 247, 0.05), transparent 70%);
}
.item.unread .actor {
  font-weight: 800;
}
.item.unread .content {
  color: var(--text);
  font-weight: 500;
}

/* ---- 头像 ---- */
.avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8ecf4 0%, #dfe3ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar__ph {
  font-size: 17px;
  font-weight: 700;
  color: var(--brand, #4A6CF7);
  letter-spacing: -0.5px;
}

/* ---- 内容区 ---- */
.body {
  flex: 1;
  min-width: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.actor {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.time {
  font-size: 12px;
  color: var(--text-hint);
  white-space: nowrap;
  flex-shrink: 0;
}
.content {
  font-size: 14px;
  color: var(--text-sub);
  margin-top: 4px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- 未读红点 ---- */
.dot {
  position: absolute;
  top: 18px;
  right: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--price, #E53E3E);
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(229, 62, 62, 0.35);
  animation: dot-pulse 2s ease infinite;
}
@keyframes dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}

/* ---- 空状态 ---- */
.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-hint);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty p {
  font-size: 14px;
  margin: 0;
}
</style>
