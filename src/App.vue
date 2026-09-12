<template>
  <div class="app-root" :class="{ 'embed-mode': inApp, 'wv-push-in': wvPushIn, 'product-transition': productTransition }" ref="rootRef">
    <router-view v-slot="{ Component }">
      <transition :name="transitionName" @before-enter="onBeforeEnter" @after-enter="onAfterEnter" @before-leave="onBeforeLeave" @after-leave="onAfterLeave" @enter-cancelled="onEnterCancelled" @leave-cancelled="onLeaveCancelled">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>

    <!-- 底部 tab bar 已彻底移除——浏览器和 App 内都不再显示，由 App 原生 tab 接管 -->
    <transition name="swipe-fade">
      <div v-if="swipeToast" class="swipe-toast">{{ swipeToast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipeBack } from './composables/useSwipeBack'
import { setupPageTransition, transitionName } from './composables/usePageTransition'
import { bridge } from './bridge'
import { initLocale } from './i18n'

const router = useRouter()
const productTransition = ref(false)
router.afterEach((to, from) => { productTransition.value = to.name === 'product' || from.name === 'product' })
// 页面转场方向（forward / back / 无动画），见 usePageTransition.js
setupPageTransition(router)

// ---- 转场与滚动的交接（iOS 语义）----
// 前进：旧页（列表，static）保持滚动位置原样滑出，新页是 fixed 容器自带 scrollTop=0；
//      转场结束摘 fixed 类的同一帧再把 window 滚顶（after-enter 与摘类同 tick，paint 前完成，无中间帧）。
// 返回：列表带着原滚动位置滑入 —— 恢复动作在 router.scrollBehavior 里直接做（时机与原因见其注释）。

// ---- 详情转场视口高度锁定 + 点击锁（2026-09-07 Flutter 联调任务单 3.1/3.5）----
// 根因：Flutter 在 H5 横推中途才隐藏原生底栏 → WebView 高度中途扩张 →
//       fixed inset:0 的转场容器 / fixed bottom:0 的互动栏跟着重算 → 底部闪烁。
// 做法：进 /feed/:id 的导航确认瞬间记录当前视口高；转场期间给详情容器锁定该高度
//       （fixed + top:0 + 显式 height 时 bottom 被 over-constrained 忽略，高度不再随视口变）；
//       after-enter 解锁回全屏。返回方向对称处理离开的详情页（Flutter 恢复底栏同理）。
//       仅作用于 /feed/:id 导航，登录/商城/服务等路由不受影响。
const detailLock = { active: false, height: 0, timer: null }
const isFeedPath = (p) => /^\/feed\/\d+/.test(p)
let backFromDetail = false
function releaseLock() {
  detailLock.active = false
  clearTimeout(detailLock.timer)
}
router.beforeEach((to, from) => {
  backFromDetail = isFeedPath(from.path) && !isFeedPath(to.path)
  if (!isFeedPath(to.path)) return true
  // 3.5 点击锁：详情转场未完成前，再次 push /feed/:id 一律拦截
  //     （防快速连点产生多条 history、动画中切成另一篇文章）。
  //     ⚠️ 这里 transitionName 还是上一次的值（afterEach 才更新），方向判断交给 enter/leave 钩子。
  if (detailLock.active) return false
  detailLock.active = true
  detailLock.height = window.innerHeight
  // after-enter 万一被转场打断丢失，800ms 兜底解锁，点击锁不能死锁
  clearTimeout(detailLock.timer)
  detailLock.timer = setTimeout(releaseLock, 800)
  return true
})

// 入场结束和旧页移除是独立事件：两者完成前保留新页的固定定位。
// 不让详情提前回到列表之后的文档流，也不同时固定两页。
const leavingPages = new Set()
const enteringPages = new Map()
function finishEntries() {
  if (leavingPages.size) return
  for (const [el, finished] of enteringPages) {
    if (!finished) continue
    window.scrollTo(0, 0)
    el.classList.remove('page-enter-held')
    el.style.height = ''
    enteringPages.delete(el)
  }
}
function onBeforeEnter(el) {
  if (transitionName.value === 'slide-forward') {
    enteringPages.set(el, false)
    el.classList.add('page-enter-held')
    if (detailLock.active) el.style.height = detailLock.height + 'px'
  }
}
function onAfterEnter(el) {
  if (enteringPages.has(el)) {
    enteringPages.set(el, true)
    finishEntries()
  } else el.style.height = ''
  releaseLock()
}
function onEnterCancelled(el) {
  enteringPages.delete(el)
  el.classList.remove('page-enter-held')
  el.style.height = ''
  releaseLock()
}
function onBeforeLeave(el) {
  leavingPages.add(el)
  // 快速返回时，旧入场的固定定位不能遗留到下一次 keep-alive 激活。
  enteringPages.delete(el)
  el.classList.remove('page-enter-held')
  el.style.height = ''
  if (transitionName.value === 'slide-back' && backFromDetail) {
    el.style.height = window.innerHeight + 'px'
  }
}
function onAfterLeave(el) {
  leavingPages.delete(el)
  el.style.height = ''
  finishEntries()
  backFromDetail = false
}
function onLeaveCancelled(el) {
  leavingPages.delete(el)
  el.style.height = ''
  finishEntries()
}

// 清理任务仅属于本次成功导航；旧任务不得剥掉下一次转场的样式。
let transitionCleanup = null
router.beforeEach(() => { clearTimeout(transitionCleanup) })
router.afterEach((to, from, failure) => {
  if (failure) return
  clearTimeout(transitionCleanup)
  transitionCleanup = setTimeout(() => {
    const root = document.querySelector('.app-root')
    if (!root) return
    root.querySelectorAll('[class*="slide-forward-"],[class*="slide-back-"]').forEach((el) => {
      // 正在执行的 Vue 转场交给自己的完成/取消钩子，兜底只清理孤立残留。
      if (enteringPages.has(el) || leavingPages.has(el)) return
      const cleaned = String(el.className).replace(/ ?slide-(forward|back)-(enter|leave)-(from|active|to)/g, '').trim()
      if (cleaned !== el.className) el.className = cleaned
    })
  }, 700)
})
onUnmounted(() => clearTimeout(transitionCleanup))
// 嵌入 Flutter 时原生已有全局返回手势，H5 转场压短时长，避免叠成「两段滑」
const inApp = ref(bridge.isEmbed)

// 新 WebView 的首屏推入由 Flutter 负责；H5 不再补播。
// 对所有落地路由一致，且不依赖桥或全屏标识的注入时机。
// 同一 WebView 内的前进/返回仍由 router-view transition 处理。
const wvPushIn = ref(false)

// 底部 tab bar 已彻底移除：之前依赖 Flutter 桥注入（isEmbed）切换显示，但 Flutter 直接链接加载没注入桥也会显示。
// 既然 App 原生自带 tab，H5 这层完全多余，直接拿掉，省一道桥依赖。
const rootRef = ref(null)
const swipeToast = ref('')
let toastTimer = null
function showSwipeToast(msg) {
  swipeToast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (swipeToast.value = ''), 1600)
}
// 侧边滑动返回：左右边缘向内滑 → 返回上一页（H5 有历史走 router.back；
// H5 根页面调 popPage 返回 Flutter 原生上一级；Flutter 未实现时降级「再按一次退出程序」）
useSwipeBack(rootRef, {
  onToast: () => showSwipeToast('再按一次退出程序'),
  onExit: () => bridge.exit(),
})

