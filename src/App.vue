<template>
  <div class="app-root" ref="rootRef">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部 tab bar 已彻底移除——浏览器和 App 内都不再显示，由 App 原生 tab 接管 -->
    <transition name="swipe-fade">
      <div v-if="swipeToast" class="swipe-toast">{{ swipeToast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSwipeBack } from './composables/useSwipeBack'
import { bridge } from './bridge'

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
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  will-change: transform;
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