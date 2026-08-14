<template>
  <div class="fcard" @click="go">
    <img class="fcard__cover" :src="item.cover" :alt="item.title" />
    <div class="fcard__title">{{ item.title }}</div>
    <div class="fcard__foot">
      <div class="author">
        <img class="avatar" :src="item.avatar || defaultAvatar" :alt="item.author" />
        <span class="name">{{ item.author }}</span>
      </div>
      <span class="like">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        <span class="like__num">{{ item.likes }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { defaultAvatar } from '../data/mock'

const props = defineProps({
  item: { type: Object, required: true },
})
const router = useRouter()

function go() {
  router.push('/feed/' + props.item.id)
}
</script>

<style scoped>
.fcard {
  background: transparent;
  border-radius: var(--radius);
  overflow: hidden;
}
.fcard__cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.fcard__title {
  padding: 10px 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.45;
  min-height: 42px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fcard__foot {
  padding: 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.name {
  font-size: 12px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.like {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--text-hint);
  flex: none;
}
.like__num {
  transform: translateY(0.5px);
}
</style>