// 侧边滑动返回（iOS/Android 通用手势）：
// - 左缘 ≤24px 右滑 / 右缘 ≥屏宽-24px 左滑，|dx|>|dy| 防竖向滚动误触
// - 跟手 translateX，松手过阈值弹走返回、不足回弹
// - 可返回（history.state.back 非空）→ 正常返回上一页
// - 嵌入 Flutter（isNative=true）→ 根页面不退出 App，只 popPage，退出交给 Flutter MainPage
//
// ⚠️ 核心约束（2026-09-01 整改，对应《发现精选_长时间停留后全页无法点击_H5整改清单》）：
// 只要往根元素写过 transform / willChange，`.app-root` 就会变成 containing block 并新建合成层。
// Android WebView 在该状态下若 touchend / touchcancel 被原生手势（系统边缘返回、Flutter PopScope）
// 或前后台冻结吞掉，transform 会永久残留，表现为「页面看着正常、能滚动、但所有点击无效，刷新才恢复」。
// 因此：复位**绝不能只依赖终止事件到达**，必须有一套不依赖 touchend/touchcancel/路由变化/组件卸载的兜底。
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { bridge } from '../bridge'

// 兜底复位超时：手指持续移动时会不断续期；一旦事件流断掉超过该时长，判定为手势被接管，强制复位
const SAFETY_RESET_MS = 450
// 手势可能被系统/原生接管的恢复入口，全部无条件复位（清单 4.2）
const GLOBAL_RESET_EVENTS = ['blur', 'pagehide', 'pageshow', 'resize']

