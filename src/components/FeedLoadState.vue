<template>
  <div class="feed-state" role="status" aria-live="polite" :aria-busy="loading">
    <template v-if="loading">
      <div class="feed-state__dots" aria-hidden="true"><i></i><i></i><i></i></div>
      <p>{{ t('discover.loadingStories') }}</p>
    </template>
    <template v-else-if="finished">
      <p>{{ t('discover.endStories') }}</p>
    </template>
  </div>
</template>
<script setup>
import { t } from '../i18n'
defineProps({ loading: Boolean, finished: Boolean })
</script>
<style scoped>
.feed-state { margin: 12px 16px 0; min-height: 68px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #68758e; }
p { margin: 5px 0 0; font-size: 12px; line-height: 1.5; color: #68758e; }
.feed-state__dots { display: flex; justify-content: center; gap: 6px; height: 10px; }
i { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); animation: feed-dot 1s ease-in-out infinite; }
i:nth-child(2) { animation-delay: .15s; } i:nth-child(3) { animation-delay: .3s; }
@keyframes feed-dot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@media(prefers-reduced-motion: reduce) { i { animation: none; } }
</style>
