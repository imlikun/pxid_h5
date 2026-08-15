<template>
  <div class="app-root" :class="{ embed: isEmbed }">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 仅独立预览时显示底部导航：URL 带 ?standalone=1；嵌入原生 App 时由 Flutter 提供原生 tab -->
    <DemoTabBar v-if="showTabBar" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DemoTabBar from './components/DemoTabBar.vue'
import { bridge } from './bridge'

const isEmbed = bridge.isEmbed
const route = useRoute()
const showTabBar = computed(() => !isEmbed && !route.meta.hideTabBar)
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
