<template>
  <div class="app-root" ref="rootRef">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部 tab bar 已彻底移除——浏览器和 App 内都不再显示，由 App 原生 tab 接管 -->
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSwipeBack } from './composables/useSwipeBack'

// 底部 tab bar 已彻底移除：之前依赖 Flutter 桥注入（isEmbed）切换显示，但 Flutter 直接链接加载没注入桥也会显示。
// 既然 App 原生自带 tab，H5 这层完全多余，直接拿掉，省一道桥依赖。
const rootRef = ref(null)
// 侧边滑动返回：左右边缘向内滑 → 返回上一页（发现/精选等 H5 内部页面）
useSwipeBack(rootRef)
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  will-change: transform;
  background: var(--bg, #f7f8fa);
}
/* 底部 tab bar 已彻底移除，无需再预留底部空间 */
</style>