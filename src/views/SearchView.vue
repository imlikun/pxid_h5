<template>
  <div class="page">
    <TopBar interactive>
      <template #title>
        <input
          class="sinput"
          v-model="kw"
          :placeholder="t('search.placeholder')"
          @keyup.enter="doSearchEnter"
          @compositionstart="isComposing = true"
          @compositionend="onCompositionEnd"
        />
      </template>
      <template #right>
        <span class="go" @click="doSearch">{{ t('search.go') }}</span>
      </template>
    </TopBar>

    <div class="body">
      <div v-if="!q" class="hint">{{ t('search.hint') }}</div>
      <div v-else-if="results.length === 0" class="empty">{{ t('search.empty', { q: q }) }}</div>
      <div
        v-for="r in results"
        :key="r.key"
        class="item"
        @click="onItem(r)"
      >
        <img v-if="r.cover" class="ic" :src="r.cover" :alt="r.title" />
        <div class="meta">
          <div class="t">{{ r.title }}</div>
          <div class="sub">{{ r.sub }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { feedItems, activities, plazaShowcase } from '../data/mock'
import { t } from '../i18n'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
const route = useRoute()
const q = ref(route.query.q || '')
const kw = ref(route.query.q || '')
const isComposing = ref(false)
function doSearchEnter() {
  if (isComposing.value) return
  doSearch()
}
function onCompositionEnd(e) {
  isComposing.value = false
}
const doSearch = () => { q.value = kw.value.trim() }

const results = computed(() => {
  const key = (q.value || '').toLowerCase()
  if (!key) return []
  const list = []
  feedItems.forEach((f) => {
    const title = (f.title || f.name || '').toLowerCase()
    if (title.includes(key)) list.push({ key: 'feed-' + f.id, type: 'feed', id: f.id, title: f.title || f.name, sub: t('search.sub.feed'), cover: f.cover })
  })
  activities.forEach((a) => {
    if (a.title.toLowerCase().includes(key)) list.push({ key: 'act-' + a.id, type: 'activity', id: a.id, title: a.title, sub: t('search.sub.activity') + a.date, cover: import.meta.env.BASE_URL + a.cover })
  })
  plazaShowcase.forEach((p) => {
    if (p.name.toLowerCase().includes(key)) list.push({ key: 'veh-' + p.id, type: 'vehicle', id: p.id, title: p.name, sub: t('search.sub.vehicle'), cover: import.meta.env.BASE_URL + p.cover })
  })
  return list
})

function onItem(r) {
  if (r.type === 'vehicle') { router.push('/vehicle/' + r.id); return }
  router.push('/' + (r.type === 'feed' ? 'feed' : 'activity') + '/' + r.id)
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg); }
.sinput { width: 100%; height: 36px; border: 1px solid var(--line); border-radius: 18px; padding: 0 14px; font-size: 14px; color: var(--text); background: var(--bg); outline: none; }
.go { flex: none; font-size: 14px; color: var(--brand); font-weight: 600; }
.body { padding: 12px; }
.hint, .empty { text-align: center; color: var(--text-hint); font-size: 13px; padding: 60px 0; }
.item { display: flex; align-items: center; gap: 12px; background: var(--card); border-radius: var(--radius); padding: 12px; margin-bottom: 10px; }
.ic { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; flex: none; background: var(--bg); }
.meta { flex: 1; min-width: 0; }
.t { font-size: 14px; color: var(--text); line-height: 1.4; }
.sub { margin-top: 4px; font-size: 12px; color: var(--text-hint); }
</style>
