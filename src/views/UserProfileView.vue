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
      <!-- 他人主页：关注 + 发消息 + 更多菜单；自己主页：不显示操作区 -->
      <div v-if="!isSelf" class="u-actions">
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
  fetchMyProfile,
  fetchUserFeeds,
  fetchMyFeeds,
  followUser,
  unfollowUser,
  fetchFavorites,
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
// 动态/赞过/足迹子 Tab 已下线，发布区固定显示「动态」
const activeTab = ref('dynamic') // static
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

// 「我的」入口（App「我的」四宫格）进 /user/me：身份走原生桥真实设备 ID，
// 与发帖/收藏/关注的落地身份一致（2026-08-29 修复两套 ID 割裂）。
const myDeviceId = ref('')
const targetDevice = computed(() =>
  route.params.id === 'me' ? myDeviceId.value : String(route.params.id || '')
)
async function resolveMyDevice() {
  myDeviceId.value = await getDeviceId()
}
// 预填昵称：进入个人主页时 bridge.getUserInfo 异步返回前，先用它显示首字母，避免一直显示「?」
const prefillNick = ref('')
bridge.getUserInfo().then((p) => { if (p && p.nickname) prefillNick.value = String(p.nickname) }).catch(() => {})
const avatarText = computed(() => {
  const n = (user.value && user.value.nickname) || prefillNick.value
  return n ? n.slice(0, 1).toUpperCase() : '?'
})

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
  activeTab.value = 'dynamic'
  loadContent(true)
}

// ---- 加载 ----
// 自己：Flutter/ToC 是主端，H5 是嵌入从端，**H5 资料永远以 Flutter 为准**。
// 历史教训（2026-09-01 排查「头像串号」）：
//   原逻辑 `!avatar && p.avatar` 只在 H5 为空时补，结果 H5 端的污染值（同 device 另一账号串过来的）
//   永远不会被 Flutter 的最新值覆盖 → 用户「改完 App 头像，H5 还显示别人头像」。
//   现在改成：Flutter 有值就直接覆盖，根治 H5 脏数据问题。
//   边界：用户在 H5 ProfileEditView 改的资料没回写 Flutter（架构问题，不在本次范围）；
//        H5 改的本来就是「孤儿」数据，以 Flutter 覆盖反而正确。
const EMPTY_NICK = new Set(['', '骑友'])
// 用户在 H5 改过资料后的「保护期」：期间不用 Flutter 值覆盖，避免刚改的资料被 Flutter 旧值吃掉。
// 过期后恢复 Flutter 优先，自动纠正 H5 端可能存在的历史污染值。
const H5_EDIT_TTL = 7 * 24 * 3600 * 1000
async function mergeNativeProfile() {
  try {
    const p = await bridge.getUserInfo()
    if (!p) return
    // 头部展示直接采用 Flutter 主端实时值（与 App「我的」同源）——这才是唯一真源，
    // H5 后端 user_profiles 只是它的缓存副本（给他人视角/评论用），不能反客为主覆盖展示。
    const patch = {}
    if (p.nickname && !EMPTY_NICK.has(String(p.nickname).trim())) { user.value.nickname = String(p.nickname); patch.nickname = user.value.nickname }
    if (p.avatar) { user.value.avatar = String(p.avatar); patch.avatar = user.value.avatar }
    if (p.carModel) { user.value.carModel = String(p.carModel); patch.carModel = user.value.carModel }
    // 把 Flutter 当前资料写回 H5 user_profiles（幂等），让他人/评论/瀑布流看到你的新头像
    if (Object.keys(patch).length) {
      try {
        await updateMyProfile(patch)
        await loadContent(true) // 刷新列表，使「列表自己帖头像=头部」(9c75448) 立即生效
      } catch (e) { console.warn('[mergeNativeProfile] persist failed:', e.message || e) }
    }
  } catch (e) { /* 原生桥未实现：保持后端数据 */ }
}

