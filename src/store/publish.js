// 已发布动态
// 联调接入真实 API 后由后端持久化统一下发；当前 H5 预览态：
//   - 内存态 reactive（本会话内实时可见）
//   - localStorage 兜底（刷新不丢、本机跨会话可见）
import { reactive } from 'vue'

const STORAGE_KEY = 'pxid_h5_my_moments_v1'

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
}

function saveLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
  } catch (e) {
    /* 忽略存储失败 */
  }
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
