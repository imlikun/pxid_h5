<template>
  <div class="uprofile">
    <TopBar sticky :title="user ? user.nickname : '个人主页'" :back="goBack" />

    <!-- 用户资料卡 -->
    <div class="u-head">
      <div class="u-avatar">
        <img v-if="user" :src="resolveAvatar(user.nickname, user.avatar)" :alt="user.nickname" @error="(e) => handleAvatarError(e, user.nickname)" />
        <span v-else class="u-avatar__ph">{{ avatarText }}</span>
      </div>
      <div class="u-meta">
        <div class="u-name">
          {{ user ? user.nickname : '…' }}
          <span v-if="isSelf" class="u-me">我</span>
        </div>
        <div v-if="user && user.carModel" class="u-car">#{{ user.carModel }}</div>
      </div>
      <!-- 他人主页：只保留「更多」菜单（举报/拉黑入口）。
           关注 + 发消息入口已下线（2026-09-05 坤哥拍板：全站不做社交关注/私信），
           与发现页 MomentCard 的关注按钮同步移除，避免两处逻辑不一致。 -->
      <div v-if="!isSelf" class="u-actions">
        <button class="u-more-btn" @click="menuOpen = !menuOpen">⋯</button>
        <transition name="fade">
          <div v-if="menuOpen" class="u-menu" @click.stop>
            <div class="u-menu__item" @click="onReport">举报</div>
            <div class="u-menu__item" @click="onBlock">拉黑</div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 四宫格：发布 / 收藏 / 关注 / 粉丝 -->
    <div class="u-grid">
      <div class="u-grid__item" :class="{ on: activeGrid === 'publish' }" @click="selectGrid('publish')">
        <b>{{ user ? user.feedCount : '—' }}</b><span>发布</span>
      </div>
      <div v-if="isSelf" class="u-grid__item" :class="{ on: activeGrid === 'favorites' }" @click="selectGrid('favorites')">
        <b>{{ user ? user.favoriteCount : '—' }}</b><span>收藏</span>
      </div>
      <div class="u-grid__item" :class="{ on: activeGrid === 'follow' }" @click="selectGrid('follow')">
        <b>{{ user ? user.followeeCount : '—' }}</b><span>关注</span>
      </div>
      <div class="u-grid__item" :class="{ on: activeGrid === 'followers' }" @click="selectGrid('followers')">
        <b>{{ user ? user.followerCount : '—' }}</b><span>粉丝</span>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="u-body">
      <div v-if="profileError" class="u-empty u-error" role="alert">
        <p>{{ profileError }}</p><button @click="refreshProfile">重新加载</button>
      </div>
      <div v-else-if="profileLoading || (feedLoading && !feedList.length && !userList.length)" class="u-empty" role="status">加载中…</div>
      <!-- feed 型：动态 / 赞过 / 足迹 / 收藏 -->
      <template v-else-if="isFeedList">
        <template v-if="feedList.length">
          <MomentCard v-for="it in feedList" :key="it.id" :item="it" />
          <div v-if="loadingMore" class="u-more">加载中…</div>
          <div v-else-if="!hasMore && !contentError" class="u-more">没有更多了</div>
        </template>
        <div v-else-if="!feedLoading && !contentError" class="u-empty">{{ emptyText }}</div>
      </template>

      <!-- 用户型 Tab：关注 / 粉丝 -->
      <template v-else>
        <div v-if="userList.length" class="u-users">
          <div v-for="u in userList" :key="u.memberUserId ? 'm:' + u.memberUserId : 'd:' + u.deviceId" class="u-user" @click="gotoUser(u.memberUserId || u.deviceId)">
            <img class="u-user__av" :src="resolveAvatar(u.nickname, u.avatar)" :alt="u.nickname" @error="(e) => handleAvatarError(e, u.nickname)" />
            <div class="u-user__meta">
              <div class="u-user__name">{{ u.nickname }}</div>
              <div v-if="u.carModel" class="u-user__car">#{{ u.carModel }}</div>
            </div>
            <span class="u-user__arrow">›</span>
          </div>
        </div>
        <div v-else-if="!contentError" class="u-empty">{{ emptyText }}</div>
      </template>
      <div v-if="!profileError && contentError" class="u-empty u-error" role="alert">
        <p>{{ contentError }}</p><button @click="retryContent">重试</button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import MomentCard from '../components/MomentCard.vue'
