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
    // 优先受限 token（HMAC 鉴权链注入的 getAuthToken），回退主 token；任一存在即视为已登录
    token = (await bridge.getAuthToken()) || (await bridge.getToken()) || ''
  } catch (e) {
    token = ''
  }
  if (token) return true
  // 兜底：Flutter 已注入真实用户资料即视为已登录。
  // 背景：登录 token 注入在 Flutter 侧曾长期未定案，导致真机已登录却因取不到独立 token 误弹登录。
  // 契约语义（INTEGRATION.md §getUserInfo）：未登录返回 null 或空对象；登录后返回非空用户资料。
  // 因此「返回非空对象」即视为已登录（字段名不必限定 email/nickname/token，兼容 Flutter 版本差异；
  //   后续 API 落库仍依赖 getAuthToken 的 token，后端 requireAuth 做最终鉴权）。
  try {
    const u = await bridge.getUserInfo()
    if (u && typeof u === 'object' && Object.keys(u).length > 0) return true
  } catch (e) { /* 未实现则继续走登录 */ }
  // 无登录证据 → 拉起原生登录（决策 A）
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
