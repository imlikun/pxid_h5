<template>
  <div class="uprofile">
    <TopBar sticky :title="user ? user.nickname : '个人主页'" :back="goBack" />

    <!-- 用户资料卡 -->
    <div class="u-head">
      <div class="u-avatar">
        <img v-if="user && user.avatar" :src="user.avatar" :alt="user.nickname" @error="(e) => handleAvatarError(e, user.nickname)" />
        <span v-else class="u-avatar__ph">{{ avatarText }}</span>
      </div>
      <div class="u-meta">
        <div class="u-name">
          {{ user ? user.nickname : '…' }}
          <span v-if="user && user.isSelf" class="u-me">我</span>
        </div>
        <div v-if="user && user.carModel" class="u-car">#{{ user.carModel }}</div>
        <div class="u-stats">
          <span class="u-stat"><b>{{ user ? user.followeeCount : 0 }}</b> 关注</span>
          <span class="u-stat"><b>{{ user ? user.followerCount : 0 }}</b> 粉丝</span>
        </div>
      </div>
      <button
        v-if="user && !user.isSelf"
        class="u-follow"
        :class="{ on: user.isFollowing }"
        @click="onToggleFollow"
      >{{ user.isFollowing ? '已关注' : '+ 关注' }}</button>
    </div>

    <!-- 动态流 -->
    <div class="u-sec">
      <div class="u-sec__title">TA 的动态</div>
      <template v-if="feeds.length">
        <MomentCard v-for="it in feeds" :key="it.id" :item="it" />
        <div v-if="loadingMore" class="u-more">加载中…</div>
        <div v-else-if="!hasMore" class="u-more">没有更多了</div>
      </template>
      <div v-else-if="!feedLoading" class="u-empty">暂无动态</div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import MomentCard from '../components/MomentCard.vue'
import { t } from '../i18n'
import { getDeviceId } from '../api/feed'
import { fetchUserProfile, fetchUserFeeds, followUser, unfollowUser } from '../api/feed'
import { handleAvatarError } from '../utils/avatar'

const route = useRoute()
const router = useRouter()

const user = ref(null)
const feeds = ref([])
const feedLoading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const toast = ref('')
let toastTimer = null
const PAGE_SIZE = 15

// /user/me → 用本机设备 ID；/user/:id → 指定设备
const targetDevice = computed(() =>
  route.params.id === 'me' ? getDeviceId() || '' : String(route.params.id || '')
)

const avatarText = computed(() => (user.value && user.value.nickname ? user.value.nickname.slice(0, 1).toUpperCase() : '?'))

function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

async function loadProfile() {
  const d = targetDevice.value
  if (!d) { showToast('无法识别用户'); return }
  user.value = await fetchUserProfile(d)
  if (!user.value) showToast('用户信息加载失败')
}

async function loadFeeds(reset = false) {
  const d = targetDevice.value
  if (!d) return
  if (reset) { page.value = 1; hasMore.value = true }
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const r = await fetchUserFeeds(d, { page: page.value, pageSize: PAGE_SIZE })
    const list = r.list || []
    if (reset) feeds.value = list
    else feeds.value = feeds.value.concat(list)
    hasMore.value = list.length >= PAGE_SIZE && feeds.value.length < (r.total || Infinity)
    page.value += 1
  } finally {
    loadingMore.value = false
    feedLoading.value = false
  }
}

async function onToggleFollow() {
  if (!user.value) return
  const d = user.value.deviceId
  const next = !user.value.isFollowing
  user.value.isFollowing = next
  user.value.followerCount += next ? 1 : -1
  try {
    if (next) await followUser(d)
    else await unfollowUser(d)
  } catch (e) {
    user.value.isFollowing = !next
    user.value.followerCount -= next ? 1 : -1
    showToast('操作失败')
  }
}

function onScroll() {
  if (loadingMore.value || !hasMore.value) return
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) loadFeeds()
}

onMounted(async () => {
  await loadProfile()
  await loadFeeds(true)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.uprofile {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}

/* ---- 资料卡 ---- */
.u-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 16px 18px;
  background: #fff;
}
.u-avatar {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  flex: none;
  background: linear-gradient(135deg, #e8ecf4 0%, #dfe3ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.u-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.u-avatar__ph {
  font-size: 26px;
  font-weight: 700;
  color: var(--brand, #4a6cf7);
}
.u-meta {
  flex: 1;
  min-width: 0;
}
.u-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.u-me {
  font-size: 11px;
  color: var(--brand, #4a6cf7);
  background: var(--brand-soft, rgba(74, 108, 247, 0.1));
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
}
.u-car {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 3px;
}
.u-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-sub);
}
.u-stat b {
  color: var(--text);
  font-size: 15px;
}
.u-follow {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--brand, #4a6cf7);
  border-radius: 20px;
  padding: 8px 20px;
  border: none;
  transition: opacity 0.15s;
}
.u-follow:active { opacity: 0.7; }
.u-follow.on {
  color: var(--text-sub);
  background: #f0f1f3;
}

/* ---- 动态流 ---- */
.u-sec {
  padding-top: 10px;
}
.u-sec__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 6px 16px 10px;
}
.u-more {
  text-align: center;
  padding: 14px 0 22px;
  font-size: 12px;
  color: var(--text-hint);
}
.u-empty {
  text-align: center;
  padding: 60px 20px;
  font-size: 14px;
  color: var(--text-hint);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 22px;
  z-index: 9999;
  white-space: nowrap;
}
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
