<template>
  <div v-if="loading || finished" class="feed-state" role="status" aria-live="polite" :aria-busy="loading">
    <div v-if="loading" class="feed-state__dots" aria-hidden="true"><i></i><i></i><i></i></div>
    <p>{{ t(loading ? 'discover.loadingStories' : 'discover.endStories') }}</p>
    <span>{{ t('discover.moreStories') }}</span>
  </div>
</template>
<script setup>
import { t } from '../i18n'
defineProps({ loading: Boolean, finished: Boolean })
</script>
<style scoped>
.feed-state { margin: 20px 16px 8px; padding: 18px 12px; border-radius: 16px; text-align: center; color: #68758e; background: #edf4ff; }
p { margin: 8px 0 4px; font-size: 12px; line-height: 1.5; color: #354665; }
span { font-size: 11px; color: #8591a4; }
.feed-state__dots { display: flex; justify-content: center; gap: 6px; height: 10px; }
i { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); animation: feed-dot 1s ease-in-out infinite; }
i:nth-child(2) { animation-delay: .15s; } i:nth-child(3) { animation-delay: .3s; }
@keyframes feed-dot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@media(prefers-reduced-motion: reduce) { i { animation: none; } }
</style>
