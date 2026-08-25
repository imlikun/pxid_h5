// 社区成长体系 API（签到 / 积分 / 勋章 / 用户组）
// 后端：GET /growth/profile、POST /growth/signin、GET /growth/medals（均 requireAuth）
// 与 notifications.js 一致：走 API_BASE（pxid-api.appin.site），路径无 /api 前缀
import { API_BASE } from './shop'
import { bridge } from '../bridge'

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = bridge.getAuthToken ? await bridge.getAuthToken() : ''
  if (token) headers['Authorization'] = 'Bearer ' + token
  return headers
}

async function req(method, path, body) {
  const opt = { method, headers: await authHeaders() }
  if (body) opt.body = JSON.stringify(body)
  const r = await fetch(`${API_BASE}${path}`, opt)
  const j = await r.json().catch(() => ({ code: -1, message: 'parse error', data: null }))
  if (j.code !== 0) throw new Error(j.message || ('HTTP ' + r.status))
  return j.data
}

export async function fetchGrowthProfile() {
  return req('GET', '/growth/profile')
}
export async function doSignin() {
  return req('POST', '/growth/signin')
}
export async function fetchMedals() {
  return req('GET', '/growth/medals')
}
