// 页面转场方向管理（iOS 风格横向推进）
//
// 背景：App.vue 的 router-view 之前没有包 <transition>，页面切换是瞬间硬切（jump cut），
// 而返回时 Flutter 全局手势是有横滑动画的，进出不对称导致观感割裂。
//
// 方向判定：Vue Router 4 会在 history.state 里维护 position（每次 push 自增、back 回退），
// 比「猜用户点了返回还是点了链接」可靠得多，浏览器/手势/原生返回键全覆盖。
//
// ⚠️ 同时约定：底部 tab 之间互切**不做**横推。tab 是平级关系不是层级推进，
// 横推会让人误以为钻进了下一层（Material 的 shared axis 规范也要求平级用 fade 而非 slide）。
import { ref } from 'vue'

// 底部 tab 路由（平级关系，互切不动画）
const TAB_PATHS = ['/discover', '/featured', '/service']

export const transitionName = ref('')

let lastPos = 0
let booted = false

function historyPos() {
  try {
    const s = typeof window !== 'undefined' ? window.history.state : null
    return s && typeof s.position === 'number' ? s.position : 0
  } catch (_) {
    return 0
  }
}

export function setupPageTransition(router) {
  router.afterEach((to, from) => {
    const pos = historyPos()

    // 首屏加载：没有任何可对比的历史，直接无动画，避免开场就横滑一下
    if (!booted || !from || !from.name) {
      booted = true
      lastPos = pos
      transitionName.value = ''
      return
    }

    // tab 互切：平级关系，不加转场
    if (TAB_PATHS.includes(to.path) && TAB_PATHS.includes(from.path)) {
      lastPos = pos
      transitionName.value = ''
      return
    }

    // position 变大=前进（新页从右滑入）；变小或不变=返回（旧页向右滑出）
    // 注：replace 导航 position 不变，归入 back 更符合直觉（replace 多用于「回到列表」类场景）
    transitionName.value = pos > lastPos ? 'slide-forward' : 'slide-back'
    lastPos = pos
  })
}
