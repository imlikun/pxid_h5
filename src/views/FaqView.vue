<template>
  <div class="page">
    <div class="nav">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </span>
      <span class="title">常见问题</span>
    </div>
    <div class="body">
      <p>常见问题骨架占位</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.page { min-height: 100vh; background: #efefef; padding-top: env(safe-area-inset-top); padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom)); }
.nav {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #ffffff;
}
.back { position: absolute; left: 12px; display: flex; color: #333333; }
.title { font-size: 17px; font-weight: 600; color: #333333; }
.body { padding: 24px; text-align: center; color: #999999; }
</style>
