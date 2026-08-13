<template>
  <div class="tabbar">
    <div
      v-for="t in tabs"
      :key="t.key"
      class="tab"
      :class="{ active: current === t.key }"
      @click="onClick(t)"
    >
      <span class="ico" v-html="t.icon"></span>
      <span class="lbl">{{ t.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bridge } from '../bridge'

const route = useRoute()
const router = useRouter()

const icons = {
  discover: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  featured: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
  purchase: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  service: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
}

const tabs = [
  { key: 'discover', label: '发现', route: '/discover', icon: icons.discover },
  { key: 'featured', label: '精选', route: '/featured', icon: icons.featured },
  { key: 'purchase', label: '购车', route: '/purchase', icon: icons.purchase },
  { key: 'service', label: '服务', route: '/service', icon: icons.service },
  { key: 'profile', label: '我的', route: '/profile', icon: icons.profile },
]

const current = computed(() => route.meta.tab || route.name)

function onClick(t) {
  if (t.key === 'purchase' || t.key === 'profile') {
    bridge.call('openNative', { target: `tab.${t.key}` })
    return
  }
  router.push(t.route)
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 420px;
  height: calc(var(--tab-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  z-index: 50;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #999999;
}
.tab.active {
  color: var(--brand);
}
.ico {
  display: flex;
  align-items: center;
  justify-content: center;
}
.lbl {
  font-size: 11px;
}
</style>