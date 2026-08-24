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

import { publishState, addMoment } from '../store/publish'
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
export async function fetchFeeds(tab = 'dynamic', params = {}) {
  if (FEED_API) {
    try {
      const qsParams = { tab, ...params }
      // 动态：关注流，传当前设备 ID 让后端按「关注 + 官方」过滤
      if (tab === 'dynamic') qsParams.followerDevice = getDeviceId()
      const qs = new URLSearchParams(qsParams).toString()
      const data = await request('/feed?' + qs)
      return (data.list || []).map(normalize)
    } catch (e) {
      console.warn('[fetchFeeds] API error:', e.message || e)
      /* 接口失败回落 mock */
    }
  }
  // 兜底：我的发布（localStorage 持久化）+ 官方 mock moments，最新在前
  const mine = publishState.list.map((m) => ({ ...m, itemType: 'moment' }))
  const official = moments.map((m) => ({ ...m }))
  return [...mine, ...official]
}

// ---- 发帖 ----
export async function publishFeed(payload) {
  if (FEED_API) {
    try {
      const data = await request('/feed', { method: 'POST', body: payload })
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
  addMoment(newMoment, '动态')
  return { ok: true, id: newMoment.id }
}

// ---- 获取当前设备 ID（简化鉴权用），转交上层 ----
export { getDeviceId }

// ---- 详情 ----
export async function fetchFeedDetail(id) {
  if (FEED_API) {
    try {
      const data = await request('/feed/' + id)
      return normalize(data)
    } catch (e) {
      /* 回落 */
    }
  }
  const all = [...publishState.list, ...moments, ...feedItems]
  return all.find((i) => String(i.id) === String(id)) || null
}

// ---- 点赞 ----
export async function likeFeed(id) {
  if (!FEED_API) return { ok: false }
  try {
    await request('/feed/' + id + '/like', { method: 'POST', body: {} })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '操作失败' }
  }
}

// ---- 评论 ----
export async function commentFeed(id, text, { parentCommentId = 0, replyTo = '' } = {}) {
  if (!FEED_API) return { ok: false }
  try {
    // 后端评论字段名是 content（非 text）；parentCommentId>0 为楼中楼回复
    const data = await request('/feed/' + id + '/comment', {
      method: 'POST',
      body: { content: text, parentCommentId, replyTo },
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

// ---- 广场热门活动（只读；运营后台可配基础活动）----
export async function fetchActivities(params = {}) {
  if (!FEED_API) return []
  try {
    const qs = new URLSearchParams(params).toString()
    const url = '/activities' + (qs ? '?' + qs : '')
    const data = await request(url)
    return data.list || []
  } catch (e) {
    return []
  }
}

// ---- 关注 / 取关 / 检查（动态关注流）----
export async function followUser(followeeDevice) {
  try {
    await request('/follow', { method: 'POST', body: { followerDevice: getDeviceId(), followeeDevice } })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '关注失败' }
  }
}
export async function unfollowUser(followeeDevice) {
  try {
    await request(`/follow?followerDevice=${encodeURIComponent(getDeviceId())}&followeeDevice=${encodeURIComponent(followeeDevice)}`, { method: 'DELETE' })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '取关失败' }
  }
}
export async function checkFollow(followeeDevice) {
  try {
    const data = await request(`/follow/check?follower=${encodeURIComponent(getDeviceId())}&followee=${encodeURIComponent(followeeDevice)}`)
    return !!data.following
  } catch (e) {
    return false
  }
}

// ---- 举报（UGC 内容安全闭环）----
export async function reportFeed(id, reason) {
  try {
    await request(`/feed/${id}/report`, { method: 'POST', body: { reason, reporterDevice: getDeviceId() } })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message || '举报失败' }
  }
}
