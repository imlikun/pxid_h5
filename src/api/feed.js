// ============================================================
// 发帖 / 社区动态数据层（发现页三 tab：推荐 / 动态 / 广场）
// ------------------------------------------------------------
// 契约：docs/PXID_ToC_后端接口规范.md §3
//   GET /feed（动态流，tab=recommend|dynamic|plaza）
//   POST /feed（发帖，author 由后端按 token 注入）
//   GET /feed/{id}（详情）、POST /feed/{id}/like、comment...
//
// 当前后端未上线：走「mock + localStorage 持久化」兜底——
//   发帖写本地存储，刷新不丢、本机可回看；动态流 = 我的发布 + 官方 mock moments。
// 后端就绪后：在下方 FEED_API 填真实 Base URL 即自动切换（保留 mock 兜底）。
// ============================================================

import { publishState, addMoment, ensurePublishScope } from '../store/publish'
import { moments, feedItems, defaultAvatar } from '../data/mock'
import { getDeviceId } from '../utils/device'
import bridge from '../bridge'

// 后端就绪后改为真实地址（2026-08-18 已上线 pxid-api.appin.site）
const FEED_API = 'https://pxid-api.appin.site'

// 取受限 token（后端 requireAuth 校验用）；取不到也不阻塞公开读请求
async function getAuthTokenSafe() {
  try {
    return (await bridge.getAuthToken()) || ''
  } catch (e) {
    return ''
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const tk = await getAuthTokenSafe()
  if (tk) headers.Authorization = 'Bearer ' + tk
  const res = await fetch(FEED_API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || '接口错误')
  return json.data
}

// 归一化后端 FeedItem → 前端字段（createdAt → time 相对展示由前端算，这里先原样透传）
function normalize(item) {
  return { ...item, time: item.time || item.createdAt || '' }
}

// ---- 动态流 ----
// 返回 { list, total }：分页触底加载（page/pageSize 由调用方传，后端返回 total 判断是否还有更多）
// ⚠️ 2026-08-25 起返回值从「数组」改为「{ list, total }」，调用方需解构（DiscoverView.loadFeed / near 已适配）
export async function fetchFeeds(tab = 'dynamic', params = {}) {
  if (FEED_API) {
    try {
      const qsParams = { tab, ...params }
      // 动态：关注流，传当前设备 ID 让后端按「关注 + 官方」过滤；near 模式显式传 followerDevice='' 则不过滤
      if (tab === 'dynamic' && params.followerDevice === undefined) qsParams.followerDevice = await getDeviceId()
      const qs = new URLSearchParams(qsParams).toString()
      const data = await request('/feed?' + qs)
      return { list: (data.list || []).map(normalize), total: data.total || 0 }
    } catch (e) {
      console.warn('[fetchFeeds] API error:', e.message || e)
      /* 接口失败回落 mock */
    }
  }
  // 兜底：我的发布（localStorage 持久化）+ 官方 mock moments，最新在前
  // 先按账号分区重载，避免切号后读到上一个账号的本地发布（2026-09-01）
  await ensurePublishScope()
  const mine = publishState.list.map((m) => ({ ...m, itemType: 'moment' }))
  const official = moments.map((m) => ({ ...m }))
  return { list: [...mine, ...official], total: mine.length + official.length }
}

// ---- 发帖 ----
export async function publishFeed(payload) {
  if (FEED_API) {
    try {
      const data = await request('/feed', { method: 'POST', body: payload })
      await ensurePublishScope()
      addMoment(normalize(data), '动态')
      return { ok: true, id: data.id }
    } catch (e) {
      return { ok: false, message: e.message || '发布失败' }
    }
  }
  // 兜底：本地发布（预览态），作者为我
  const text = (payload.content || '').trim()
  const cm = payload.carModel || ''
  const newMoment = {
    id: 'U' + Date.now(),
    itemType: 'moment',
    author: '我',
    avatar: defaultAvatar,
    title: text.slice(0, 20) || '我的动态',
    content: text,
    images: payload.images || [],
    tags: cm ? [cm] : payload.tags || [],
    carModel: cm,
    likes: 0,
    isLiked: false,
    comments: 0,
    time: '刚刚',
    followed: false,
    focusCar: cm,
  }
  await ensurePublishScope()
  addMoment(newMoment, '动态')
  return { ok: true, id: newMoment.id }
}

// ---- 获取当前设备 ID（简化鉴权用），转交上层 ----
export { getDeviceId }

// ---- 详情 ----
// 详情缓存（60s）+ 请求合并：列表 touchstart 预热、详情页复用同一份结果，
// 目的是让「横滑进去」的那一刻数据已经就位，不再出现加载圈（2026-09-05）。
const DETAIL_TTL = 60000
const detailCache = new Map() // id -> { ts, data }
const detailInflight = new Map() // id -> Promise（同一 id 并发只发一次请求）

async function fetchFeedDetailRaw(id) {
  if (FEED_API) {
    try {
      const data = await request('/feed/' + id)
      return normalize(data)
    } catch (e) {
      /* 回落 */
    }
  }
  await ensurePublishScope()
  const all = [...publishState.list, ...moments, ...feedItems]
  return all.find((i) => String(i.id) === String(id)) || null
}

export async function fetchFeedDetail(id) {
  const key = String(id)
  const hit = detailCache.get(key)
  if (hit && Date.now() - hit.ts < DETAIL_TTL) return hit.data ? { ...hit.data } : null
  let p = detailInflight.get(key)
  if (!p) {
    p = fetchFeedDetailRaw(id)
      .then((data) => {
        detailCache.set(key, { ts: Date.now(), data })
        // 简易 LRU：超出上限淘汰最早的一条
        if (detailCache.size > 30) detailCache.delete(detailCache.keys().next().value)
        return data
      })
      .finally(() => detailInflight.delete(key))
    detailInflight.set(key, p)
  }
  const data = await p
  return data ? { ...data } : null
}

// 预热：卡片 touchstart / mouseenter 时提前拉，点进去时多数已返回
export function prefetchFeedDetail(id) {
  if (id == null) return
  const key = String(id)
  const hit = detailCache.get(key)
  if ((hit && Date.now() - hit.ts < DETAIL_TTL) || detailInflight.has(key)) return
  fetchFeedDetail(id).catch(() => {})
}

// 点赞/评论/删帖后主动失效，避免 60s 内再进详情读到旧计数
export function invalidateFeedDetail(id) {
  if (id == null) return
  detailCache.delete(String(id))
}

// ---- 删除（仅作者，后端校验身份；软删 status='deleted'）----
export async function deleteFeed(id) {
  if (!FEED_API) return { ok: false, message: '删除服务未就绪' }
  try {
    await request('/feed/' + id, { method: 'DELETE' })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '删除失败' }
  }
}

