// 侧边滑动返回（iOS/Android 通用手势）：
// - 左缘 ≤24px 右滑 / 右缘 ≥屏宽-24px 左滑，|dx|>|dy| 防竖向滚动误触
// - 跟手 translateX，松手过阈值弹走返回、不足回弹
// - 可返回（history.state.back 非空）→ 正常返回上一页
// - 不可返回（根页面，如动态详情作为入口）→ 第一次侧滑提示「再按一次退出程序」，2s 内再滑退出 App
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { bridge } from '../bridge'

export function useSwipeBack(elRef, opts = {}) {
  const router = useRouter()
  const edge = opts.edge ?? 24
  const threshold = opts.threshold ?? Math.min(70, (typeof window !== 'undefined' ? window.innerWidth : 375) * 0.3)
  const exitInterval = opts.exitInterval ?? 2000 // 双按退出时间窗
  const onToast = opts.onToast || null // 显示「再按一次退出程序」提示
  const onExit = opts.onExit || null // 自定义退出动作，默认 bridge.exit()

  let startX = 0
  let startY = 0
  let startEdge = null // 'left' | 'right' | null
  let active = false
  let dx = 0
  let lastExitTs = 0

  function canGoBack() {
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
      elRef.value.style.willChange = ''
    }
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1 || isTyping()) return
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
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return // 轻触未移动
      if (Math.abs(dx) <= Math.abs(dy)) { startEdge = null; return } // 竖向滚动
      if (startEdge === 'left' && dx <= 0) { startEdge = null; return } // 方向不符
      if (startEdge === 'right' && dx >= 0) { startEdge = null; return }
      active = true
      if (elRef && elRef.value) elRef.value.style.willChange = 'transform'
    }
    if (elRef && elRef.value) {
      elRef.value.style.transition = 'none'
      elRef.value.style.transform = `translateX(${dx}px)`
    }
  }

  function onTouchEnd() {
    if (!startEdge) return
    const el = elRef && elRef.value
    const move = dx
    const pass = startEdge === 'left' ? move > threshold : -move > threshold
    if (el) el.style.transition = 'transform 0.28s ease'

    if (!pass) {
      if (el) el.style.transform = 'translateX(0)'
      startEdge = null
      active = false
      return
    }

    if (canGoBack()) {
      // 可返回：弹走返回
      if (el) el.style.transform = `translateX(${startEdge === 'left' ? window.innerWidth * 0.45 : -window.innerWidth * 0.45}px)`
      const t = setTimeout(() => {
        router.back()
        resetEl()
        clearTimeout(t)
      }, 200)
    } else {
      // 不可返回（H5 根页面，如动态详情作为入口）：返回上一级 = 弹回 Flutter 原生页面
      resetEl()
      const canPop = !!(window.PXIDBridge && typeof window.PXIDBridge.popPage === 'function')
      if (canPop) {
        bridge.popPage().catch(() => {})
        startEdge = null
        active = false
        return
      }
      // Flutter 未实现 popPage 契约：降级双按退出（第一次提示，2s 内第二次退出）
      const now = Date.now()
      if (lastExitTs && now - lastExitTs < exitInterval) {
        lastExitTs = 0
        if (onExit) onExit()
        else bridge.exit()
      } else {
        lastExitTs = now
        if (onToast) onToast()
      }
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
