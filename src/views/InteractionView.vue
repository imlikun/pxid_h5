<template>
  <div class="interaction">
    <TopBar sticky :title="t('interaction.title')" :back="goBack">
      <template #right>
        <span class="markall press" @click="onMarkAll">{{ t('interaction.markAll') }}</span>
      </template>
    </TopBar>

    <!-- 分类 -->
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
      <div v-if="!filtered.length" class="empty">{{ t('interaction.empty') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
</script>

<style scoped>
.interaction {
  min-height: 100vh;
  background: var(--bg);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.markall {
  font-size: 13px;
  color: var(--brand);
}
.tabs {
  display: flex;
  gap: 8px;
  padding: 12px 12px 4px;
  overflow-x: auto;
}
.tab {
  flex: none;
  font-size: 13px;
  color: var(--text-sub);
  padding: 6px 14px;
  border-radius: 16px;
  background: #f2f2f4;
  line-height: 1;
}
.tab.active {
  color: #fff;
  background: #1a1a1a;
  font-weight: 600;
}
.list {
  padding: 0 12px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  position: relative;
}
.item.unread {
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.03), transparent 60%);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ececec;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  overflow: hidden;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar__ph {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-sub);
}
.body {
  flex: 1;
  min-width: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.actor {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.time {
  font-size: 12px;
  color: var(--text-hint);
}
.content {
  font-size: 14px;
  color: var(--text-sub);
  margin-top: 3px;
}
.dot {
  position: absolute;
  top: 18px;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--price);
}
.empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-hint);
  font-size: 14px;
}
</style>
