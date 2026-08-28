// ============================================================
// 头像兜底 / 确定性占位
// ------------------------------------------------------------
// 问题：后端返回空 avatar 或旧的无效 defaultAvatar 时，前端 fallback 到
//       `unsplash/...` 相对路径会 404，显示缺图 icon。
// 方案：
//   1. 真实头像优先显示
//   2. 无真实头像时按昵称生成确定性首字母头像（每人颜色不同）
//   3. 旧的 `unsplash/` 本地相对路径也视为无效，走兜底
// ============================================================

function isValidAvatarUrl(url = '') {
  const u = String(url || '').trim()
  if (!u) return false
  if (u.toLowerCase() === 'null' || u.toLowerCase() === 'undefined') return false
  // 必须以远程 http(s) / data URI / 原生可识别协议开头；排除旧的本地相对路径
  if (/^unsplash\//i.test(u)) return false
  return /^https?:\/\//i.test(u) || /^data:/i.test(u)
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
  if (isValidAvatarUrl(avatar)) return String(avatar).trim()
  return generateAvatarSvg(name)
}
