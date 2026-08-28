<template>
  <div class="cnode" :class="{ 'cnode--nested': depth > 0 }" :style="indentStyle">
    <img class="cnode__avatar" :src="avatarUrl" :alt="node.author" />
    <div class="cnode__main">
      <div class="cnode__name">{{ node.author }}</div>
      <div class="cnode__text">{{ node.content }}</div>
      <div class="cnode__foot">
        <span class="cnode__time">{{ time }}</span>
        <span class="cnode__reply" @click="$emit('reply', node)">{{ t('feed.reply') }}</span>
        <span class="cnode__like pop" :class="{ liked: node.isLiked }" @click="toggleLike">
          <svg viewBox="0 0 24 24" width="14" height="14" :fill="node.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span>{{ node.likes }}</span>
        </span>
      </div>

      <div v-if="node.replies && node.replies.length" class="cnode__children">
        <CommentNode
          v-for="child in node.replies"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          @reply="$emit('reply', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '../i18n'
import { resolveAvatar } from '../utils/avatar'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})
defineEmits(['reply'])

const avatarUrl = computed(() => resolveAvatar(props.node.author, props.node.avatar))

// 缩进上限 4 级，避免无限嵌套时行宽失控；逻辑层级仍无上限
const indentStyle = computed(() => {
  if (props.depth <= 0) return null
  const step = Math.min(props.depth, 4)
  return { marginLeft: step * 12 + 'px' }
})

const time = computed(() => formatTime(props.node.time || props.node.createdAt))
function formatTime(ts) {
  if (!ts) return ''
  let d
  if (typeof ts === 'number') d = new Date(ts < 1e12 ? ts * 1000 : ts)
  else d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return t('feed.time.justNow')
  if (diff < 3600) return t('feed.time.minutesAgo', { n: Math.floor(diff / 60) })
  const pad = (n) => String(n).padStart(2, '0')
  if (d.toDateString() === new Date().toDateString())
    return pad(d.getHours()) + ':' + pad(d.getMinutes())
  return `${d.getMonth() + 1}-${pad(d.getDate())}`
}

function toggleLike() {
  props.node.isLiked = !props.node.isLiked
  props.node.likes += props.node.isLiked ? 1 : -1
}
</script>

<style scoped>
.cnode {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}
.cnode__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
  background: #eee;
}
.cnode__main {
  flex: 1 1 auto;
  min-width: 0;
}
.cnode__name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.cnode__text {
  font-size: 14px;
  color: #222;
  line-height: 1.5;
  margin: 2px 0 4px;
  word-break: break-word;
}
.cnode__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #999;
}
.cnode__reply {
  cursor: pointer;
}
.cnode__like {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  color: #999;
}
.cnode__like.liked {
  color: #ff4d4f;
}
.cnode--nested .cnode__avatar {
  width: 28px;
  height: 28px;
}
.cnode__children {
  margin-top: 2px;
  border-left: 2px solid #f0f0f0;
  padding-left: 2px;
}
</style>