import {
  fetchUserProfile, fetchMyProfile, updateMyProfile, fetchUserFeeds, fetchMyFeeds,
  fetchFavorites, fetchFollowList, fetchFollowers,
} from '../api/feed'
import { handleAvatarError, resolveAvatar } from '../utils/avatar'
import bridge, { peekAuthToken } from '../bridge'

const route = useRoute()
const router = useRouter()
const user = ref(null)
const isSelf = computed(() => route.params.id === 'me' || !!user.value?.isSelf)
const activeGrid = ref('publish')
const isFeedList = computed(() => ['publish', 'favorites'].includes(activeGrid.value))
const emptyText = computed(() => ({
  publish: '暂无动态', favorites: '还没有收藏的内容',
  follow: '还没有关注的人', followers: '还没有粉丝',
}[activeGrid.value]))
const feedList = ref([])
const userList = ref([])
const profileLoading = ref(true)
const feedLoading = ref(true)
const loadingMore = ref(false)
const profileError = ref('')
const contentError = ref('')
const page = ref(1)
const hasMore = ref(true)
const toast = ref('')
const menuOpen = ref(false)
const avatarText = computed(() => user.value?.nickname?.slice(0, 1).toUpperCase() || '?')
const PAGE_SIZE = 15
let toastTimer
let active = false
let profileRevision = 0
let contentRevision = 0
let profileRequest
let contentRequest
const isProfileRoute = () => route.path.startsWith('/user/')

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 1600)
}
function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    if (bridge.isWebViewFirstPage()) app.postMessage('closeWebView')
    else router.back()
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}
function gotoUser(identity) {
  if (identity) router.push('/user/' + encodeURIComponent(identity))
}
function applyQuery() {
  const tab = String(route.query.tab || '')
  activeGrid.value = ['publish', 'favorites', 'follow', 'followers'].includes(tab)
    && !(tab === 'favorites' && !isSelf.value) ? tab : 'publish'
}
function selectGrid(key) {
  if (key === 'favorites' && !isSelf.value) return
  if (key === activeGrid.value) return
  activeGrid.value = key
  menuOpen.value = false
  loadContent(true)
}
function invalidateContent() {
  contentRevision++
  contentRequest?.abort()
  loadingMore.value = false
  feedLoading.value = false
}
function errorMessage(error, fallback) {
  if (error.status === 401) return error.message.startsWith('App') ? error.message : '登录信息已失效，请重新登录后再试'
  return fallback
}

// Never persist the browser preview's mock profile over a real account.
// Native information is merged only within the current, verified account load.
async function mergeNativeProfile(profile, revision, signal) {
  if (!bridge.isNative()) return profile
  const native = await bridge.getUserInfo().catch(() => null)
  if (!active || revision !== profileRevision || !native) return profile
  const nativeMember = String(native.memberUserId || native.member_user_id || '')
  if ((nativeMember && nativeMember !== String(profile.memberUserId || ''))
      || (native.token && String(native.token) !== peekAuthToken())) {
    throw Object.assign(new Error('App 登录账号已变化，请重新加载'), { status: 401 })
  }
  const patch = {}
  for (const key of ['nickname', 'avatar', 'carModel']) {
    const value = native[key] && String(native[key]).trim()
    if (value && !(key === 'nickname' && value === '骑友') && value !== String(profile[key] || '')) patch[key] = value
  }
  if (Object.keys(patch).length) {
    try { await updateMyProfile(patch, { signal }) }
    catch (error) {
      if (signal.aborted) throw error
      console.warn('[profile] native profile sync failed:', error.message)
    }
  }
  return { ...profile, ...patch }
}