async function loadProfile() {
  const d = targetDevice.value
  if (!d) { showToast('无法识别用户'); return }
  // 自己：只走 /users/me（token 身份最可靠，且不回退 deviceId 避免跨账号串号）；他人：/users/:deviceId
  user.value = isSelf.value ? await fetchMyProfile() : await fetchUserProfile(d)
  if (!user.value) { showToast('用户信息加载失败'); return }
  if (isSelf.value) await mergeNativeProfile()
  // 关注/粉丝/收藏统一走后端 H5 关系表，避免 Flutter 桥返回空导致计数清零
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
      else if (isSelf.value) r = await fetchMyFeeds({ page: page.value, pageSize: PAGE_SIZE })
      else r = await fetchUserFeeds(user.value, { page: page.value, pageSize: PAGE_SIZE })
      const list = r.list || []
      // 自己主页：顶部头像可能被 mergeNativeProfile 用 Flutter 实时值覆盖，
      // 而列表头像来自 H5 后端 user_profiles，两套资料源不同步时会出现
      //「顶部新头像、列表旧头像」的不一致。这里把列表里自己的帖子头像
      // 强制与顶部统一，保证当前用户看自己主页时视觉一致。
      if (isSelf.value && user.value && user.value.avatar) {
        const myMid = String(user.value.memberUserId || '')
        const myDid = String(user.value.deviceId || '')
        list.forEach((it) => {
          const itMid = String(it.memberUserId || '')
          const itDid = String(it.deviceId || '')
          if ((myMid && itMid === myMid) || (!myMid && myDid && itDid === myDid)) {
            it.avatar = user.value.avatar
          }
        })
      }
      feedList.value = reset ? list : feedList.value.concat(list)
      hasMore.value = list.length >= PAGE_SIZE && feedList.value.length < (r.total || Infinity)
      page.value += 1
    } finally {
      loadingMore.value = false
      feedLoading.value = false
    }
  } else {
    // 关注/粉丝列表：自己只看 memberUserId，避免同设备另一账号的行串进本账号列表（device_id OR 命中 bug）。
    // 他人 profile 仍传双身份，向后兼容历史数据。
    const d = targetDevice.value
    const m = (user.value && user.value.memberUserId) || ''
    const list = grid === 'follow'
      ? await fetchFollowList(isSelf.value ? '' : d, isSelf.value ? m : '')
      : await fetchFollowers(isSelf.value ? '' : d, isSelf.value ? m : '')
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
  // 编辑资料改为 H5 自管页（可控、即时生效），不再依赖原生跳转
  router.push('/profile/edit')
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
  if (['publish', 'favorites', 'follow', 'followers'].includes(qTab)) {
    if (!(qTab === 'favorites' && !isSelf.value)) activeGrid.value = qTab
  }
  // 动态/赞过/足迹子 Tab 已下线，忽略 qSub
}

watch(() => route.params.id, async () => {
  // 跨用户进入时重置
  activeGrid.value = 'publish'
  activeTab.value = 'dynamic'
  userList.value = []
  applyQuery()
  await resolveMyDevice()
  await loadProfile()
  await loadContent(true)
})

onMounted(async () => {
  applyQuery()
  await resolveMyDevice()
  // 预填 Flutter 主端资料，消除「?」闪现（App「我的」入口 deviceId 即本人，getUserInfo 走本地桥远快于网络 fetchMyProfile）
  if (isSelf.value) {
    bridge.getUserInfo().then((p) => {
      if (p && (p.nickname || p.avatar)) {
        const base = user.value && typeof user.value === 'object'
          ? user.value
          : { isSelf: true, followeeCount: 0, followerCount: 0, feedCount: 0, favoriteCount: 0 }
        if (p.nickname) base.nickname = String(p.nickname)
        if (p.avatar) base.avatar = String(p.avatar)
        if (p.carModel) base.carModel = String(p.carModel)
        user.value = { ...base }
      }
    }).catch(() => {})
  }
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
