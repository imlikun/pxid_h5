<template>
  <div class="detail" v-if="item">
    <!-- 顶部 -->
    <div class="topbar">
      <span class="back" @click="router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </span>
      <span class="t">{{ isActivity ? '活动详情' : '内容详情' }}</span>
      <span class="share" @click="onShare">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
      </span>
    </div>

    <!-- 大图 -->
    <img class="hero" :src="item.cover" :alt="item.title" />

    <!-- 内容 -->
    <div class="body">
      <h1 class="title">{{ item.title }}</h1>

      <div class="author-row">
        <template v-if="!isActivity">
          <img class="avatar" :src="item.avatar" :alt="item.author" />
          <span class="name">{{ item.author }}</span>
        </template>
        <span v-else class="name">{{ item.author || 'PXID 官方' }}</span>
        <span class="time">{{ item.time }}</span>
      </div>

      <p class="content">{{ item.content }}</p>
    </div>

    <!-- 底部操作条 -->
    <div class="actions">
      <button class="act" :class="{ liked }" @click="onLike">
        <svg viewBox="0 0 24 24" width="20" height="20" :fill="liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span>{{ likeCount }}</span>
      </button>
      <button class="act" @click="onComment">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        <span>评论</span>
      </button>
      <button class="act" @click="onShare">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        <span>分享</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { feedItems, activities } from '../data/mock'

const route = useRoute()
const router = useRouter()
const liked = ref(false)
const likeCount = ref(0)

// 兼容两种来源：/feed/:id 内容、/activity/:id 活动
const isActivity = computed(() => route.path.startsWith('/activity'))
const item = computed(() => {
  const id = Number(route.params.id)
  const pool = isActivity.value ? activities : feedItems
  return pool.find((i) => i.id === id) || null
})

likeCount.value = item.value ? item.value.likes : 0

function onLike() {
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
}
function onComment() {
  console.log('comment tap')
}
function onShare() {
  console.log('share tap')
}
</script>

<style scoped>
.detail {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
.topbar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 10;
}
.back { display: flex; color: #333; }
.t { font-size: 17px; font-weight: 600; color: #333; }
.share { display: flex; color: #333; }

.hero {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}

.body { padding: 16px 16px 8px; }
.title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.45;
}
.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.name { font-size: 14px; font-weight: 600; color: #333; }
.time { margin-left: auto; font-size: 13px; color: #999; }
.content {
  margin-top: 16px;
  font-size: 16px;
  color: #444;
  line-height: 1.8;
}

.actions {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}
.act {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #666;
}
.act.liked { color: #e53935; }
</style>