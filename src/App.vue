<template>
  <div class="app-root" :class="{ 'embed-mode': inApp }" ref="rootRef">
    <router-view v-slot="{ Component }">
      <transition :name="transitionName">
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
// 页面转场方向（forward / back / 无动画），见 usePageTransition.js
setupPageTransition(router)
// 嵌入 Flutter 时原生已有全局返回手势，H5 转场压短时长，避免叠成「两段滑」
const inApp = ref(bridge.isEmbed)

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
.slide-forward-enter-active,
.slide-back-leave-active {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg, #f7f8fa);
  transition: transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}
.slide-forward-leave-active,
.slide-back-enter-active {
  transition: transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 300ms ease;
  will-change: transform, opacity;
}
.slide-forward-enter-from {
  transform: translateX(100%);
}
.slide-forward-leave-to {
  transform: translateX(-22%);
  opacity: 0.7;
}
.slide-back-enter-from {
  transform: translateX(-22%);
  opacity: 0.7;
}
.slide-back-leave-to {
  transform: translateX(100%);
}

/* 嵌入 Flutter：原生全局返回手势本身就会带着整个 WebView 横滑，
   H5 内部转场压到 220ms，观感上更像一个连贯动作，而不是两段滑 */
.embed-mode .slide-forward-enter-active,
.embed-mode .slide-back-leave-active,
.embed-mode .slide-forward-leave-active,
.embed-mode .slide-back-enter-active {
  transition-duration: 220ms;
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
</style>