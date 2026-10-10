<template>
  <button type="button" class="activity-card" @click="$emit('select', activity)">
    <img v-if="activity.cover && !coverFailed" class="activity-cover" :src="activity.cover" alt="" loading="lazy" @error="coverFailed = true" />
    <span v-else class="activity-cover activity-cover--empty" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" /></svg>
    </span>
    <span class="activity-copy">
      <span v-if="phase !== 'undated'" class="activity-state" :class="{ 'activity-state--past': phase === 'past' }">{{ t(phase === 'past' ? 'activity.past' : phase === 'upcoming' ? 'discover.activityUpcoming' : 'discover.activityLive') }}</span>
      <strong class="activity-title">{{ activity.title }}</strong>
      <span v-if="metadata" class="activity-meta">{{ metadata }}</span>
      <span v-if="showSignup && signupText" class="activity-meta activity-signup">{{ signupText }}</span>
    </span>
    <span class="activity-arrow" aria-hidden="true">›</span>
  </button>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { activityPhase } from '../utils/activityPhase'

const props = defineProps({ activity: { type: Object, required: true }, showSignup: Boolean })
defineEmits(['select'])
const coverFailed = ref(false)
watch(() => props.activity.cover, () => { coverFailed.value = false })
const phase = computed(() => activityPhase(props.activity))
const metadata = computed(() => {
  const a = props.activity
  const date = value => String(value || '').replace(/^(\d{4}-\d{2}-\d{2}).*$/, '$1')
  const start = date(a.startDate || a.start_date), end = date(a.endDate || a.end_date)
  const range = start && end && start !== end ? `${start} ~ ${end}` : start || end
  return [range, a.location].filter(Boolean).join(' · ')
})
const signupText = computed(() => {
  const count = Number(props.activity.signupCount || 0), quota = Number(props.activity.quota || 0)
  if (quota > 0) return t('activity.signupQuota', { n: count, total: quota })
  return count > 0 ? t('activity.signupCount', { n: count }) : ''
})
</script>

<style scoped>
.activity-card { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; padding: 12px; text-align: left; background: var(--card); border-radius: var(--radius-lg); box-shadow: var(--card-shadow); }
.activity-cover { flex: 0 0 auto; width: 68px; height: 78px; object-fit: cover; border-radius: 8px; }
.activity-cover--empty { display: grid; place-items: center; color: var(--brand-ink); background: var(--brand-soft); }
.activity-copy { flex: 1; min-width: 0; }
.activity-state { display: inline-block; padding: 2px 6px; font-size: 10px; line-height: 16px; color: var(--brand-ink); background: var(--brand-soft); border-radius: 4px; }
.activity-state--past { color: var(--text-sub); background: var(--bg); }
.activity-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; margin: 5px 0; font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--text); }
.activity-meta { display: block; font-size: 12px; line-height: 1.6; color: var(--text-sub); overflow-wrap: anywhere; }
.activity-signup { margin-top: 4px; }
.activity-arrow { flex: 0 0 auto; color: var(--text-hint); font-size: 22px; line-height: 24px; }
.activity-card:active { background: var(--brand-soft); }
.activity-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
</style>