// 切回前台时刷新界面语言：用户在系统设置里改了语言，切回 App 即生效，无需重启 App
// 语言同时驱动界面语言与内容地区，见 docs/语言与地区规则_Flutter对接.md
//
// 注：这里只管语言。根容器合成层/transform 的复位已统一收敛到 useSwipeBack 的
// resetGestureAndElement()（blur / pagehide / pageshow / resize / visibilitychange / 450ms 兜底全覆盖），
// 两处各清一套会互相打架，故此处不再重复处理。
function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  initLocale()
}
// 预取详情页 chunk：路由是懒加载的，点击时才下载 JS 会让转场「卡一下」——
// Vue 的 transition 会等新组件挂载才播 enter 动画，实测旧页会停在 leave-to 状态干等 chunk。
// 首屏空闲时提前把高频详情页拉下来，点击即可立即起转场。
// 与 router 里的动态 import 指向同一模块，Vite 复用同一个 chunk，不会重复打包。
function prefetchDetailChunks() {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500))
  idle(() => {
    import('./views/FeedDetailView.vue').catch(() => {})
    import('./views/ProductDetailView.vue').catch(() => {})
    // 公告列表/详情 chunk 预热（2026-09-08）：公告数据本身打包在 JS 里零网络拉取，
    // 但页面代码是懒加载 chunk，首次点击要现下载——发现页空闲时提前拉好，点公告零等待。
    import('./views/NoticesView.vue').catch(() => {})
    import('./views/NoticeDetailView.vue').catch(() => {})
  })
}

onMounted(() => {
  // 首屏立即按系统语言初始化（修复：从 Flutter「我的」等全新 WebView 入口进来时，
  // 没有 visibilitychange 事件触发，必须由首屏兜底初始化，否则页面语言停在默认中文，
  // 不跟随 App 系统语言切换。切前台刷新逻辑见 onVisibilityChange）。
  initLocale()
  document.addEventListener('visibilitychange', onVisibilityChange)
  prefetchDetailChunks()
})
onUnmounted(() => document.removeEventListener('visibilitychange', onVisibilityChange))
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  background: var(--bg, #f7f8fa);
}
.swipe-toast {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 14px;
  padding: 10px 18px;
  border-radius: 22px;
  z-index: 9999;
  white-space: nowrap;
}
.swipe-fade-enter-active,
.swipe-fade-leave-active {
  transition: opacity 0.2s ease;
}
.swipe-fade-enter-from,
.swipe-fade-leave-to {
  opacity: 0;
}
/* 底部 tab bar 已彻底移除，无需再预留底部空间 */
</style>

