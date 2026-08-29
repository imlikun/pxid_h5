// 官方公告已读状态（唯一真相源）
//
// 设计要点：把「红点(已读)」与「召回强确认(已确认)」解耦，避免互相污染
//   - 已读 readMap：进入公告详情即记录 → 驱动发现页「官方公告」入口红点 + 列表未读圆点（产品诉求：读完就消）
//   - 已确认 ackMap：仅 forceAck 召回公告点「已知悉」才记录 → 驱动召回横幅与详情强制确认按钮
//     （召回属安全合规强提醒，不能因为"点开看过"就解除，必须用户显式确认）
//
// 为什么不放进 mock 数据：mock 是普通数组（非 reactive），computed 追踪不到属性变化，
// 红点不会响应消失；且 mock 每次刷新会重置，读过的公告会重新亮红点。
import { reactive, computed } from 'vue'
import { notices } from '../data/mock'

const READ_KEY = 'pxid.notice.read.v1'
const ACK_KEY = 'pxid.notice.ack.v1'

function load(key, fallbackFn) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object') return obj
    }
  } catch (e) {
    // localStorage 不可用（隐私模式 / 无存储权限）：降级为内存态，功能不受影响，仅刷新后复位
  }
  const base = {}
  notices.forEach((n) => {
    if (fallbackFn(n)) base[n.id] = 1
  })
  return base
}

function persist(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch (e) {
    /* 存储不可用时静默降级为内存态 */
  }
}

// 已读：首次以 mock 的 isRead 为基线（N3/N4 默认已读）
const readMap = reactive(load(READ_KEY, (n) => !!n.isRead))
// 召回强确认：mock 无该字段，初始全部未确认
const ackMap = reactive(load(ACK_KEY, () => false))

export function isNoticeRead(id) {
  return !!readMap[id]
}

export function isNoticeAcked(id) {
  return !!ackMap[id]
}

// 进入详情即调用：消除红点与列表未读圆点
export function markNoticeRead(id) {
  if (!id || readMap[id]) return
  readMap[id] = 1
  persist(READ_KEY, readMap)
}

// 召回公告点「已知悉」：同时记为已读 + 已确认
export function markNoticeAck(id) {
  if (!id) return
  if (!readMap[id]) {
    readMap[id] = 1
    persist(READ_KEY, readMap)
  }
  if (!ackMap[id]) {
    ackMap[id] = 1
    persist(ACK_KEY, ackMap)
  }
}

export function markAllNoticesRead() {
  notices.forEach((n) => {
    readMap[n.id] = 1
  })
  persist(READ_KEY, readMap)
}

// 演示/回归用：清空已读与确认状态，红点重新出现
export function resetNoticeRead() {
  Object.keys(readMap).forEach((k) => delete readMap[k])
  Object.keys(ackMap).forEach((k) => delete ackMap[k])
  persist(READ_KEY, readMap)
  persist(ACK_KEY, ackMap)
}

// 未读数（驱动发现页「官方公告」入口红点）
export const noticeUnread = computed(() => notices.filter((n) => !readMap[n.id]).length)
