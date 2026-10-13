<template>
  <button type="button" class="topiccard press" :class="{ 'topiccard--on': active }" :aria-pressed="active">
    <!-- 2026-10-13 视觉升级：有真实封面时用话题下前 3 帖三联拼贴，替代纯色图标底 -->
    <div class="tc-cover" :class="{ 'tc-cover--collage': collage }">
      <template v-if="collage">
        <img v-for="(c, i) in covers.slice(0, 3)" :key="i" class="tc-img" :src="c" loading="lazy" alt="" />
        <span class="tc-cat">{{ category }}</span>
        <span class="tc-veil" aria-hidden="true"><TopicIcon :name="name" :size="22" :stroke="1.6" /></span>
      </template>
      <template v-else>
        <TopicIcon :name="name" :size="32" :stroke="1.6" /><span class="tc-cat">{{ category }}</span>
      </template>
    </div>
    <div class="tc-body"><div class="tc-title"><span>#</span> {{ name }}</div><p>{{ t(active ? 'discover.topicExit' : 'discover.topicExplore') }}</p>
      <div class="tc-meta"><span>{{ t('discover.topicCount', { n: count }) }}</span><span class="tc-arrow" aria-hidden="true">→</span></div>
    </div>
  </button>
</template>
<script setup>
import { computed } from 'vue'
import { t } from '../i18n'
import TopicIcon from './TopicIcon.vue'
const props = defineProps({ name: String, count: Number, active: Boolean, emoji: String, category: String, covers: { type: Array, default: () => [] } })
const collage = computed(() => Array.isArray(props.covers) && props.covers.filter(Boolean).length >= 2)
</script>
<style scoped>
.topiccard { width: 100%; padding: 0; border: 0; border-radius: 12px; overflow: hidden; background: #fff; text-align: left; color: var(--text); box-shadow: none; }
.tc-cover { height: 98px; position: relative; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-ink); }
.tc-cover--collage { display: flex; gap: 2px; background: var(--brand-soft); }
.tc-img { flex: 1; min-width: 0; height: 98px; object-fit: cover; display: block; }
.tc-veil { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; background: rgba(23, 18, 46, .38); }
.tc-emoji { font-size: 42px; line-height: 1; }
.tc-cat { position: absolute; top: 7px; right: 7px; font-size: 10px; padding: 3px 7px; border-radius: 20px; background: rgba(255,255,255,.9); color: #65546a; }
.tc-body { padding: 10px; }
.tc-title { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-title > span { color: var(--brand-ink); }
p { margin: 5px 0 8px; font-size: 11px; line-height: 1.5; color: #7e879b; }
.tc-meta { display: flex; align-items: center; justify-content: space-between; gap: 4px; color: #818ba0; font-size: 11px; }
.tc-arrow { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--brand-ink); background: var(--brand-soft); font-size: 20px; }
.topiccard--on { box-shadow: inset 0 0 0 1px var(--brand); background: var(--brand-soft); }
.topiccard--on .tc-title { color: var(--brand); }
.topiccard { border-radius: var(--radius-lg); box-shadow: var(--card-shadow); }
.tc-body p, .tc-meta { color: var(--text-sub); }.tc-cat { color: var(--text-sub); }
</style>
