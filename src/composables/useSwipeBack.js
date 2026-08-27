// 侧边滑动返回（iOS/Android 通用手势）：左右边缘向内滑 → 返回上一页
// - 左缘 ≤24px 右滑 / 右缘 ≥屏宽-24px 左滑
// - |dx|>|dy| 防竖向滚动误触；起手方向错误直接放弃
// - 跟手：拖动时目标元素 translateX 跟随，松手过阈值弹走返回、不足回弹
// - 仅「可返回」页面生效（vue-router history.state.back 非空）；输入框聚焦时禁用
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export function useSwipeBack(elRef, opts = {}) {
  const router = useRouter()
  const edge = opts.edge ?? 24
  const threshold = opts.threshold ?? Math.min(70, (typeof window !== 'undefined' ? window.innerWidth : 375) * 0.3)
  const allowBack = opts.allowBack || null

  let startX = 0
  let startY = 0
  let startEdge = null // 'left' | 'right' | null
  let active = false
  let dx = 0

  function canGoBack() {
    if (allowBack !== null && typeof allowBack === 'function') return !!allowBack()
    const s = router.options.history.state
    return !!(s && s.back !== null && s.back !== undefined)
  }

  function isTyping() {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
  }

  function resetEl() {
    if (elRef && elRef.value) {
      elRef.value.style.transition = ''
      elRef.value.style.transform = ''
    }
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1 || isTyping() || !canGoBack()) return
    const t = e.touches[0]
    const w = window.innerWidth
    startX = t.clientX
    startY = t.clientY
    startEdge = startX <= edge ? 'left' : startX >= w - edge ? 'right' : null
    active = false
    dx = 0
  }

  function onTouchMove(e) {
    if (!startEdge) return
    const t = e.touches[0]
    dx = t.clientX - startX
    const dy = t.clientY - startY
    if (!active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return // 轻触未移动，不判定
      if (Math.abs(dx) <= Math.abs(dy)) { startEdge = null; return } // 竖向滚动，放弃
      if (startEdge === 'left' && dx <= 0) { startEdge = null; return } // 方向不符
      if (startEdge === 'right' && dx >= 0) { startEdge = null; return }
      active = true
    }
    // 跟手平移（右缘左滑为负向）
    if (elRef && elRef.value) {
      elRef.value.style.transition = 'none'
      elRef.value.style.transform = `translateX(${startEdge === 'left' ? dx : dx}px)`
      elRef.value.style.boxShadow = '0 0 0 rgba(0,0,0,0)'
    }
  }

  function onTouchEnd() {
    if (!startEdge) return
    const el = elRef && elRef.value
    const move = dx // 左缘右滑 dx>0；右缘左滑 dx<0
    const pass = startEdge === 'left' ? move > threshold : -move > threshold
    if (el) el.style.transition = 'transform 0.28s ease'
    if (pass) {
      if (el) el.style.transform = `translateX(${startEdge === 'left' ? window.innerWidth * 0.45 : -window.innerWidth * 0.45}px)`
      const t = setTimeout(() => {
        if (canGoBack()) router.back()
        resetEl()
        clearTimeout(t)
      }, 200)
    } else {
      if (el) el.style.transform = 'translateX(0)'
    }
    startEdge = null
    active = false
  }

  // 路由切换后清掉残留 transform（keep-alive 缓存页面可能带位移）
  const unwatch = router.afterEach(resetEl)

  onMounted(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    if (unwatch) unwatch()
    resetEl()
  })
}
