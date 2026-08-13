<template>
  <div class="message">
    <!-- 顶部导航 -->
    <div class="topbar">
      <div class="left">
        <span class="back" @click="goBack">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </span>
        <span class="title">消息</span>
      </div>
      <div class="right">
        <span class="act">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </span>
        <span class="act">＋</span>
      </div>
    </div>

    <!-- 消息分类 -->
    <div class="categories">
      <div v-for="c in messageCategories" :key="c.key" class="cat" @click="onCat(c)">
        <div class="cat__icon">
          <svg v-if="c.icon === 'bell'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <svg v-else-if="c.icon === 'headset'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          <svg v-else-if="c.icon === 'car'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="cat__label">{{ c.label }}</div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="list">
      <div v-for="m in messages" :key="m.id" class="item" @click="onMsg(m)">
        <div class="avatar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#bbb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
        <div class="body">
          <div class="row">
            <span class="sender">{{ m.sender }}</span>
            <span class="time">{{ m.time }}</span>
          </div>
          <div class="summary">{{ m.summary }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { messageCategories, messages } from '../data/mock'

const router = useRouter()

function goBack() {
  router.back()
}
function onCat(c) {
  console.log('category tap:', c.key)
}
function onMsg(m) {
  console.log('message tap:', m.id)
}
</script>

<style scoped>
.message {
  min-height: 100vh;
  background: #ffffff;
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
}
.left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back {
  display: flex;
  align-items: center;
  color: #000000;
}
.title {
  font-size: 18px;
  font-weight: 700;
  color: #000000;
}
.right {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #000000;
}
.act {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 22px;
  line-height: 1;
}
.categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 10px 12px 20px;
}
.cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.cat__icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333333;
}
.cat__label {
  font-size: 13px;
  color: #333333;
}
.list {
  padding: 0 12px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.body {
  flex: 1;
  min-width: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sender {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
}
.time {
  font-size: 13px;
  color: #999999;
}
.summary {
  font-size: 14px;
  color: #666666;
  margin-top: 4px;
}
</style>