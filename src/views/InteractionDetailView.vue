<template>
  <div class="idetail">
    <TopBar sticky :title="t('interaction.detailTitle')" :back="goBack" />

    <div v-if="loading" class="state">{{ t('interaction.loading') }}</div>

    <div v-else-if="!item" class="state">
      <svg viewBox="0 0 48 48" width="46" height="46" fill="none" stroke="var(--text-hint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><path d="M16 24h16"/></svg>
      <p>{{ t('interaction.notFound') }}</p>
      <button class="back-btn press" @click="goBack">{{ t('feed.back') }}</button>
    </div>

    <div v-else class="body">
      <!-- 对方信息 -->
      <div class="actor">
        <div class="avatar">
          <img v-if="item.actorAvatar" :src="resolveAvatar(item.actorName, item.actorAvatar)" alt="" @error="(e) => handleAvatarError(e, item.actorName)" />
          <span v-else class="avatar__ph">{{ avatarText(item) }}</span>
        </div>
        <div class="who">
          <div class="name">{{ item.actorName || t('interaction.action.system') }}</div>
          <div class="time">{{ formatDateTime(item.createdAt) }}</div>
        </div>
        <span class="badge" :class="'badge--' + item.type">{{ typeLabel(item.type) }}</span>
      </div>

      <!-- 动作描述 -->
      <div class="action">{{ actionText(item) }}</div>

      <!-- 对方发来的内容（评论正文 / 系统消息） -->
      <div v-if="item.content" class="bubble">
        <span class="bubble__mark">“</span><span class="bubble__text">{{ item.content }}</span>
      </div>

      <!-- 关联原动态预览 -->
      <div
        v-if="item.targetType === 'feed' && item.targetId"
        class="relcard press"
        @click="router.push('/feed/' + item.targetId)"
      >
        <img v-if="relCover" class="relcard__cover" :src="relCover" alt="" @error="relCover = ''" />
        <div v-else class="relcard__cover relcard__ph">PXID</div>
        <div class="relcard__info">
          <div class="relcard__label">{{ t('interaction.relatedPost') }}</div>
          <div class="relcard__title">{{ rel.title || ('#' + item.targetId) }}</div>
          <div v-if="rel.author" class="relcard__author">{{ rel.author }}</div>
        </div>
        <span class="relcard__arrow">&gt;</span>
      </div>

      <!-- 关注：去对方主页 -->
      <button
        v-if="item.type === 'follow' && item.actorDevice"
        class="cta press"
        @click="router.push('/user/' + encodeURIComponent(item.actorDevice))"
      >{{ t('interaction.goProfile') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { t } from '../i18n'
import { getNotification, cacheNotifications } from '../store/notificationStore'
import { fetchNotifications } from '../api/notifications'
import { fetchFeedDetail } from '../api/feed'
import { resolveAvatar, handleAvatarError } from '../utils/avatar'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))

const item = ref(getNotification(id.value))
const loading = ref(!item.value)
const rel = ref({})
const relCover = ref('')

const TYPE_LABEL = { like: '赞', comment: '评论', follow: '关注', favorite: '收藏', reply: '评论' }
function typeLabel(type) {
  return TYPE_LABEL[type] || type
}
function actionText(n) {
  if (n.type === 'like') return t('interaction.action.like')
  if (n.type === 'comment') return t('interaction.action.comment')
  if (n.type === 'reply') return t('interaction.action.reply')
  if (n.type === 'follow') return t('interaction.action.follow')
  if (n.type === 'favorite') return t('interaction.action.favorite')
  return t('interaction.action.system')
}
function avatarText(n) {
  if (n.actorName) return n.actorName.slice(0, 1).toUpperCase()
  return { like: '♥', comment: '💬', follow: '＋', favorite: '★', reply: '↩' }[n.type] || '!'
}
// 时间线样式：08/27 17:12
function formatDateTime(s) {
  if (!s) return ''
  const d = new Date(String(s).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(s).slice(0, 16)
  const pad = (x) => String(x).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadRel() {
  const it = item.value
  if (it && it.targetType === 'feed' && it.targetId) {
    const f = await fetchFeedDetail(it.targetId).catch(() => null)
    if (f) {
      rel.value = f
      relCover.value = f.cover || (Array.isArray(f.images) && f.images[0]) || ''
    }
  }
}

onMounted(async () => {
  if (!item.value) {
    // 深链/缓存未命中：拉取列表定位该条（演示环境单页可达百条）
    try {
      const r = await fetchNotifications(1, 200)
      cacheNotifications(r.list)
      item.value = getNotification(id.value) || null
    } catch (e) {
      item.value = null
    }
    loading.value = false
  }
  loadRel()
})

function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') app.postMessage('closeWebView')
  else if (window.history.length > 1) router.back()
  else router.push('/interactions')
}
</script>

<style scoped>
.idetail {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}
:deep(.tb-bar) { background: var(--card, #fff); }

.state {
  text-align: center;
  padding: 80px 24px;
  color: var(--text-hint);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.state p { font-size: 14px; margin: 0; }
.back-btn {
  margin-top: 8px;
  padding: 10px 28px;
  border: none;
  border-radius: 22px;
  background: var(--brand, #4a6cf7);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.body { padding: 16px; }

/* 对方信息 */
.actor {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card, #fff);
  border-radius: var(--radius-xl, 18px);
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.avatar {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #ebedf2;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar__ph {
  font-size: 17px;
  font-weight: 700;
  color: var(--brand, #4a6cf7);
}
.who { flex: 1; min-width: 0; }
.name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text, #1a1a1a);
}
.time {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 3px;
}
.badge {
  flex: none;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  color: #fff;
}
.badge--like { background: #F43F5E; }
.badge--comment { background: #4A6CF7; }
.badge--follow { background: #22C55E; }
.badge--system { background: #9CA3AF; }

/* 动作描述 */
.action {
  margin: 16px 4px 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
}

/* 对方发来的内容气泡 */
.bubble {
  position: relative;
  background: var(--card, #fff);
  border-radius: var(--radius-xl, 18px);
  padding: 16px 16px 16px 20px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--text, #1a1a1a);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  word-break: break-word;
}
.bubble__mark {
  color: var(--brand, #4a6cf7);
  font-size: 20px;
  font-weight: 700;
  margin-right: 2px;
}

/* 关联原动态预览 */
.relcard {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  background: var(--card, #fff);
  border-radius: var(--radius-xl, 18px);
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.relcard__cover {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  flex: none;
  background: linear-gradient(135deg, #eef1f6, #dfe4ee);
}
.relcard__ph {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
}
.relcard__info { flex: 1; min-width: 0; }
.relcard__label {
  font-size: 11px;
  color: var(--text-hint);
  margin-bottom: 3px;
}
.relcard__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.relcard__author {
  font-size: 12px;
  color: var(--text-hint);
  margin-top: 4px;
}
.relcard__arrow {
  flex: none;
  color: var(--text-hint);
  font-size: 16px;
}

/* 关注 CTA */
.cta {
  width: 100%;
  margin-top: 16px;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: var(--brand, #4a6cf7);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
