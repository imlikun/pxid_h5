<template>
  <button type="button" class="topiccard press" :class="{ 'topiccard--on': active }" :aria-pressed="active">
    <div class="tc-cover"><IconSvg :name="topicIcon" :size="32" :stroke="1.6" /><span class="tc-cat">{{ category }}</span></div>
    <div class="tc-body"><div class="tc-title"><span>#</span> {{ name }}</div><p>{{ t(active ? 'discover.topicExit' : 'discover.topicExplore') }}</p>
      <div class="tc-meta"><span>{{ t('discover.topicCount', { n: count }) }}</span><span class="tc-arrow" aria-hidden="true">→</span></div>
    </div>
  </button>
</template>
<script setup>
import { t } from '../i18n'
import { computed } from 'vue'
import IconSvg from './IconSvg.vue'
import { DISCUSSION_TOPICS } from '../utils/discussion'
const props = defineProps({ name: String, count: Number, active: Boolean, emoji: String, category: String })
const topicIcon = computed(() => DISCUSSION_TOPICS.find(topic => topic.name === props.name)?.icon || 'chat')
</script>
<style scoped>
.topiccard { width: 100%; padding: 0; border: 0; border-radius: 12px; overflow: hidden; background: #fff; text-align: left; color: var(--text); box-shadow: none; }
.tc-cover { height: 98px; position: relative; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand-ink); }
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