async function refreshProfile() {
  const identity = String(route.params.id || '')
  if (!active || !isProfileRoute() || !identity) return
  const revision = ++profileRevision
  profileRequest?.abort()
  profileRequest = new AbortController()
  const signal = profileRequest.signal
  invalidateContent()
  user.value = null
  feedList.value = []
  userList.value = []
  profileLoading.value = true
  profileError.value = ''
  contentError.value = ''
  const current = () => active && revision === profileRevision && identity === String(route.params.id || '')
  try {
    // Refresh once at this private entry, without delaying public discovery reads.
    await bridge.getAuthToken({ forceRefresh: true })
    if (!current()) return
    let profile = identity === 'me'
      ? await fetchMyProfile({ throwOnError: true, signal })
      : await fetchUserProfile(identity, { throwOnError: true, signal })
    if (!current()) return
    if (!profile) throw new Error('User profile unavailable')
    if (identity === 'me' && bridge.isNative() && !profile.memberUserId) {
      throw Object.assign(new Error('App 登录信息未同步，请重新登录后再试'), { status: 401 })
    }
    if (identity === 'me' || profile.isSelf) profile = await mergeNativeProfile(profile, revision, signal)
    if (!current()) return
    user.value = profile
    if (activeGrid.value === 'favorites' && !isSelf.value) activeGrid.value = 'publish'
    profileLoading.value = false
    await loadContent(true)
  } catch (error) {
    if (current()) profileError.value = errorMessage(error, '用户信息加载失败，请重试')
  } finally {
    if (current()) profileLoading.value = false
  }
}

