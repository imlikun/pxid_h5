// 已发布动态
// 联调接入真实 API 后由后端持久化统一下发；当前 H5 预览态：
//   - 内存态 reactive（本会话内实时可见）
//   - localStorage 兜底（刷新不丢、本机跨会话可见）
import { reactive } from 'vue'
import bridge from '../bridge'

// localStorage 兜底按「账号」分区（2026-09-01 与北帆整改清单对齐 第4节）：
// 旧 key 是全局固定值，同一台设备切账号后草稿/本地发布列表会互相串。
// ⚠️ 分区键必须用 memberUserId（随账号变），不能用 deviceId（设备稳定 ID，切账号不变）。
const BASE_KEY = 'pxid_h5_my_moments_v1'
const API_BASE = 'https://pxid-api.appin.site'
let scopeKey = BASE_KEY

function loadLocal() {
  try {
    const raw = localStorage.getItem(scopeKey)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function saveLocal(list) {
  try {
    localStorage.setItem(scopeKey, JSON.stringify(list.slice(0, 50)))
  } catch (e) {
    /* 忽略存储失败 */
  }
}

// 解析当前登录账号的 memberUserId：优先原生桥，回退 /users/me（后端已返回该字段）
async function resolveMemberUserId() {
  try {
    const u = await bridge.getUserInfo()
    const mid = u && (u.memberUserId || u.member_user_id)
    if (mid) return String(mid)
  } catch (e) { /* 未实现则走接口 */ }
  try {
    const tk = (await bridge.getAuthToken()) || ''
    if (!tk) return ''
    const r = await fetch(API_BASE + '/users/me', { headers: { Authorization: 'Bearer ' + tk } })
    const j = await r.json()
    if (j && j.code === 0 && j.data) return String(j.data.memberUserId || '')
  } catch (e) { /* 取不到则退回全局 key */ }
  return ''
}

// 幂等：解析一次账号分区并重载本地列表；账号变化（切号）时会自动换 key 重载。
let scopePromise = null
export function ensurePublishScope() {
  if (!scopePromise) {
    scopePromise = resolveMemberUserId()
      .then((mid) => {
        const k = mid ? BASE_KEY + ':' + mid : BASE_KEY
        if (k !== scopeKey) {
          scopeKey = k
          publishState.list = loadLocal()
        }
        return scopeKey
      })
      .catch(() => scopeKey)
  }
  return scopePromise
}

export const publishState = reactive({
  list: loadLocal(),
  // 发布后让发现页自动切到「动态」tab 展示新内容
  pendingTab: null,
})

// 预置本地图库（dist 内已存在、可直接引用，避免无后端上传）
export const publishGallery = [
  'feed_r1.jpg',
  'feed_r2.jpg',
  'feed_d1.jpg',
  'feed_d2.jpg',
  'feed_d3.jpg',
  'feed_r3.jpg',
  'plaza_p1.jpg',
  'plaza_p2.jpg',
]

export function addMoment(m, tab) {
  publishState.list.unshift(m)
  publishState.pendingTab = tab || null
  saveLocal(publishState.list)
}
