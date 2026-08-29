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
          <span v-if="isSelf" class="u-me">我</span>
        </div>
        <div v-if="user && user.carModel" class="u-car">#{{ user.carModel }}</div>
      </div>
      <!-- 自己：编辑资料；他人：关注 + 发消息 + 更多菜单 -->
      <div class="u-actions">
        <button v-if="isSelf" class="u-btn u-edit" @click="onEdit">编辑资料</button>
        <template v-else>
          <button class="u-btn u-follow" :class="{ on: user && user.isFollowing }" @click="onToggleFollow">
            {{ user && user.isFollowing ? '已关注' : '+ 关注' }}
          </button>
          <button class="u-btn u-msg" @click="onMessage">发消息</button>
          <button class="u-more-btn" @click="menuOpen = !menuOpen">⋯</button>
          <transition name="fade">
            <div v-if="menuOpen" class="u-menu" @click.stop>
              <div class="u-menu__item" @click="onReport">举报</div>
              <div class="u-menu__item" @click="onBlock">拉黑</div>
            </div>
          </transition>
        </template>
      </div>
    </div>

    <!-- 四宫格：发布 / 收藏 / 关注 / 粉丝 -->
    <div class="u-grid">
      <div class="u-grid__item" :class="{ on: activeGrid === 'publish' }" @click="selectGrid('publish')">
        <b>{{ user ? user.feedCount : 0 }}</b><span>发布</span>
      </div>
      <div v-if="isSelf" class="u-grid__item" :class="{ on: activeGrid === 'favorites' }" @click="selectGrid('favorites')">
        <b>{{ user ? user.favoriteCount : 0 }}</b><span>收藏</span>
      </div>
      <div class="u-grid__item" :class="{ on: activeGrid === 'follow' }" @click="selectGrid('follow')">
        <b>{{ user ? user.followeeCount : 0 }}</b><span>关注</span>
      </div>
      <div class="u-grid__item" :class="{ on: activeGrid === 'followers' }" @click="selectGrid('followers')">
        <b>{{ user ? user.followerCount : 0 }}</b><span>粉丝</span>
      </div>
    </div>

    <!-- 发布子 Tab（仅 activeGrid=publish 时显示；足迹仅自己可见）-->
    <div v-if="activeGrid === 'publish'" class="u-tabs">
      <button
        v-for="t in publishTabs"
        :key="t.key"
        class="u-tab"
        :class="{ on: activeTab === t.key }"
        @click="onTab(t.key)"
      >{{ t.label }}</button>
    </div>

    <!-- 内容区 -->
    <div class="u-body">
      <!-- feed 型：动态 / 赞过 / 足迹 / 收藏 -->
      <template v-if="isFeedList">
        <template v-if="feedList.length">
          <MomentCard v-for="it in feedList" :key="it.id" :item="it" />
          <div v-if="loadingMore" class="u-more">加载中…</div>
          <div v-else-if="!hasMore" class="u-more">没有更多了</div>
        </template>
        <div v-else-if="!feedLoading" class="u-empty">{{ emptyText }}</div>
      </template>

      <!-- 用户型 Tab：关注 / 粉丝 -->
      <template v-else>
        <div v-if="userList.length" class="u-users">
          <div v-for="u in userList" :key="u.deviceId" class="u-user" @click="gotoUser(u.deviceId)">
            <img class="u-user__av" :src="resolveAvatar(u.nickname, u.avatar)" :alt="u.nickname" @error="(e) => handleAvatarError(e, u.nickname)" />
            <div class="u-user__meta">
              <div class="u-user__name">{{ u.nickname }}</div>
              <div v-if="u.carModel" class="u-user__car">#{{ u.carModel }}</div>
            </div>
            <span class="u-user__arrow">›</span>
          </div>
        </div>
        <div v-else class="u-empty">{{ emptyText }}</div>
      </template>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import MomentCard from '../components/MomentCard.vue'
