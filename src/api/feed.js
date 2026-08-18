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

// 后端就绪后改为真实地址（2026-08-18 已上线 pxid-api.appin.site）
const FEED_API = 'https://pxid-api.appin.site'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(FEED_API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
      const qs = new URLSearchParams({ tab, ...params }).toString()
      const data = await request('/feed?' + qs)
      return (data.list || []).map(normalize)
    } catch (e) {
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
export async function commentFeed(id, text) {
  if (!FEED_API) return { ok: false }
  try {
    // 后端评论字段名是 content（非 text）
    const data = await request('/feed/' + id + '/comment', {
      method: 'POST',
      body: { content: text },
    })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, message: e.message || '评论失败' }
  }
}