// ---- 评论 ----
export async function commentFeed(id, text, { parentId = 0 } = {}) {
  if (!FEED_API) return { ok: false }
  try {
    // 后端评论字段名是 content（非 text）；parentId>0 为楼中楼回复（可任意层级）
    // 带 actor 身份（nickname/avatar）：通知作者 + 评论归属不能永远'骑友'
    const profile = await bridge.getUserInfo().catch(() => ({ nickname: '', avatar: '' }))
    const data = await request('/feed/' + id + '/comment', {
      method: 'POST',
      body: { content: text, parentId, nickname: profile.nickname || '', avatar: profile.avatar || '' },
    })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, message: e.message || '评论失败' }
  }
}

// ---- 发现页运营配置（Banner / 广场四宫格）----
// GET /banners（公开，status='on'）→ data.list
// GET /plaza-grid（公开，status='on'）→ data.list
export async function fetchBanners() {
  if (!FEED_API) return []
  try {
    const data = await request('/banners')
    return data.list || []
  } catch (e) {
    return []
  }
}
export async function fetchPlazaGrid() {
  if (!FEED_API) return []
  try {
    const data = await request('/plaza-grid')
    return data.list || []
  } catch (e) {
    return []
  }
}

// ---- 评论列表（跨端一致的关键）----
// 后端 GET /feed/{id}/comments → data.list
// 失败时返回 null，由调用方回落到本地 seed
export async function fetchComments(id) {
  if (!FEED_API) return null
  try {
    const data = await request('/feed/' + id + '/comments')
    const list = (data.list || []).map((c) => ({
      id: c.id,
      author: c.author,
      avatar: c.avatar || '',
      content: c.content,
      time: c.createdAt || c.time || '',
      likes: c.likes || 0,
      isLiked: !!c.isLiked,
      replies: (c.replies || []).map((r) => ({
        id: r.id,
        author: r.author,
        avatar: r.avatar || '',
        content: r.content,
        time: r.createdAt || r.time || '',
        likes: r.likes || 0,
        isLiked: !!r.isLiked,
      })),
    }))
    return list
  } catch (e) {
    return null
  }
}

// ---- 广场热门活动（只读；运营后台可配基础活动；接口空/异常时前端兜底 mock）----
import { activities as MOCK_ACTIVITIES } from '../data/mock'
export async function fetchActivities(params = {}) {
  if (!FEED_API) return MOCK_ACTIVITIES
  try {
    const qs = new URLSearchParams(params).toString()
    const url = '/activities' + (qs ? '?' + qs : '')
    const data = await request(url)
    const list = data.list || []
    return list.length ? list : MOCK_ACTIVITIES
  } catch (e) {
    return MOCK_ACTIVITIES
  }
}

