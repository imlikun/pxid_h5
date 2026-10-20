// ============================================================
// 社交只读模式（2026-10-20，小米应用商店上架审核用）
// ------------------------------------------------------------
// 非显性开关：只在构建时生效，不在任何界面暴露入口。
//   VITE_SOCIAL_MODE=readonly    → 只读（隐藏发帖/评论/收藏/点赞/分享/关注）
//   VITE_SOCIAL_DISABLED=1       → 同上（兼容写法）
//   VITE_CHANNEL=xiaomi          → 小米渠道包自动只读
// 默认（不传）= 正常社交模式，正式站行为不变。
// 仅开发态允许 localStorage 临时切换，便于本地验收；生产构建会被
// import.meta.env.DEV=false 短路，不保留任何可切换后门。
// ============================================================
const env = (import.meta && import.meta.env) || {}
const mode = String(env.VITE_SOCIAL_MODE || '').toLowerCase()
const disabled = String(env.VITE_SOCIAL_DISABLED || '') === '1'
const channel = String(env.VITE_CHANNEL || '').toLowerCase()

let devOverride = ''
if (env.DEV) {
  try { devOverride = String(window.localStorage.getItem('__pxid_social_mode') || '').toLowerCase() } catch (e) {}
}

export const isSocialReadOnly =
  devOverride === 'readonly' || disabled || mode === 'readonly' || channel === 'xiaomi'

export default isSocialReadOnly