import { getDeviceId } from '../api/feed'
import {
  fetchUserProfile,
  fetchUserFeeds,
  followUser,
  unfollowUser,
  fetchLikedFeeds,
  fetchFavorites,
  fetchFootprints,
  fetchFollowList,
  fetchFollowers,
} from '../api/feed'
import { handleAvatarError, resolveAvatar } from '../utils/avatar'
import bridge from '../bridge'

const route = useRoute()
const router = useRouter()

const user = ref(null)
const isSelf = computed(() => route.params.id === 'me' || (user.value && user.value.isSelf))

// ---- 一级：四宫格 ----
const activeGrid = ref('publish') // publish | favorites | follow | followers
// ---- 二级：发布子 Tab（动态 / 赞过 / 足迹[仅自己]）----
const publishTabs = computed(() =>
  isSelf.value
    ? [
        { key: 'dynamic', label: '动态' },
        { key: 'liked', label: '赞过' },
        { key: 'footprints', label: '足迹' },
      ]
    : [
        { key: 'dynamic', label: '动态' },
        { key: 'liked', label: '赞过' },
      ]
)
const activeTab = ref('dynamic') // dynamic | liked | footprints
const isFeedList = computed(() => activeGrid.value === 'publish' || activeGrid.value === 'favorites')

const emptyText = computed(() => {
  if (activeGrid.value === 'favorites') return '还没有收藏的内容'
  if (activeGrid.value === 'follow') return '还没有关注的人'
  if (activeGrid.value === 'followers') return '还没有粉丝'
  const map = {
    dynamic: '暂无动态',
    liked: '还没有点赞过的内容',
    footprints: '还没有浏览记录',
  }
  return map[activeTab.value] || '暂无内容'
})

// ---- 状态 ----
const feedList = ref([])
const userList = ref([])
const feedLoading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)
const toast = ref('')
let toastTimer = null
const PAGE_SIZE = 15
const menuOpen = ref(false)

const targetDevice = computed(() =>
  route.params.id === 'me' ? getDeviceId() || '' : String(route.params.id || '')
)
const avatarText = computed(() => (user.value && user.value.nickname ? user.value.nickname.slice(0, 1).toUpperCase() : '?'))

