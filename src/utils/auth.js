// ============================================================
// 登录 Gate —— 所有需登录态的交互统一走这里
// ------------------------------------------------------------
// 决策（坤哥 2026-08-14 拍板，全选 A）：登录态缺失时跳原生登录。
// 调用方：发布 / 点赞 / 关注 / 收藏 / 立即定制 / 车型详情留资 等。
// 用法：
//   const ok = await requireLogin()
//   if (!ok) return          // 已自动拉起原生登录，终止后续交互
//   ...原生业务流程...
// ============================================================

import { bridge } from '../bridge'

/**
 * 校验登录态。
 * @returns {Promise<boolean>} true=已登录可继续；false=未登录（已拉起原生登录）
 */
export async function requireLogin() {
  // 最多重试 2 次（等原生 bridge 注入 token），每次间隔 500ms
  for (let attempt = 0; attempt < 2; attempt++) {
    let token = ''
    try {
      token = (await bridge.getAuthToken()) || (await bridge.getToken()) || ''
    } catch (e) {
      token = ''
    }
    if (token) return true
    // 首次失败且还有重试机会：等一下再试（原生 bridge 可能还在 exchange-token）
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
  }
  // 确实无 token → 拉起原生登录（决策 A）
  console.warn('[requireLogin] 无可用 token，将拉起原生登录')
  bridge.openNative('login')
  return false
}

/**
 * 取当前登录态 token（不跳转）。
 * @returns {Promise<string>}
 */
export async function getToken() {
  try {
    return (await bridge.getToken()) || ''
  } catch (e) {
    return ''
  }
}

/**
 * 取受限 token（HMAC 鉴权链注入的 getAuthToken），用于接口 Authorization 头。
 * 与 requireLogin 同源，统一收敛到本文件，避免各 API 层重复封装。
 * @returns {Promise<string>}
 */
export async function getAuthToken() {
  try {
    return (await bridge.getAuthToken()) || ''
  } catch (e) {
    return ''
  }
}

/**
 * 统一鉴权请求头：有 token 才带 Authorization，无则仅 Content-Type（公开读请求不阻塞）。
 * @returns {Promise<Record<string,string>>}
 */
export async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getAuthToken()
  if (token) headers.Authorization = 'Bearer ' + token
  return headers
}
