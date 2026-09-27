<template>
  <button type="button" class="topiccard press" :class="{ 'topiccard--on': active }" :aria-pressed="active">
    <div class="tc-cover"><span class="tc-emoji" aria-hidden="true">{{ emoji }}</span><span class="tc-cat">{{ category }}</span></div>
    <div class="tc-body"><div class="tc-title"><span>#</span> {{ name }}</div><p>{{ t(active ? 'discover.topicExit' : 'discover.topicExplore') }}</p>
      <div class="tc-meta"><span>{{ t('discover.topicCount', { n: count }) }}</span><span class="tc-arrow" aria-hidden="true">→</span></div>
    </div>
  </button>
</template>
<script setup>
import { t } from '../i18n'
defineProps({ name: String, count: Number, active: Boolean, emoji: String, category: String })
</script>
<style scoped>
.topiccard { width: 100%; padding: 5px; border: 1px solid #edf0f5; border-radius: 14px; overflow: hidden; background: #fff; text-align: left; color: var(--text); box-shadow: 0 2px 6px rgba(30,60,100,.04); }
.tc-cover { height: 98px; border-radius: 10px; position: relative; display: grid; place-items: center; background: linear-gradient(135deg,var(--tc-cover-from,#ffe8f0),var(--tc-cover-to,#ef699a)); }
.tc-emoji { font-size: 42px; line-height: 1; }
.tc-cat { position: absolute; top: 7px; right: 7px; font-size: 10px; padding: 3px 7px; border-radius: 20px; background: rgba(255,255,255,.9); color: #65546a; }
.tc-body { padding: 10px 6px 5px; }
.tc-title { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-title > span { color: var(--tc-color,#e9407a); }
p { margin: 5px 0 8px; font-size: 11px; line-height: 1.5; color: #7e879b; }
.tc-meta { display: flex; align-items: center; justify-content: space-between; gap: 4px; color: #818ba0; font-size: 11px; }
.tc-arrow { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--tc-color,#e9407a); font-size: 20px; }
.topiccard--on { border-color: var(--brand); background: var(--brand-soft); }
.topiccard--on .tc-title { color: var(--brand); }
</style>
