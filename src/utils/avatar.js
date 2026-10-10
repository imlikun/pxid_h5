// ============================================================
// 头像兜底 / 确定性占位
// ------------------------------------------------------------
// 问题：
//   1. 真实头像是 http:// 明文 OSS URL（Flutter getUserInfo 返回），H5 跑在 HTTPS
//      环境（appin.site / pxid-api.appin.site），浏览器对「HTTPS 页加载 HTTP 图片」
//      执行混合内容拦截 → 真实头像不显示（破图）。OSS 实测同时支持 https。
//   2. 旧的 unsplash/ 相对路径 404。
//   3. 兜底图加载失败时需降级为本地 SVG。
// 方案：
//   1. http:// 自动升级为 https://（根治混合内容拦截）
//   2. 真实头像优先显示（完整 https / data URI）
//   3. 无/无效头像与旧示例人像 → 按昵称分配稳定的骑行插画头像
//   4. 真实用户上传与 PXID 品牌图保留；错误兜底使用本地 SVG，不循环请求
// ============================================================
import { riderAvatarSvg } from './avatarArt'

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
  const svg = riderAvatarSvg(stringHash(String(name || '').trim()))
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function isSeedAvatar(url) {
  // Only replace portraits bundled as demonstration data, never an uploaded photo.
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'appin.site' && /^\/nav\/pxid-h5\/unsplash\/photo-[^/]+_w_80_q_80\.jpg$/.test(parsed.pathname)
  } catch { return false }
}

export function resolveAvatar(name = '', avatar = '') {
  const safe = upgradeHttpToHttps(String(avatar || '').trim())
  if (isValidAvatarUrl(safe) && !isSeedAvatar(safe)) return safe
  return generateAvatarSvg(name)
}

// <img @error> 兜底：加载失败 → 本地插画（data URI 不会再失败，不会死循环）
export function handleAvatarError(e, name = '') {
  const el = e && e.target
  if (!el) return
  const fb = generateAvatarSvg(name)
  if (el.getAttribute('src') !== fb) el.setAttribute('src', fb)
}
