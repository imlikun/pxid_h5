// 列表 → 详情的「快照直出」缓存
//
// 背景（2026-09-05 坤哥反馈）：从发现页进详情，横滑 300ms 期间详情接口还没回来，
// 整页是「蓝色加载圈 + 加载中」，转场结束还在转 —— 一进一出看着非常乱。
//
// 解法：列表卡片手里本来就有这条帖子的全部展示字段（标题/作者/头像/图/点赞数），
// 点击时先把这份「快照」塞进缓存，详情页进来直接用它渲染（零等待），
// 接口返回后再静默替换（stale-while-revalidate）。整个过程用户只看得到一次横滑。
//
// ⚠️ 2026-09-11（问题①②根治）：9-08 上线 ToFlutter_H5OpenFeedDetail 全屏 WebView 契约后，
// 卡片点击 = Flutter 新开一个全屏 WebView 打开详情 —— JS 环境全新，**模块级 Map 必然读不到**，
// 于是「每次进详情 = 冷启动」：骨架/空态/转圈全部复现。
// 所以快照除了写内存，再写一份到 Web Storage，让新 WebView 里也能读到：
//   · localStorage  —— 同源同 App 跨 WebView 最可能共享的一层
//                      （Android 共享 profile DOM storage；iOS 共享 WKWebsiteDataStore）。
//                      持久化存储有残留风险，故带 10 分钟 TTL，过期即失效并清除。
//   · sessionStorage —— 次选（部分实现按 WebView 隔离），命中即为白赚。
// 读取顺序：内存 → sessionStorage → localStorage。任一命中即「首帧有内容」，
// 空态、骨架、加载圈都不会出现。（2026-09-11 待真机验证两层的实际共享行为。）
//
// 用模块级 Map 而非路由 state：① 不受 history state 大小限制；
// ② 刷新/分享直开时 state 会丢，行为不可预测；③ 返回再进同一条仍需可用（故不删除）。

const LIMIT = 40
const cache = new Map()

// ---- Web Storage 跨 WebView 兜底 ----
const SS_PREFIX = 'pxid_fs:'
const SS_INDEX = 'pxid_fs_keys'
const LS_PREFIX = 'pxid_fs_ls:'
const LS_INDEX = 'pxid_fs_ls_keys'
const LS_TTL = 10 * 60 * 1000 // localStorage 快照有效期 10 分钟

function ss() {
  try { return window.sessionStorage } catch (e) { return null }
}
function ls() {
  try { return window.localStorage } catch (e) { return null }
}

// 写一条到指定 Storage，并维护索引做 LRU 淘汰（避免单 id 键无限堆积占满配额）
function wStore(store, prefix, indexKey, id, item, withTtl) {
  if (!store) return
  try {
    store.setItem(prefix + id, JSON.stringify(withTtl ? { t: Date.now(), d: item } : item))
    let keys = []
    try { keys = JSON.parse(store.getItem(indexKey) || '[]') } catch (e) { keys = [] }
    if (!Array.isArray(keys)) keys = []
    keys = keys.filter((k) => k !== id)
    keys.push(id)
    while (keys.length > LIMIT) {
      const old = keys.shift()
      try { store.removeItem(prefix + old) } catch (e) { /* 忽略 */ }
    }
    store.setItem(indexKey, JSON.stringify(keys))
  } catch (e) {
    // 配额满 / 隐私模式 / 存储被禁用：静默降级，内存缓存仍然可用
  }
}

function rStore(store, prefix, id, withTtl) {
  if (!store) return null
  try {
    const raw = store.getItem(prefix + id)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (withTtl) {
      if (!v || typeof v.t !== 'number' || Date.now() - v.t > LS_TTL) {
        try { store.removeItem(prefix + id) } catch (e) { /* 忽略 */ }
        return null
      }
      return v.d || null
    }
    return v
  } catch (e) {
    return null
  }
}

export function putFeedSnapshot(item) {
  if (!item || item.id == null) return
  const key = String(item.id)
  const snap = { ...item }
  cache.delete(key)
  cache.set(key, snap)
  // 简易 LRU：超出上限淘汰最早的一条（Map 保持插入顺序）
  if (cache.size > LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  wStore(ss(), SS_PREFIX, SS_INDEX, key, snap, false)
  wStore(ls(), LS_PREFIX, LS_INDEX, key, snap, true)
}

export function getFeedSnapshot(id) {
  if (id == null) return null
  const key = String(id)
  const hit = cache.get(key)
  if (hit) return { ...hit }
  // 跨 WebView 兜底（见文件头说明）：新 WebView 里内存必然为空，去 Web Storage 找
  const fromSs = rStore(ss(), SS_PREFIX, key, false)
  if (fromSs) return { ...fromSs }
  const fromLs = rStore(ls(), LS_PREFIX, key, true)
  if (fromLs) return { ...fromLs }
  return null
}
