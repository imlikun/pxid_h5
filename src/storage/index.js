// 统一媒体存储抽象层（StorageAdapter）
// 切换存储仅改 VITE_STORAGE_DRIVER（local | oss），业务代码零改：
//   local = 落 ECS /uploads，前端走 /media/upload，getUrl 拼 API_BASE
//   oss   = 阿里云 OSS + CDN，前端直传 OSS SDK（STS），getUrl 拼 CDN_BASE
const DRIVER = (import.meta.env && import.meta.env.VITE_STORAGE_DRIVER) || 'local'
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || 'https://pxid-api.appin.site'
const CDN_BASE = (import.meta.env && import.meta.env.VITE_CDN_BASE) || ''

// 由 objectKey 拼可访问 URL；若传入已是完整 URL（如 Flutter 桥预传）则直接透传
export function mediaUrl(key) {
  if (!key) return ''
  const k = String(key).trim()
  if (/^https?:\/\//i.test(k)) return k
  const clean = k.replace(/^\/+/, '')
  if (DRIVER === 'oss' && CDN_BASE) return CDN_BASE.replace(/\/+$/, '') + '/' + clean
  return API_BASE.replace(/\/+$/, '') + '/' + clean
}

// 上传文件，返回 { objectKey, url, type }；oss 模式走 OSS SDK+STS（迁移阶段骨架）
export async function uploadMedia(file, token) {
  if (DRIVER === 'oss') {
    throw new Error('OSS 直传未实现（迁移阶段，请切 VITE_STORAGE_DRIVER=local）')
  }
  const fd = new FormData()
  fd.append('file', file)
  const r = await fetch(API_BASE + '/media/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd,
  })
  const j = await r.json()
  if (j.code === 0 && j.data) return j.data
  throw new Error(j.message || 'UPLOAD_FAIL')
}
