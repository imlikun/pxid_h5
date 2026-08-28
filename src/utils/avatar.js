// ============================================================
// 头像兜底 / 确定性占位
// ------------------------------------------------------------
// 问题：
//   1. 真实头像是 http:// 明文 OSS URL（Flutter getUserInfo 返回），H5 跑在 HTTPS
//      环境（appin.site / pxid-api.appin.site），浏览器对「HTTPS 页加载 HTTP 图片」
//      执行混合内容拦截 → 真实头像不显示（破图）。OSS 实测同时支持 https。
//   2. 旧的 unsplash/ 相对路径 404。
//   3. 兜底图加载失败时需优雅降级为首字母 SVG。
// 方案：
//   1. http:// 自动升级为 https://（根治混合内容拦截）
//   2. 真实头像优先显示（完整 https / data URI）
//   3. 无/无效头像 → 按昵称生成确定性首字母头像（每人颜色不同）
//   4. handleAvatarError 供 <img @error> 兜底：加载失败切首字母 SVG
// ============================================================

function isValidAvatarUrl(url = '') {
  const u = String(url || '').trim()
  if (!u) return false
  if (u.toLowerCase() === 'null' || u.toLowerCase() === 'undefined') return false
  // 必须以远程 http(s) / data URI 开头；排除旧的本地相对路径（unsplash/ uploads/ 等）
  if (/^unsplash\//i.test(u)) return false
  if (/^\.?\/|^\.\./.test(u)) return false
  return /^https?:\/\//i.test(u) || /^data:/i.test(u)
}

// http:// → https:// 升级（根治混合内容拦截；OSS 实测支持 https）
function upgradeHttpToHttps(url = '') {
  const u = String(url || '').trim()
  if (/^http:\/\//i.test(u)) return 'https://' + u.slice(7)
  return u
}

function stringHash(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function generateAvatarSvg(name = '') {
  const s = String(name || '').trim() || '?'
  const initial = s.charAt(0).toUpperCase()
  const hash = stringHash(s)
  const hue = hash % 360
  const saturation = 55 + (hash % 16)
  const lightness = 48 + (hash % 12)
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" fill="${color}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="36" fill="#fff" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="500">${initial}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function resolveAvatar(name = '', avatar = '') {
  const safe = upgradeHttpToHttps(String(avatar || '').trim())
  if (isValidAvatarUrl(safe)) return safe
  return generateAvatarSvg(name)
}

// <img @error> 兜底：加载失败 → 切首字母 SVG（data URI 不会再失败，不会死循环）
export function handleAvatarError(e, name = '') {
  const el = e && e.target
  if (!el) return
  const fb = generateAvatarSvg(name)
  if (el.getAttribute('src') !== fb) el.setAttribute('src', fb)
}
