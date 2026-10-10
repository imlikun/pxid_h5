<template>
  <div class="plaza-hub">
    <section>
      <header class="hub-heading"><h2>{{ t('discover.plaza.models') }}</h2><button type="button" :aria-expanded="allModels" @click="allModels = !allModels">{{ t(allModels ? 'discover.collapse' : 'discover.allModels') }} <span>›</span></button></header>
      <div class="model-card">
        <button type="button" class="model-main" @click="$emit('model', primary)">
          <img v-if="modelCover" :src="modelCover" :alt="primary" @error="coverFailed = true" />
          <span v-else class="model-code" aria-hidden="true">{{ primary }}</span>
          <span class="model-copy"><strong>{{ t('discover.modelDiscussion', { model: primary }) }}</strong><span>{{ t('discover.plaza.modelHint') }}</span><em>{{ t('discover.viewDiscussion') }} →</em></span>
        </button>
        <div class="model-links" :class="{ 'model-links--all': allModels }"><button v-for="model in visibleModels" :key="model" type="button" @click="$emit('model', model)">{{ model }}</button><button v-if="!allModels" type="button" class="more-models" @click="allModels = true">{{ t('discover.more') }} ›</button></div>
      </div>
    </section>
    <section>
      <header class="hub-heading"><h2>{{ t('discover.plaza.topics') }}</h2><button type="button" :aria-expanded="allTopics" @click="allTopics = !allTopics">{{ t(allTopics ? 'discover.collapse' : 'discover.moreTopics') }} <span>›</span></button></header>
      <div class="topic-grid"><button v-for="topic in shownTopics" :key="topic.name" type="button" class="topic-entry" @click="$emit('topic', topic.name)"><span class="topic-icon"><IconSvg :name="topic.icon || 'chat'" :size="21" :stroke="1.7" /></span><span><strong>{{ topicLabel(topic) }}</strong><small>{{ topic.count > 0 ? t('discover.topicCount', { n: topic.count }) : topic.key ? t(`discover.topics.${topic.key}Hint`) : t('discover.viewDiscussion') }}</small></span></button></div>
      <p v-if="topicsError" class="hub-status">{{ t('discover.topicsUnavailable') }} <button type="button" @click="$emit('retry-topics')">{{ t('discover.dynamic.retry') }}</button></p>
    </section>
    <section>
      <header class="hub-heading"><h2>{{ t('discover.plaza.activities') }}</h2><button type="button" @click="$emit('activities')">{{ t('discover.more') }} <span>›</span></button></header>
      <div class="activity-list"><button v-for="activity in currentActivities" :key="activity.id" type="button" class="hub-activity" @click="$emit('activity', activity)"><img v-if="activity.cover" :src="activity.cover" :alt="activity.title" loading="lazy" /><span class="event-copy"><span class="event-state">{{ t(activityPhase(activity) === 'upcoming' ? 'discover.activityUpcoming' : 'discover.activityLive') }}</span><strong>{{ activity.title }}</strong><small>{{ [activity.startDate || activity.start_date, activity.location].filter(Boolean).join(' · ') }}</small></span><span class="event-arrow">›</span></button></div>
      <p v-if="!loadingActivities && !currentActivities.length" class="hub-status">{{ t(activitiesError ? 'discover.activitiesUnavailable' : 'discover.noActiveActivities') }}</p>
      <p v-if="loadingActivities" class="hub-status" role="status">{{ t('discover.loadingMore') }}</p>
      <button type="button" class="activity-history" @click="$emit('activities')">{{ t('discover.activityHistory') }}<span>›</span></button>
    </section>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { CAR_MODEL_LABELS } from '../data/carModels'