<style>
/* ============================================================
   页面转场：横向推进（iOS 默认 / 微信同款）
   三条硬约定，改之前先看完 useSwipeBack.js 顶部的注释：
   1) 绝不给 .app-root 写 transform。根容器一旦成为 containing block 并新建合成层，
      Android WebView 上会出现「页面看着正常、能滚动、但所有点击无效」——本文件只动页面级元素。
   2) 只让进出双方中的**一方**脱离文档流（fixed），另一方保持 static。
      两页同时 absolute 会让 .app-root 高度塌陷，列表滚动位置瞬间丢失。
   3) will-change 只挂在 -active 类上，动画结束由 Vue 摘掉，不长期占用合成层。
   ============================================================ */
.page-enter-held,
.slide-forward-enter-active,
.slide-back-leave-active {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg, #f7f8fa);
  /* 左侧一道阴影代替「旧页半透明」：半透明会露出底下的背景色，边缘发白像闪一下 */
  box-shadow: -6px 0 20px rgba(0, 0, 0, 0.12);
  /* 340ms（2026-09-07 坤哥反馈「傻快」）：从 280 放慢到 340，跟微信 0.35s 同档——
     有过程感的滑入比瞬间到位更优雅；曲线不变，只拉时长 */
  transition: transform 340ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}
.slide-forward-leave-active,
.slide-back-enter-active {
  transition: transform 340ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}
.slide-forward-enter-from {
  transform: translateX(100%);
}
/* 旧页退场 / 返回进场：不做 -18% 位移（2026-09-07 坤哥拍板去掉）——
   与 Flutter 其他页面行为统一：旧页纹丝不动，新页直接盖上 / 滑出。
   注意 leave-active/enter-active 仍声明 transition: transform 340ms，
   Vue 靠它的 computed duration 计算转场结束时机（无实际位移时走 340ms 超时兜底），
   这两行 CSS 别和 transition 一起删 */
.slide-back-leave-to {
  transform: translateX(100%);
}

/* ============================================================
   全屏 WebView 首屏推入（2026-09-11）
   真机从发现/精选点进详情时，详情由 Flutter 新开全屏 WebView 承载，
   对 H5 是全新页面 —— 全局 <transition> 首屏不播 enter 动画，
   「从右往左推」这段观感在 H5 侧原本完全缺失（真机表现：原地加载后直接出现）。
   这里给首屏补一段与 slide-forward 同曲线、同时长的推入，让「进详情」在
   任何环境下都是微信式右进左出。
   ⚠️ 触发条件由 script 判定（原生桥 + 本 WebView 首屏 + 非根 tab 路由），
      浏览器预览 / keep-alive 二次进入 / 根 tab 首屏都不带这个类。
   ============================================================ */
.app-root.wv-push-in > *:not(.swipe-toast) {
  /* 转场期间只此一页，用 fixed 脱离文档流：不产生横向溢出，也不影响 .app-root 自身 */
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg, #f7f8fa);
  /* 与 slide-forward 同一道左侧阴影（推入时像一页纸盖过来） */
  box-shadow: -6px 0 20px rgba(0, 0, 0, 0.12);
  animation: wvPushIn 340ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}
@keyframes wvPushIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .app-root.wv-push-in > *:not(.swipe-toast) { animation: none; }
}

/* 嵌入 Flutter：原生全局返回手势本身就会带着整个 WebView 横滑，
   H5 内部转场压到 260ms，观感上更像一个连贯动作，而不是两段滑 */
.embed-mode .slide-forward-enter-active,
.embed-mode .slide-back-leave-active,
.embed-mode .slide-forward-leave-active,
.embed-mode .slide-back-enter-active {
  transition-duration: 260ms;
}

/* 商品详情：500ms 渐缓推入，避免旧曲线前半程过快和 App 260ms 覆盖。 */
.app-root.product-transition .slide-forward-enter-active,
.app-root.product-transition .slide-forward-leave-active,
.app-root.product-transition .slide-back-enter-active,
.app-root.product-transition .slide-back-leave-active {
  transition-duration: 500ms;
  transition-timing-function: cubic-bezier(.22, .55, .3, 1);
}

/* 系统开启「减弱动画」：去掉位移，只留很短的淡入，避免眩晕 */
@media (prefers-reduced-motion: reduce) {
  .slide-forward-enter-active,
  .slide-back-leave-active,
  .slide-forward-leave-active,
  .slide-back-enter-active {
    transition: opacity 120ms ease;
  }
  .slide-forward-enter-from,
  .slide-back-enter-from {
    transform: none;
    opacity: 0;
  }
  .slide-forward-leave-to,
  .slide-back-leave-to {
    transform: none;
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-root.product-transition .slide-forward-enter-active,
  .app-root.product-transition .slide-forward-leave-active,
  .app-root.product-transition .slide-back-enter-active,
  .app-root.product-transition .slide-back-leave-active {
    transition-duration: 120ms;
    transition-timing-function: ease;
  }
}
</style>