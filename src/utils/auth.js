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
  let token = ''
  try {
    token = (await bridge.getToken()) || ''
  } catch (e) {
    token = ''
  }
  if (token) return true
  // 无 token → 拉起原生登录（决策 A）
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
