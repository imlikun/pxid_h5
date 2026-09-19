// 图片上传前压缩（2026-09-19）
// 背景：生产库 uploads 里用户原图达 3.2~3.6MB/张，且 pxid-api 的 /uploads 走 no-store，
//       导致详情页每次进入都要重下数 MB 原图，弱网下卡顿明显。
// 策略（保守、可回退，绝不把图变得更差或更大）：
//   - 非图片（视频等）原样返回；
//   - GIF 动图跳过（canvas 会丢动画帧）；
//   - 已足够小（≤ skipBelow）跳过，不做无意义重编码；
//   - 解码失败（如老内核不支持 HEIC）原样返回，让后端原有校验决定；
//   - 最长边缩到 maxEdge 以内，统一重编码为 JPEG；
//   - 若压缩结果反而 >= 原体积，回退原文件。
const MAX_EDGE = 1920
const QUALITY = 0.82
const SKIP_BELOW = 260 * 1024 // 260KB 以下的图不值得再压

function loadViaImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch (e) {
      /* 回退 Image 解码 */
    }
  }
  return loadViaImage(file)
}

/**
 * 压缩单张图片；任何失败路径都返回原文件（调用方无需区分）。
 * @param {File|Blob} file
 * @param {{maxEdge?:number, quality?:number, skipBelow?:number}} [opts]
 * @returns {Promise<File|Blob>}
 */
export async function compressImage(file, opts = {}) {
  try {
    const maxEdge = opts.maxEdge || MAX_EDGE
    const quality = opts.quality || QUALITY
    const skipBelow = opts.skipBelow == null ? SKIP_BELOW : opts.skipBelow
    if (!file || !/^image\//i.test(file.type || '')) return file
    if (file.type === 'image/gif') return file
    if (file.size && file.size <= skipBelow) return file
    if (typeof document === 'undefined') return file

    const bmp = await decode(file)
    if (!bmp) return file
    const w0 = bmp.width || bmp.naturalWidth || 0
    const h0 = bmp.height || bmp.naturalHeight || 0
    if (!w0 || !h0) return file

    const scale = Math.min(1, maxEdge / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    if (typeof bmp.close === 'function') bmp.close()

    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob(resolve, 'image/jpeg', quality)
      } catch (e) {
        resolve(null)
      }
    })
    if (!blob || blob.size >= file.size) return file

    const base = (file.name || 'image').replace(/\.[^.]+$/, '')
    return new File([blob], base + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })
  } catch (e) {
    return file
  }
}

export default compressImage