import { DISCUSSION_TOPICS } from '../utils/discussion'
import { activityPhase } from '../utils/activityPhase'
import { t } from '../i18n'
import IconSvg from './IconSvg.vue'
const props = defineProps({ mine: String, topics: { type: Array, default: () => [] }, topicsError: Boolean, activities: { type: Array, default: () => [] }, loadingActivities: Boolean, activitiesError: Boolean })
defineEmits(['model', 'topic', 'activities', 'activity', 'retry-topics'])
const allModels = ref(false), allTopics = ref(false), coverFailed = ref(false)
const primary = computed(() => props.mine || 'P2')
const covers = { P2: 'vehicles/p2.jpg', P4: 'vehicles/p4.jpg', P5: 'vehicles/p5.jpg', P6: 'vehicles/p6.jpg', P7: 'vehicles/p7.jpg', P8: 'vehicles/p8.jpg', P9: 'vehicles/p9.jpg', F1: 'vehicles/f1.jpg', F2: 'vehicles/f2.jpg' }
const modelCover = computed(() => !coverFailed.value && covers[primary.value] ? import.meta.env.BASE_URL + covers[primary.value] : '')
watch(primary, () => { coverFailed.value = false })
const visibleModels = computed(() => CAR_MODEL_LABELS.filter(x => x !== primary.value).slice(0, allModels.value ? Infinity : 3))
const topicCatalog = computed(() => [
  ...DISCUSSION_TOPICS.map(topic => ({ ...topic, count: props.topics.find(x => x.name === topic.name)?.count })),
  ...props.topics.filter(topic => !DISCUSSION_TOPICS.some(x => x.name === topic.name)),
])
const shownTopics = computed(() => topicCatalog.value.slice(0, allTopics.value ? Infinity : 4))
const currentActivities = computed(() => props.activities.filter(a => ['upcoming', 'live'].includes(activityPhase(a))).slice(0, 2))
function topicLabel(topic) { return topic.key ? t(`discover.topics.${topic.key}`) : topic.name }
</script>
<style scoped>
.plaza-hub { container-type: inline-size; padding: 0 16px 24px; max-width: 1120px; margin: 0 auto; }.plaza-hub section + section { margin-top: 24px; }
.hub-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; margin-bottom: 6px; }.hub-heading h2 { margin: 0; color: var(--text); font-size: 17px; font-weight: 700; }.hub-heading button { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; min-height: 40px; padding: 0; font-size: 12px; color: var(--text-hint); }.hub-heading button span { font-size: 20px; }
.model-card { background: white; border-radius: 16px; overflow: hidden; }.model-main { display: flex; align-items: center; gap: 16px; padding: 16px; width: 100%; text-align: left; }.model-main img, .model-code { flex: 0 0 auto; width: 76px; height: 82px; object-fit: contain; border-radius: 10px; background: #f8f9fb; }.model-code { display: grid; place-items: center; font-size: 25px; font-weight: 700; color: var(--brand); }.model-copy { min-width: 0; display: flex; flex-direction: column; gap: 5px; }.model-copy strong { font-size: 17px; font-weight: 700; }.model-copy > span { color: var(--text-hint); font-size: 12px; line-height: 1.6; }.model-copy em { font-size: 12px; font-style: normal; color: var(--brand); margin-top: 4px; }
.model-links { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid #f0f2f5; padding: 4px 8px; }.model-links button { min-height: 44px; font-size: 13px; color: var(--text-sub); }.model-links .more-models { font-size: 12px; }.model-links--all { row-gap: 4px; padding: 8px; }
.topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }.topic-entry { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 80px; padding: 12px; text-align: left; background: white; border-radius: 12px; }.topic-icon { display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px; color: var(--brand); background: var(--brand-soft); border-radius: 10px; }.topic-entry > span:last-child { min-width: 0; }.topic-entry strong { font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }.topic-entry small { display: block; color: var(--text-hint); font-size: 11px; margin-top: 5px; line-height: 1.5; }
.activity-list { display: flex; flex-direction: column; gap: 10px; }.hub-activity { display: flex; align-items: center; gap: 12px; width: 100%; background: white; border-radius: 12px; padding: 12px; text-align: left; }.hub-activity img { flex: 0 0 auto; width: 68px; height: 78px; object-fit: cover; border-radius: 8px; }.event-copy { min-width: 0; flex: 1; }.event-copy strong { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; font-weight: 500; line-height: 1.5; margin: 5px 0; }.event-state { display: inline-block; color: var(--brand); background: var(--brand-soft); border-radius: 4px; font-size: 10px; padding: 2px 6px; }.event-copy small { font-size: 11px; color: var(--text-hint); overflow-wrap: anywhere; }.event-arrow { color: var(--text-hint); font-size: 22px; }.activity-history { display: flex; align-items: center; justify-content: space-between; min-height: 44px; width: 100%; padding: 0 2px; margin-top: 10px; font-size: 13px; color: var(--text-sub); }.activity-history span { font-size: 20px; }.hub-status { color: var(--text-hint); font-size: 12px; line-height: 1.7; margin: 12px 0; }.hub-status button { color: var(--brand); }
button:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
.hub-heading button { min-height: 44px; color: var(--text-sub); }
.model-card, .topic-entry, .hub-activity { border-radius: var(--radius-lg); box-shadow: var(--card-shadow); background: var(--card); }
.topic-entry strong { font-size: 14px; line-height: 1.5; }.topic-entry small, .event-copy small, .model-copy > span, .hub-status { font-size: 12px; color: var(--text-sub); }
.model-copy em, .event-state { color: var(--brand-ink); }
.topic-icon { color: var(--brand-ink); }
.model-main:active, .topic-entry:active, .hub-activity:active { background: var(--brand-soft); }
@media (min-width: 760px) {
  .plaza-hub { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; }
  .plaza-hub section + section { margin-top: 0; }.plaza-hub section { min-width: 0; }.plaza-hub section:last-child { grid-column: 1 / -1; }
  .activity-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
