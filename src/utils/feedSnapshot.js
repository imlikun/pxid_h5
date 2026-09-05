// 列表 → 详情的「快照直出」缓存
//
// 背景（2026-09-05 坤哥反馈）：从发现页进详情，横滑 300ms 期间详情接口还没回来，
// 整页是「蓝色加载圈 + 加载中」，转场结束还在转 —— 一进一出看着非常乱。
//
// 解法：列表卡片手里本来就有这条帖子的全部展示字段（标题/作者/头像/图/点赞数），
// 点击时先把这份「快照」塞进内存缓存，详情页进来直接用它渲染（零等待），
// 接口返回后再静默替换（stale-while-revalidate）。整个过程用户只看得到一次横滑。
//
// 用模块级 Map 而非路由 state：① 不受 history state 大小限制；
// ② 刷新/分享直开时 state 会丢，行为不可预测；③ 返回再进同一条仍需可用（故不删除）。

const LIMIT = 40
const cache = new Map()

export function putFeedSnapshot(item) {
  if (!item || item.id == null) return
  const key = String(item.id)
  cache.delete(key)
  cache.set(key, { ...item })
  // 简易 LRU：超出上限淘汰最早的一条（Map 保持插入顺序）
  if (cache.size > LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

export function getFeedSnapshot(id) {
  if (id == null) return null
  const hit = cache.get(String(id))
  return hit ? { ...hit } : null
}