async function loadContent(reset = true) {
  if (!active || !isProfileRoute() || !user.value || profileLoading.value || profileError.value) return
  if (!reset && (loadingMore.value || !hasMore.value || contentError.value)) return
  if (reset) {
    invalidateContent()
    page.value = 1
    feedList.value = []
    userList.value = []
    hasMore.value = true
  }
  const revision = ++contentRevision
  const profileVersion = profileRevision
  const grid = activeGrid.value
  const target = { ...user.value }
  const requestPage = page.value
  contentRequest = new AbortController()
  const options = { throwOnError: true, signal: contentRequest.signal }
  const current = () => active && revision === contentRevision
    && profileVersion === profileRevision && grid === activeGrid.value
  contentError.value = ''
  feedLoading.value = true
  loadingMore.value = true
  try {
    if (grid === 'publish' || grid === 'favorites') {
      const params = { page: requestPage, pageSize: PAGE_SIZE, ...options }
      const result = grid === 'favorites' ? await fetchFavorites(params)
        : isSelf.value ? await fetchMyFeeds(params) : await fetchUserFeeds(target, params)
      if (!current()) return
      const list = result.list || []
      if (isSelf.value && target.avatar) {
        list.forEach(item => {
          if (target.memberUserId ? String(item.memberUserId || '') === String(target.memberUserId)
            : target.deviceId && item.deviceId === target.deviceId) item.avatar = target.avatar
        })
      }
      const combined = reset ? list : feedList.value.concat(list)
      feedList.value = [...new Map(combined.map(item => [String(item.id), item])).values()]
      const total = Number(result.total)
      hasMore.value = list.length >= PAGE_SIZE && (!Number.isFinite(total) || feedList.value.length < total)
      page.value = requestPage + 1
      if (Number.isFinite(total)) user.value[grid === 'favorites' ? 'favoriteCount' : 'feedCount'] = total
    } else {
      // Use the resolved identity from /users/me or /users/:id, never the
      // unverified bridge device. Counts and lists use the same relation filter.
      const list = grid === 'follow'
        ? await fetchFollowList(target.deviceId, target.memberUserId, options)
        : await fetchFollowers(target.deviceId, target.memberUserId, options)
      if (!current()) return
      userList.value = list
      user.value[grid === 'follow' ? 'followeeCount' : 'followerCount'] = list.length
    }
  } catch (error) {
    if (current()) contentError.value = errorMessage(error, '内容加载失败，请重试')
  } finally {
    if (current()) { loadingMore.value = false; feedLoading.value = false }
  }
}
function onReport() { menuOpen.value = false; showToast('举报功能即将上线') }
function onBlock() { menuOpen.value = false; showToast('拉黑功能即将上线') }
function retryContent() { contentError.value = ''; loadContent(!feedList.value.length) }
function onScroll() {
  if (!active || !isProfileRoute() || !isFeedList.value || profileLoading.value || contentError.value) return
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) loadContent(false)
}
function onVisible() {
  if (active && document.visibilityState === 'visible') refreshProfile()
}
watch(() => route.params.id, () => {
  if (!active || !isProfileRoute()) return
  applyQuery()
  refreshProfile()
})
watch(() => route.query.tab, () => {
  if (!active || !isProfileRoute()) return
  applyQuery()
  loadContent(true)
})
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisible)
})
onActivated(() => { active = true; applyQuery(); refreshProfile() })
onDeactivated(() => {
  active = false
  profileRevision++
  profileRequest?.abort()
  invalidateContent()
})
onUnmounted(() => {
  active = false
  profileRequest?.abort()
  invalidateContent()
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisible)
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.uprofile {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}

/* ---- 资料卡（浮动卡片，对齐车型详情页鸿蒙智行风） ---- */
.u-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 14px 16px 0;
  padding: 18px 16px;
  background: var(--card);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.u-avatar {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  flex: none;
  background: linear-gradient(135deg, var(--brand-soft) 0%, #dfe3ef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.u-avatar__ph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  color: var(--brand, #4a6cf7);
  z-index: 0;
}
.u-avatar__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 1;
}
.u-avatar__img.loaded { opacity: 1; }
.u-meta { flex: 1; min-width: 0; }
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
.u-car { font-size: 12px; color: var(--text-sub); margin-top: 3px; }

/* 操作区 */
.u-actions { flex: none; display: flex; align-items: center; gap: 8px; }
.u-btn {
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-pill);
  padding: 7px 16px;
  border: none;
}
.u-edit { color: var(--text-sub); background: var(--surface-2); }
.u-follow { color: #fff; background: var(--brand-gradient); box-shadow: 0 2px 8px rgba(77, 124, 255, 0.3); }
.u-follow.on { color: var(--text-sub); background: var(--surface-2); box-shadow: none; }
.u-msg { color: var(--brand); background: var(--brand-soft); }
.u-more-btn {
  width: 30px; height: 30px;
  border-radius: 50%;
  border: none;
  background: #f0f1f3;
  color: var(--text-sub);
  font-size: 18px;
  line-height: 1;
}
.u-menu {
  position: absolute;
  top: 58px;
  right: 12px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 50;
}
.u-menu__item {
  padding: 12px 28px 12px 16px;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
}
.u-menu__item:active { background: #f5f6f8; }

/* ---- 四宫格（浮动卡片） ---- */
.u-grid {
  display: flex;
  margin: 14px 16px 0;
  background: var(--card);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.u-grid__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 0;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease;
}
.u-grid__item b { font-size: 17px; color: var(--text); font-weight: 700; }
.u-grid__item span { font-size: 12px; color: var(--text-sub); }
.u-grid__item.on { border-bottom-color: var(--brand, #4a6cf7); }
.u-grid__item.on b,
.u-grid__item.on span { color: var(--brand, #4a6cf7); }

/* ---- 发布子 Tab 条（浮动卡片） ---- */
.u-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  margin: 14px 16px 0;
  background: var(--card);
  border-radius: var(--radius-xl);
  position: sticky;
  top: 44px;
  z-index: 10;
}
.u-tab {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-sub);
  padding: 12px 0;
  position: relative;
}
.u-tab.on { color: var(--text); font-weight: 700; }
.u-tab.on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand, #4a6cf7);
}

/* ---- 内容区 ---- */
.u-body { padding-top: 14px; }
.u-more { text-align: center; padding: 14px 0 22px; font-size: 12px; color: var(--text-hint); }
.u-empty { text-align: center; padding: 60px 20px; font-size: 14px; color: var(--text-hint); }
.u-error p { margin: 0 0 14px; }
.u-error button { min-height: 44px; padding: 0 20px; border: 1px solid var(--line); border-radius: 10px; color: var(--brand); background: var(--card); font: inherit; }

/* 用户列表（关注/粉丝，浮动卡片）*/
.u-users {
  margin: 0 16px;
  background: var(--card);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.u-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}
.u-user:last-child { border-bottom: none; }
.u-user__av { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex: none; background: #eef0f4; }
.u-user__meta { flex: 1; min-width: 0; }
.u-user__name { font-size: 15px; font-weight: 600; color: var(--text); }
.u-user__car { font-size: 12px; color: var(--text-sub); margin-top: 2px; }
.u-user__arrow { color: var(--text-hint); font-size: 20px; }

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
