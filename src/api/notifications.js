// 互动消息（通知）数据层：对接后端 /notifications（自有后端，不依赖 Flutter）
import { API_BASE } from './shop'
import { bridge } from '../bridge'

async function authHeaders() {
  const token = await bridge.getAuthToken()
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || '') }
}

export async function fetchNotifications() {
  try {
    const r = await fetch(`${API_BASE}/notifications`, { headers: await authHeaders() })
    const j = await r.json()
    return (j.data && j.data.list) || []
  } catch (e) {
    console.error('[notif] fetch failed:', e.message || e)
    return []
  }
}

export async function fetchUnreadCount() {
  try {
    const r = await fetch(`${API_BASE}/notifications/unread-count`, { headers: await authHeaders() })
    const j = await r.json()
    return (j.data && j.data.count) || 0
  } catch (e) {
    return 0
  }
}

export async function markNotificationRead(id) {
  try {
    await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST', headers: await authHeaders() })
  } catch (e) {
    /* 忽略 */
  }
}

export async function markAllRead() {
  try {
    await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST', headers: await authHeaders() })
  } catch (e) {
    /* 忽略 */
  }
}