function showToast(m) {
  toast.value = m
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}
// 返回：原生全屏 WebView（App「我的」四宫格入口）调 PXIDApp.closeWebView 回 Flutter「我的」页；
// 有 H5 历史（如从粉丝列表点进他人主页）先回上一页，无历史则关 WebView；浏览器预览退回 router.back()。
// 注意：关闭桥是 window.PXIDApp.postMessage('closeWebView')，不是 PXIDBridge.closeWebView（不存在）。
function goBack() {
  const app = window.PXIDApp
  if (app && typeof app.postMessage === 'function') {
    if (window.history.length > 1) router.back()
    else app.postMessage('closeWebView')
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}
function gotoUser(deviceId) {
  if (deviceId) router.push('/user/' + encodeURIComponent(deviceId))
}

// ---- 一级切换 ----
function selectGrid(key) {
  if (key === 'favorites' && !isSelf.value) return
  if (key === activeGrid.value) return
  activeGrid.value = key
  menuOpen.value = false
  if (key === 'publish' && !publishTabs.value.some((t) => t.key === activeTab.value)) {
    activeTab.value = 'dynamic'
  }
  loadContent(true)
}
// ---- 二级切换（仅发布区）----
function onTab(key) {
  if (key === activeTab.value) return
  activeTab.value = key
  loadContent(true)
}

// ---- 加载 ----
async function loadProfile() {
  const d = targetDevice.value
  if (!d) { showToast('无法识别用户'); return }
  user.value = await fetchUserProfile(d)
  if (!user.value) showToast('用户信息加载失败')
}

async function loadContent(reset = true) {
  const grid = activeGrid.value
  feedLoading.value = true
  if (grid === 'publish' || grid === 'favorites') {
    if (reset) { page.value = 1; feedList.value = []; hasMore.value = true }
    if (loadingMore.value || !hasMore.value) { feedLoading.value = false; return }
    loadingMore.value = true
    try {
      const d = targetDevice.value
      let r = { list: [], total: 0 }
      if (grid === 'favorites') r = await fetchFavorites({ page: page.value, pageSize: PAGE_SIZE })
      else if (activeTab.value === 'dynamic') r = await fetchUserFeeds(d, { page: page.value, pageSize: PAGE_SIZE })
      else if (activeTab.value === 'liked') r = await fetchLikedFeeds({ page: page.value, pageSize: PAGE_SIZE })
      else if (activeTab.value === 'footprints') r = await fetchFootprints({ page: page.value, pageSize: PAGE_SIZE })
      const list = r.list || []
      feedList.value = reset ? list : feedList.value.concat(list)
      hasMore.value = list.length >= PAGE_SIZE && feedList.value.length < (r.total || Infinity)
      page.value += 1
    } finally {
      loadingMore.value = false
      feedLoading.value = false
    }
  } else {
    const d = targetDevice.value
    const list = grid === 'follow' ? await fetchFollowList(d) : await fetchFollowers(d)
    userList.value = list || []
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

// ---- 他人主页动作（发消息 / 编辑 / 举报 / 拉黑）----
// 私信、举报、拉黑为二期能力：本期先桥接原生入口，无原生时给出占位提示，不阻断浏览
function onEdit() {
  try { bridge.openNative('profile/edit') } catch (e) { showToast('编辑资料功能即将上线') }
}
function onMessage() {
  try { bridge.openNative('message/user?deviceId=' + encodeURIComponent(targetDevice.value)) }
  catch (e) { showToast('私信功能即将上线') }
}
function onReport() {
  menuOpen.value = false
  showToast('举报功能即将上线')
}
function onBlock() {
  menuOpen.value = false
  showToast('拉黑功能即将上线')
}

function onScroll() {
  if (!isFeedList.value || loadingMore.value || !hasMore.value) return
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 120) loadContent(false)
}

// ---- 查询透传（App「我的」四宫格链接带 ?tab=&sub= 直接进对应页）----
function applyQuery() {
  const qTab = String(route.query.tab || '')
  const qSub = String(route.query.sub || '')
  if (['publish', 'favorites', 'follow', 'followers'].includes(qTab)) {
    if (!(qTab === 'favorites' && !isSelf.value)) activeGrid.value = qTab
  }
  if (['dynamic', 'liked', 'footprints'].includes(qSub)) {
    if (!(qSub === 'footprints' && !isSelf.value)) activeTab.value = qSub
  }
}

watch(() => route.params.id, async () => {
  // 跨用户进入时重置
  activeGrid.value = 'publish'
  activeTab.value = 'dynamic'
  userList.value = []
  applyQuery()
  await loadProfile()
  await loadContent(true)
})

onMounted(async () => {
  applyQuery()
  await loadProfile()
  await loadContent(true)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.uprofile {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
  padding-bottom: env(safe-area-inset-bottom);
}

/* ---- 资料卡 ---- */
.u-head {
  position: relative;
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
.u-avatar img { width: 100%; height: 100%; object-fit: cover; }
.u-avatar__ph { font-size: 26px; font-weight: 700; color: var(--brand, #4a6cf7); }
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
  border-radius: 20px;
  padding: 7px 16px;
  border: none;
}
.u-edit { color: var(--text-sub); background: #f0f1f3; }
.u-follow { color: #fff; background: var(--brand, #4a6cf7); }
.u-follow.on { color: var(--text-sub); background: #f0f1f3; }
.u-msg { color: var(--brand, #4a6cf7); background: var(--brand-soft, rgba(74, 108, 247, 0.1)); }
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
  border-radius: 10px;
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

/* ---- 四宫格 ---- */
.u-grid {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;
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

/* ---- 发布子 Tab 条 ---- */
.u-tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
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
.u-body { padding-top: 10px; }
.u-more { text-align: center; padding: 14px 0 22px; font-size: 12px; color: var(--text-hint); }
.u-empty { text-align: center; padding: 60px 20px; font-size: 14px; color: var(--text-hint); }

/* 用户列表（关注/粉丝）*/
.u-users { background: #fff; }
.u-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f2f3f5;
}
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