export function useSwipeBack(elRef, opts = {}) {
  const router = useRouter()
  const edge = opts.edge ?? 24
  const threshold = opts.threshold ?? Math.min(70, (typeof window !== 'undefined' ? window.innerWidth : 375) * 0.3)
  const exitInterval = opts.exitInterval ?? 2000 // 双按退出时间窗
  const onToast = opts.onToast || null // 显示「再按一次退出程序」提示（仅独立浏览器模式）
  const onExit = opts.onExit || null // 自定义退出动作（仅独立浏览器模式）

  let startX = 0
  let startY = 0
  let startEdge = null // 'left' | 'right' | null
  let active = false
  let dx = 0
  let lastExitTs = 0
  let safetyResetTimer = null

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

  // 彻底复位根元素。
  // 必须清空字符串，不能改写成 translateX(0)——那依然是 transform，照样创建 containing block。
  //
  // ⚠️ 2026-09-01 二次复核修正：此前这里会通过 `documentElement.style.transform = 'translateZ(0)'`
  // 再靠「两次 requestAnimationFrame」还原来重建合成层。这是本次久停留后全页点不动的**头号放大器**：
  //   1) 它把毒从 .app-root 搬到了 <html>——整页变成一个 containing block + 一个全屏合成层，
  //      影响面比原来大得多（所有 position:fixed 弹层全部改为相对 <html> 定位）；
  //   2) 清除只依赖 requestAnimationFrame，而 WebView 进后台、或被 Flutter IndexedStack /
  //      Offstage 隐藏时 **rAF 完全停摆**——translateZ(0) 就此长期残留，正好对应
  //      「切 Tab 回来」「App 前后台切换」两个触发路径；
  //   3) 更致命的是：本文件所有兜底（450ms timer / blur / pagehide / pageshow / resize /
  //      visibilitychange / resetInteractionLayer）清的都是 elRef，**没有任何一条会去清
  //      documentElement** —— 残留一旦发生就再也没有人能救回来。
  // 现改为「写 → 读布局强制同步 reflow → 立即还原」：全程在同一个同步任务内完成，
  // 不依赖 rAF，后台/Offstage 也不可能中断，因此不可能残留。
  function resetEl() {
    // 防御：清掉历史版本/其它代码可能在 <html> 上留下的 transform（老包残留自愈）
    const doc = document.documentElement
    if (doc.style.transform) doc.style.transform = ''

    const el = elRef && elRef.value
    if (!el) return
    if (!el.style.transform && !el.style.willChange) return // 干净状态，不做任何写入

    el.style.transition = ''
    el.style.transform = ''
    el.style.willChange = ''
    // 强制同步重建一次合成层，修复已经发生的点击命中错位；同一任务内立即还原，零残留
    el.style.transform = 'translateZ(0)'
    void el.offsetHeight // 读取布局属性 → 强制同步 reflow，立刻生效
    el.style.transform = ''
    void el.offsetHeight
  }

  // 兜底复位：清 timer + 手势状态归位 + 元素复位（清单 4.1）
  function resetGestureAndElement() {
    if (safetyResetTimer) {
      clearTimeout(safetyResetTimer)
      safetyResetTimer = null
    }
    startEdge = null
    active = false
    dx = 0
    startX = 0
    startY = 0
    resetEl()
  }

  // 首次开始写 transform 时立即建立兜底复位，且每次 touchmove 续期（清单 4.1）：
  // 只要手指还在动就不断推迟；事件流一旦断掉超过 SAFETY_RESET_MS，判定为被原生接管并强制复位。
  function scheduleSafetyReset() {
    if (safetyResetTimer) clearTimeout(safetyResetTimer)
    safetyResetTimer = setTimeout(() => {
      safetyResetTimer = null
      resetGestureAndElement()
    }, SAFETY_RESET_MS)
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1 || isTyping()) return
    resetGestureAndElement() // 新触摸前清历史残留（残留会让 .app-root 成为 fixed 包含块，弹层错位）
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
    scheduleSafetyReset() // 写入 transform 的同时立刻挂兜底，不等 touchend
  }

  function clearSafetyReset() {
    if (safetyResetTimer) {
      clearTimeout(safetyResetTimer)
      safetyResetTimer = null
    }
  }

  function onTouchEnd() {
    if (!startEdge) return
    clearSafetyReset() // 手势正常收尾，撤掉兜底 timer，避免它中途打断回弹/返回动画
    const el = elRef && elRef.value
    const move = dx
    const pass = startEdge === 'left' ? move > threshold : -move > threshold
    if (el) el.style.transition = 'transform 0.28s ease'

    if (!pass) {
      if (el) {
        el.style.transform = 'translateX(0)'
        // 回弹动画结束彻底清除 transform（translateX(0) 仍是 transform，会创建包含块使 fixed 弹层错位）
        let cleared = false
        const clear = () => { if (cleared) return; cleared = true; resetEl() }
        el.addEventListener('transitionend', clear, { once: true })
        setTimeout(clear, 400) // 兜底：transitionend 不触发时也能清
      }
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
      // 不可返回（H5 根页面）：交给原生 pop，H5 自己绝不退出 App
      resetEl()
      const canPop = !!(window.PXIDBridge && typeof window.PXIDBridge.popPage === 'function')
      if (canPop) {
        bridge.popPage().catch(() => {})
        startEdge = null
        active = false
        return
      }
      // 嵌入 Flutter App 内（真实桥 isNative=true）：根页退出与「再按一次退出」完全由 Flutter MainPage 控制，
      // H5 不调 bridge.exit()、不弹退出提示，避免与 Flutter PopScope 并发消费同一个返回意图（清单 4.3）
      if (bridge.isEmbed) {
        startEdge = null
        active = false
        return
      }
      // 独立浏览器 / 未注入真实桥：保留双按退出（第一次提示，2s 内第二次退出）
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
  const unwatch = router.afterEach(resetGestureAndElement)

  function onTouchCancel() {
    resetGestureAndElement()
  }

  // 供 Flutter 调用的无副作用恢复函数（清单 4.4）：
  // Tab 从 IndexedStack 隐藏恢复可见、App 从后台回前台时调用，作为 H5 自修复之外的双保险
  function installBridgeHints() {
    if (typeof window === 'undefined') return
    window.PXIDBridgeHints = Object.assign(window.PXIDBridgeHints || {}, {
      resetInteractionLayer: () => resetGestureAndElement(),
    })
  }

  onMounted(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchCancel, { passive: true })
    GLOBAL_RESET_EVENTS.forEach((ev) => window.addEventListener(ev, resetGestureAndElement, { passive: true }))
    document.addEventListener('visibilitychange', resetGestureAndElement) // 隐藏与恢复都要复位
    installBridgeHints()
  })

  onUnmounted(() => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchCancel)
    GLOBAL_RESET_EVENTS.forEach((ev) => window.removeEventListener(ev, resetGestureAndElement))
    document.removeEventListener('visibilitychange', resetGestureAndElement)
    if (unwatch) unwatch()
    resetGestureAndElement() // 同时清 timer 与元素残留
  })
}
