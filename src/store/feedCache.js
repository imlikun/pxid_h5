// 帖子详情瞬时缓存：列表卡片点击时写入，详情页进入即可零延迟渲染，
// 避免「先闪『内容不存在』再出真实内容」的竞态。仅供详情页首屏即时展示，
// 真实权威数据仍由 feed.js 异步拉取覆盖。
const cache = new Map()

export function setFeedCache(id, item) {
  if (id == null || !item) return
  cache.set(String(id), item)
}

export function getFeedCache(id) {
  if (id == null) return null
  return cache.get(String(id)) || null
}
