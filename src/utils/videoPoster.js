// 视频首帧封面：后端未返 videoCover 时，动态建 video 截首帧生成 dataURL。
// 复用于 FeedDetailView / FeedCard / MomentCard，避免三处重复实现。
// 跨域受限或失败时返回 null，调用方自行回退占位图。
export function captureVideoPoster(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    let settled = false
    const done = (val) => {
      if (!settled) {
        settled = true
        resolve(val)
      }
    }
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(0.5, video.duration || 0.5)
      } catch (e) {
        /* ignore */
      }
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = video.videoWidth || 1280
        const h = video.videoHeight || 720
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(video, 0, 0, w, h)
        done(canvas.toDataURL('image/jpeg', 0.85))
      } catch (e) {
        done(null)
      }
    }
    video.onerror = () => done(null)
    // 超时兜底，避免极端情况下 Promise 永不 settle
    setTimeout(() => done(null), 8000)
    video.src = url
  })
}
