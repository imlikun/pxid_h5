// 互动消息（通知）跨页缓存：列表页 load 后写入，详情页按 id 取用，
// 避免重复请求、也避免从详情页返回时上下文丢失。
// 模块级单例（reactive Map），InteractionView 写入、InteractionDetailView 读取。
import { reactive } from 'vue'

export const notifMap = reactive(new Map())

export function cacheNotifications(list = []) {
  list.forEach((n) => notifMap.set(String(n.id), n))
}

export function getNotification(id) {
  return notifMap.get(String(id)) || null
}