// ---- 活动详情：优先真实 /activities/:id，404/异常回退本地 mock ----
export async function fetchActivityDetail(id) {
  if (!FEED_API) return MOCK_ACTIVITIES.find((i) => i.id === Number(id)) || null
  try {
    const data = await request('/activities/' + id)
    return data
  } catch (e) {
    return MOCK_ACTIVITIES.find((i) => i.id === Number(id)) || null
  }
}

// ---- 关注 / 取关 / 检查（动态关注流）----
// followeeMemberUserId：被关注者的会员 ID（有就传，便于「同人换设备」后关注关系仍命中）
export async function followUser(followeeDevice, followeeMemberUserId = '') {
  try {
    await request('/follow', {
      method: 'POST',
      body: { followerDevice: await getDeviceId(), followeeDevice, followeeMemberUserId: String(followeeMemberUserId || '') },
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '关注失败' }
  }
}
export async function unfollowUser(followeeDevice) {
  try {
    await request(`/follow?followerDevice=${encodeURIComponent(await getDeviceId())}&followeeDevice=${encodeURIComponent(followeeDevice)}`, { method: 'DELETE' })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '取关失败' }
  }
}
export async function checkFollow(followeeDevice) {
  try {
    const data = await request(`/follow/check?follower=${encodeURIComponent(await getDeviceId())}&followee=${encodeURIComponent(followeeDevice)}`)
    return !!data.following
  } catch (e) {
    return false
  }
}

// ---- 举报（UGC 内容安全闭环）----
export async function reportFeed(id, reason) {
  try {
    await request(`/feed/${id}/report`, { method: 'POST', body: { reason, reporterDevice: await getDeviceId() } })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '举报失败' }
  }
}

// ---- 活跃用户（@话题选人）----
export async function fetchFeedUsers(region = '') {
  if (!FEED_API) return []
  try {
    const qs = region ? '?region=' + encodeURIComponent(region) : ''
    const data = await request('/feed/users' + qs)
    return data.list || []
  } catch (e) {
    return []
  }
}

// ---- 个人主页：用户聚合信息（昵称/头像/车型 + 关注/粉丝 + 是否已关注/是否自己）----
export async function fetchUserProfile(deviceId) {
  if (!FEED_API || !deviceId) return null
  try {
    return await request('/users/' + encodeURIComponent(deviceId))
  } catch (e) {
    return null
  }
}

// 自己的主页资料：只走 /users/me（token 身份 = 当前登录账号）。
// ⚠️ 严禁回退 /users/:deviceId（2026-09-01 与北帆整改清单对齐，问题B）：
//    deviceId 是设备稳定 ID，**不随账号切换**。一旦 /users/me 失败就回退它，
//    会出现「已切到乙账号、却显示甲的资料」的跨账号串号。拿不到就返回 null，让上层走错误/空态。
export async function fetchMyProfile() {
  if (!FEED_API) return null
  try {
    return await request('/users/me')
  } catch (e) {
    console.warn('[fetchMyProfile] /users/me failed:', e.message || e)
    return null
  }
}

// 更新自己的资料（昵称/头像/车型），写入 user_profiles 唯一真相源
export async function updateMyProfile(payload) {
  try {
    return await request('/users/profile', { method: 'PUT', body: payload })
  } catch (e) {
    throw e
  }
}

// 上传媒体（头像等）：multipart/form-data → /media/upload，返回可访问 URL
export async function uploadMedia(file) {
  const tk = await getAuthTokenSafe()
  const form = new FormData()
  form.append('file', file)
  const headers = {}
  if (tk) headers.Authorization = 'Bearer ' + tk
  const res = await fetch(FEED_API + '/media/upload', { method: 'POST', headers, body: form })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || '上传失败')
  return json.data.url
}

// ---- 某人发布的动态（个人主页动态流，按 device_id / member_user_id 双身份过滤，解决 ToC 双 ID 漂移）----
// target: { deviceId, memberUserId } 或 旧式字符串 deviceId；两者都传时后端任一命中即可
export async function fetchUserFeeds(target, params = {}) {
  if (!FEED_API || !target) return { list: [], total: 0 }
  try {
    const qs = new URLSearchParams({ tab: 'dynamic', ...params })
    if (typeof target === 'string') {
      if (target) qs.set('deviceId', target)
    } else {
      if (target.deviceId) qs.set('deviceId', target.deviceId)
      if (target.memberUserId) qs.set('memberUserId', target.memberUserId)
    }
    const data = await request('/feed?' + qs.toString())
    return { list: (data.list || []).map(normalize), total: data.total || 0 }
  } catch (e) {
    return { list: [], total: 0 }
  }
}

