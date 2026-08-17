<template>
  <div class="app-root" :class="{ embed: isEmbed }">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 浏览器直接打开（含线上预览）显示底部导航；Flutter 注入真实桥后自动隐藏（原生 tab 接管） -->
    <DemoTabBar v-if="showTabBar" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DemoTabBar from './components/DemoTabBar.vue'
import { bridge } from './bridge'

// 是否嵌入原生：仅 Flutter 注入真实桥（isNative===true）时为嵌入模式。
// 用 ref 响应式判断——Flutter 在 WebView 加载 H5 后注入桥，启动后可能才变为嵌入。
const isEmbed = ref(bridge.isEmbed)
const route = useRoute()
const showTabBar = computed(() => !isEmbed.value && !route.meta.hideTabBar)

onMounted(() => {
  // Flutter 注入真实桥（isNative 置 true）后，H5 立即切换为嵌入模式（隐藏 demo tab）
  const t = setInterval(() => {
    const cur = bridge.isEmbed
    if (cur !== isEmbed.value) {
      isEmbed.value = cur
      if (cur) clearInterval(t)
    }
  }, 300)
  // 兜底：30s 后停止轮询
  setTimeout(() => clearInterval(t), 30000)
})
</script>

<style scoped>
.app-root {
  min-height: 100vh;
}
/* 仅独立预览需要给底部 tabbar 留出空间；嵌入时不留 */
.app-root:not(.embed) {
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
</style>