// ---- 我的发布（按 token 双身份，本人 /user/me 专用；不依赖 getDeviceId()，根治数量/列表不一致）----
export async function fetchMyFeeds(params = {}) {
  if (!FEED_API) return { list: [], total: 0 }
  try {
    const qs = new URLSearchParams(params).toString()
    const data = await request('/feed/me' + (qs ? '?' + qs : ''))
    return { list: (data.list || []).map(normalize), total: data.total || 0 }
  } catch (e) {
    return { list: [], total: 0 }
  }
}

// ---- 个人主页六 Tab 数据（H5 自管后端，requireAuth）----
// 赞过：GET /feed/liked（仅本人）
export async function fetchLikedFeeds(params = {}) {
  if (!FEED_API) return { list: [], total: 0 }
  try {
    const qs = new URLSearchParams(params).toString()
    const data = await request('/feed/liked' + (qs ? '?' + qs : ''))
    return { list: (data.list || []).map(normalize), total: data.total || 0 }
  } catch (e) {
    return { list: [], total: 0 }
  }
}
// 收藏：GET /favorites（仅本人）
export async function fetchFavorites(params = {}) {
  if (!FEED_API) return { list: [], total: 0 }
  try {
    const qs = new URLSearchParams(params).toString()
    const data = await request('/favorites' + (qs ? '?' + qs : ''))
    return { list: (data.list || []).map(normalize), total: data.total || 0 }
  } catch (e) {
    return { list: [], total: 0 }
  }
}
// 足迹：GET /footprints（仅本人）
export async function fetchFootprints(params = {}) {
  if (!FEED_API) return { list: [], total: 0 }
  try {
    const qs = new URLSearchParams(params).toString()
    const data = await request('/footprints' + (qs ? '?' + qs : ''))
    return { list: (data.list || []).map(normalize), total: data.total || 0 }
  } catch (e) {
    return { list: [], total: 0 }
  }
}
// 关注列表：GET /follow/list（公开，返回对象数组）
// 双身份：device 与 member 任一命中即可，与四宫格计数口径一致（根治 deviceId 漂移导致列表≠数字）
export async function fetchFollowList(deviceId, memberUserId) {
  if (!FEED_API || (!deviceId && !memberUserId)) return []
  try {
    const qs = new URLSearchParams()
    if (deviceId) qs.set('device', String(deviceId))
    if (memberUserId) qs.set('member', String(memberUserId))
    const data = await request('/follow/list?' + qs.toString())
    return data.list || []
  } catch (e) {
    return []
  }
}
// 粉丝列表：GET /follow/followers（公开，返回对象数组）
export async function fetchFollowers(deviceId, memberUserId) {
  if (!FEED_API || (!deviceId && !memberUserId)) return []
  try {
    const qs = new URLSearchParams()
    if (deviceId) qs.set('device', String(deviceId))
    if (memberUserId) qs.set('member', String(memberUserId))
    const data = await request('/follow/followers?' + qs.toString())
    return data.list || []
  } catch (e) {
    return []
  }
}
// 收藏 toggle：POST /feed/:id/favorite → { favorited, favorites }
export async function toggleFavorite(feedId, favorited) {
  if (!FEED_API) return { ok: false }
  try {
    const data = await request('/feed/' + feedId + '/favorite', { method: 'POST', body: { favorited } })
    return { ok: true, favorited: !!(data && data.favorited), favorites: data && data.favorites }
  } catch (e) {
    return { ok: false, message: e.message || '操作失败' }
  }
}

// 查询当前登录用户是否收藏了某条动态（详情页初始化收藏态用）
export async function checkFavorite(feedId) {
  if (!FEED_API) return false
  try {
    const data = await request('/feed/' + feedId + '/favorite')
    return !!(data && data.favorited)
  } catch (e) {
    return false
  }
}
// 记录浏览足迹：POST /footprints
export async function recordFootprint(feedId) {
  if (!FEED_API || !feedId) return
  try {
    await request('/footprints', { method: 'POST', body: { feedId } })
  } catch (e) { /* 静默失败，不影响阅读 */ }
}

// ---- 点赞（H5 自管：统一走后端，落 feed_likes 关系表）----
// 供 MomentCard / 详情页共用；返回最新 isLiked/likes（替代旧的 openNative 委托，避免双源不一致）
export async function likeFeed(id, { liked = true, nickname = '', avatar = '' } = {}) {
  if (!FEED_API) return { ok: false }
  try {
    const data = await request('/feed/' + id + '/like', { method: 'POST', body: { liked, nickname, avatar } })
    return { ok: true, isLiked: !!(data && data.isLiked), likes: data && data.likes }
  } catch (e) {
    return { ok: false, message: e.message || '操作失败' }
  }
}
